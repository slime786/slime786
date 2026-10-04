-- Slime's Collectables checkout hardening
-- Adds server-side capture state protection, conservative payment review handling,
-- and a short-lived checkout rate-limit store.

alter table public.collectables_orders
  add column if not exists capture_started_at timestamptz;

alter table public.collectables_orders
  drop constraint if exists collectables_orders_status_check;

alter table public.collectables_orders
  add constraint collectables_orders_status_check
  check (status in (
    'reserved','paypal_created','capturing','review',
    'paid','cancelled','failed','expired'
  ));

create table if not exists public.collectables_checkout_rate_limits (
  client_key text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now()
);

alter table public.collectables_checkout_rate_limits enable row level security;
revoke all on public.collectables_checkout_rate_limits from public, anon, authenticated;
grant all on public.collectables_checkout_rate_limits to service_role;

create table if not exists public.collectables_paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  paypal_order_id text,
  outcome text not null default 'received',
  processed_at timestamptz not null default now()
);

alter table public.collectables_paypal_webhook_events enable row level security;
revoke all on public.collectables_paypal_webhook_events from public, anon, authenticated;
grant all on public.collectables_paypal_webhook_events to service_role;

create or replace function public.collectables_checkout_rate_limit(
  p_client_key text,
  p_limit integer default 6,
  p_window_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  if p_client_key is null or length(p_client_key) < 16 then
    raise exception 'invalid_rate_limit_key';
  end if;
  if p_limit < 1 or p_limit > 100 or p_window_seconds < 10 or p_window_seconds > 86400 then
    raise exception 'invalid_rate_limit_config';
  end if;

  insert into public.collectables_checkout_rate_limits(
    client_key, window_started_at, attempts, updated_at
  ) values (
    p_client_key, now(), 1, now()
  )
  on conflict (client_key) do update
    set attempts = case
          when public.collectables_checkout_rate_limits.window_started_at
               <= now() - make_interval(secs => p_window_seconds)
            then 1
          else public.collectables_checkout_rate_limits.attempts + 1
        end,
        window_started_at = case
          when public.collectables_checkout_rate_limits.window_started_at
               <= now() - make_interval(secs => p_window_seconds)
            then now()
          else public.collectables_checkout_rate_limits.window_started_at
        end,
        updated_at = now()
  returning attempts into v_attempts;

  delete from public.collectables_checkout_rate_limits
   where updated_at < now() - interval '2 days';

  return v_attempts <= p_limit;
end;
$$;

create or replace function public.collectables_attach_paypal_order(
  p_order_id uuid,
  p_paypal_order_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $
declare
  v_order public.collectables_orders%rowtype;
begin
  select * into v_order
    from public.collectables_orders
    where id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status = 'paypal_created'
     and v_order.paypal_order_id = p_paypal_order_id then
    return v_order.order_number;
  end if;

  if v_order.status <> 'reserved' or v_order.expires_at <= now() then
    raise exception 'order_not_attachable:%', v_order.status;
  end if;

  update public.collectables_orders
    set paypal_order_id = p_paypal_order_id,
        status = 'paypal_created',
        updated_at = now()
    where id = p_order_id;

  return v_order.order_number;
end;
$;

create or replace function public.collectables_begin_capture(
  p_order_id uuid,
  p_paypal_order_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.collectables_orders%rowtype;
begin
  select * into v_order
    from public.collectables_orders
    where id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status = 'paid' then
    return v_order.order_number;
  end if;

  if v_order.status <> 'paypal_created' then
    raise exception 'order_not_ready_for_capture:%', v_order.status;
  end if;

  if v_order.paypal_order_id is distinct from p_paypal_order_id then
    raise exception 'paypal_order_mismatch';
  end if;

  if v_order.expires_at <= now() then
    raise exception 'reservation_expired';
  end if;

  if not exists (
    select 1
    from public.collectables_stock_reservations
    where order_id = p_order_id
      and status = 'active'
      and expires_at > now()
  ) then
    raise exception 'reservation_missing';
  end if;

  if exists (
    select 1
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.collectables_order_items
      where order_id = p_order_id
      group by product_id
    ) i
    full join (
      select product_id, sum(quantity)::integer as quantity
      from public.collectables_stock_reservations
      where order_id = p_order_id
        and status = 'active'
        and expires_at > now()
      group by product_id
    ) r using (product_id)
    where coalesce(i.quantity, 0) <> coalesce(r.quantity, 0)
  ) then
    raise exception 'reservation_mismatch';
  end if;

  update public.collectables_orders
    set status = 'capturing',
        capture_started_at = now(),
        expires_at = greatest(expires_at, now() + interval '15 minutes'),
        updated_at = now()
    where id = p_order_id;

  update public.collectables_stock_reservations
    set expires_at = greatest(expires_at, now() + interval '15 minutes')
    where order_id = p_order_id
      and status = 'active';

  return v_order.order_number;
end;
$$;

create or replace function public.collectables_mark_order_review(
  p_order_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.collectables_orders
    set status = case when status = 'paid' then status else 'review' end,
        last_error = left(coalesce(p_reason, 'payment_review_required'), 1000),
        updated_at = now()
    where id = p_order_id;
end;
$$;

create or replace function public.collectables_mark_capture_failed(
  p_order_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $
begin
  update public.collectables_orders
    set status = case when status = 'paid' then status else 'failed' end,
        last_error = left(coalesce(p_reason, 'capture_failed'), 1000),
        updated_at = now()
    where id = p_order_id;

  update public.collectables_stock_reservations r
    set status = 'released'
    from public.collectables_orders o
    where o.id = p_order_id
      and r.order_id = o.id
      and o.status = 'failed'
      and r.status = 'active';
end;
$;

create or replace function public.collectables_cancel_order(
  p_order_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.collectables_orders
    set status = case
          when status in ('reserved','paypal_created') then 'cancelled'
          else status
        end,
        last_error = coalesce(left(p_reason, 1000), last_error),
        updated_at = now()
    where id = p_order_id;

  update public.collectables_stock_reservations r
    set status = 'released'
    from public.collectables_orders o
    where o.id = p_order_id
      and r.order_id = o.id
      and o.status = 'cancelled'
      and r.status = 'active';
end;
$$;

create or replace function public.collectables_expire_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.collectables_stock_reservations r
    set status = 'released'
    from public.collectables_orders o
    where r.order_id = o.id
      and r.status = 'active'
      and r.expires_at <= now()
      and o.status in ('reserved','paypal_created');
  get diagnostics v_count = row_count;

  update public.collectables_orders
    set status = 'expired',
        updated_at = now()
    where status in ('reserved','paypal_created')
      and expires_at <= now();

  return v_count;
end;
$$;

create or replace function public.collectables_finalize_order(
  p_order_id uuid,
  p_paypal_order_id text,
  p_paypal_capture_id text,
  p_capture_amount_pence integer,
  p_currency text,
  p_buyer_email text default null,
  p_buyer_name text default null,
  p_shipping_address jsonb default null,
  p_paypal_response jsonb default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.collectables_orders%rowtype;
  v_res record;
begin
  select * into v_order
    from public.collectables_orders
    where id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status = 'paid' then
    if v_order.paypal_order_id is distinct from p_paypal_order_id
       or v_order.paypal_capture_id is distinct from p_paypal_capture_id then
      raise exception 'paid_order_payment_mismatch';
    end if;
    return v_order.order_number;
  end if;

  if v_order.status not in ('capturing','review') then
    raise exception 'order_not_capturing:%', v_order.status;
  end if;

  if p_currency <> v_order.currency or p_capture_amount_pence <> v_order.total_pence then
    raise exception 'capture_amount_mismatch';
  end if;

  if v_order.paypal_order_id is distinct from p_paypal_order_id then
    raise exception 'paypal_order_mismatch';
  end if;

  if p_paypal_capture_id is null or length(p_paypal_capture_id) < 3 then
    raise exception 'paypal_capture_missing';
  end if;

  if exists (
    select 1
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.collectables_order_items
      where order_id = p_order_id
      group by product_id
    ) i
    full join (
      select product_id, sum(quantity)::integer as quantity
      from public.collectables_stock_reservations
      where order_id = p_order_id
        and status = 'active'
      group by product_id
    ) r using (product_id)
    where coalesce(i.quantity, 0) <> coalesce(r.quantity, 0)
  ) then
    raise exception 'reservation_mismatch';
  end if;

  for v_res in
    select r.product_id, r.quantity
    from public.collectables_stock_reservations r
    where r.order_id = p_order_id
      and r.status = 'active'
    order by r.product_id
  loop
    update public.collectables_products
      set stock = stock - v_res.quantity,
          updated_at = now()
      where id = v_res.product_id
        and stock >= v_res.quantity;

    if not found then
      raise exception 'stock_changed:%', v_res.product_id;
    end if;
  end loop;

  update public.collectables_stock_reservations
    set status = 'captured'
    where order_id = p_order_id
      and status = 'active';

  update public.collectables_orders
    set status = 'paid',
        paypal_order_id = p_paypal_order_id,
        paypal_capture_id = p_paypal_capture_id,
        buyer_email = p_buyer_email,
        buyer_name = p_buyer_name,
        shipping_address = p_shipping_address,
        paypal_response = p_paypal_response,
        paid_at = now(),
        last_error = null,
        updated_at = now()
    where id = p_order_id;

  return v_order.order_number;
end;
$$;

revoke all on function public.collectables_checkout_rate_limit(text,integer,integer) from public, anon, authenticated;
revoke all on function public.collectables_attach_paypal_order(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_begin_capture(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_mark_order_review(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_mark_capture_failed(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_cancel_order(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_expire_reservations() from public, anon, authenticated;
revoke all on function public.collectables_finalize_order(uuid,text,text,integer,text,text,text,jsonb,jsonb) from public, anon, authenticated;

grant execute on function public.collectables_checkout_rate_limit(text,integer,integer) to service_role;
grant execute on function public.collectables_attach_paypal_order(uuid,text) to service_role;
grant execute on function public.collectables_begin_capture(uuid,text) to service_role;
grant execute on function public.collectables_mark_order_review(uuid,text) to service_role;
grant execute on function public.collectables_mark_capture_failed(uuid,text) to service_role;
grant execute on function public.collectables_cancel_order(uuid,text) to service_role;
grant execute on function public.collectables_expire_reservations() to service_role;
grant execute on function public.collectables_finalize_order(uuid,text,text,integer,text,text,text,jsonb,jsonb) to service_role;
