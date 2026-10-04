-- Harden Collectables capture state and reconciliation.
-- Source-controlled migration prepared 4 October 2026.

alter table public.collectables_orders
  drop constraint if exists collectables_orders_status_check;

alter table public.collectables_orders
  add constraint collectables_orders_status_check
  check (status in (
    'reserved',
    'paypal_created',
    'capture_pending',
    'captured_unfinalized',
    'reconciliation_required',
    'paid',
    'cancelled',
    'failed',
    'expired'
  ));

alter table public.collectables_orders
  add column if not exists capture_started_at timestamptz,
  add column if not exists capture_recorded_at timestamptz,
  add column if not exists checkout_token_hash text;

create index if not exists collectables_orders_status_idx
  on public.collectables_orders(status, updated_at);


create table if not exists public.collectables_checkout_rate_limits (
  key_hash text not null,
  action text not null,
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 1 check (hit_count > 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, action),
  check (char_length(key_hash) between 32 and 128),
  check (action in ('create_10m','create_day','capture_10m','capture_day'))
);

alter table public.collectables_checkout_rate_limits enable row level security;
revoke all on public.collectables_checkout_rate_limits from anon, authenticated;

create or replace function public.collectables_take_rate_limit(
  p_key_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns table(
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.collectables_checkout_rate_limits%rowtype;
  v_now timestamptz := now();
  v_window interval;
begin
  if p_key_hash is null or char_length(p_key_hash) < 32 or char_length(p_key_hash) > 128 then
    raise exception 'invalid_rate_limit_key';
  end if;
  if p_action not in ('create_10m','create_day','capture_10m','capture_day') then
    raise exception 'invalid_rate_limit_action';
  end if;
  if p_limit < 1 or p_limit > 1000 or p_window_seconds < 10 or p_window_seconds > 86400 then
    raise exception 'invalid_rate_limit_policy';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  insert into public.collectables_checkout_rate_limits(
    key_hash, action, window_started_at, hit_count, updated_at
  )
  values (p_key_hash, p_action, v_now, 1, v_now)
  on conflict (key_hash, action) do update
    set window_started_at = case
          when public.collectables_checkout_rate_limits.window_started_at + v_window <= v_now
            then v_now
          else public.collectables_checkout_rate_limits.window_started_at
        end,
        hit_count = case
          when public.collectables_checkout_rate_limits.window_started_at + v_window <= v_now
            then 1
          else public.collectables_checkout_rate_limits.hit_count + 1
        end,
        updated_at = v_now
  returning * into v_row;

  allowed := v_row.hit_count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from ((v_row.window_started_at + v_window) - v_now)))::integer
    )
  end;
  return next;
end;
$$;

revoke all on function public.collectables_take_rate_limit(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.collectables_take_rate_limit(text,text,integer,integer)
  to service_role;

-- All checkout RPCs are service-role only. Use invoker rights so the functions
-- do not add privilege beyond the already-authorized server caller.
alter function public.collectables_reserve_order(jsonb) security invoker;
alter function public.collectables_catalog() security invoker;

create or replace function public.collectables_cancel_order(
  p_order_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status text;
begin
  select o.status
    into v_status
    from public.collectables_orders o
    where o.id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_status in ('capture_pending','captured_unfinalized','reconciliation_required','paid') then
    raise exception 'order_payment_state_locked';
  end if;

  update public.collectables_orders
    set status = 'cancelled',
        last_error = coalesce(p_reason, last_error),
        updated_at = now()
    where id = p_order_id;

  update public.collectables_stock_reservations
    set status = 'released'
    where order_id = p_order_id
      and status = 'active';
end;
$$;

create or replace function public.collectables_prepare_capture(
  p_order_id uuid,
  p_paypal_order_id text
)
returns table(
  order_number text,
  total_pence integer,
  currency text,
  capture_status text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.collectables_orders%rowtype;
begin
  select o.*
    into v_order
    from public.collectables_orders o
    where o.id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.paypal_order_id is null
     or v_order.paypal_order_id <> p_paypal_order_id then
    raise exception 'paypal_order_mismatch';
  end if;

  if v_order.status = 'paid' then
    return query
      select v_order.order_number, v_order.total_pence, v_order.currency, v_order.status;
    return;
  end if;

  if v_order.status not in ('paypal_created','capture_pending','reconciliation_required') then
    raise exception 'invalid_capture_state:%', v_order.status;
  end if;

  if v_order.expires_at <= now() then
    raise exception 'reservation_expired';
  end if;

  if not exists (
    select 1
    from public.collectables_order_items oi
    where oi.order_id = p_order_id
  ) then
    raise exception 'order_items_missing';
  end if;

  if exists (
    select 1
    from public.collectables_order_items oi
    left join public.collectables_stock_reservations r
      on r.order_id = oi.order_id
     and r.product_id = oi.product_id
     and r.status = 'active'
    where oi.order_id = p_order_id
      and (
        r.id is null
        or r.quantity <> oi.quantity
        or r.expires_at <= now()
      )
  ) then
    raise exception 'reservation_missing_or_expired';
  end if;

  update public.collectables_stock_reservations
    set expires_at = greatest(expires_at, now() + interval '15 minutes')
    where order_id = p_order_id
      and status = 'active';

  update public.collectables_orders
    set status = 'capture_pending',
        capture_started_at = coalesce(capture_started_at, now()),
        expires_at = greatest(expires_at, now() + interval '15 minutes'),
        last_error = null,
        updated_at = now()
    where id = p_order_id;

  return query
    select v_order.order_number, v_order.total_pence, v_order.currency, 'capture_pending'::text;
end;
$$;

create or replace function public.collectables_record_capture(
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
security invoker
set search_path = public
as $$
declare
  v_order public.collectables_orders%rowtype;
begin
  select o.*
    into v_order
    from public.collectables_orders o
    where o.id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.paypal_order_id is null
     or v_order.paypal_order_id <> p_paypal_order_id then
    raise exception 'paypal_order_mismatch';
  end if;

  if v_order.status = 'paid' then
    if v_order.paypal_capture_id is not null
       and v_order.paypal_capture_id <> p_paypal_capture_id then
      raise exception 'paypal_capture_mismatch';
    end if;
    return v_order.order_number;
  end if;

  if v_order.status not in ('capture_pending','captured_unfinalized','reconciliation_required') then
    raise exception 'invalid_capture_state:%', v_order.status;
  end if;

  if p_currency <> v_order.currency
     or p_capture_amount_pence <> v_order.total_pence then
    raise exception 'capture_amount_mismatch';
  end if;

  if v_order.paypal_capture_id is not null
     and v_order.paypal_capture_id <> p_paypal_capture_id then
    raise exception 'paypal_capture_mismatch';
  end if;

  update public.collectables_orders
    set status = 'captured_unfinalized',
        paypal_capture_id = p_paypal_capture_id,
        buyer_email = p_buyer_email,
        buyer_name = p_buyer_name,
        shipping_address = p_shipping_address,
        paypal_response = p_paypal_response,
        capture_recorded_at = coalesce(capture_recorded_at, now()),
        last_error = null,
        updated_at = now()
    where id = p_order_id;

  return v_order.order_number;
end;
$$;

create or replace function public.collectables_finalize_captured_order(
  p_order_id uuid
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.collectables_orders%rowtype;
  v_res record;
begin
  select o.*
    into v_order
    from public.collectables_orders o
    where o.id = p_order_id
    for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status = 'paid' then
    return v_order.order_number;
  end if;

  if v_order.status <> 'captured_unfinalized'
     or v_order.paypal_capture_id is null
     or v_order.capture_recorded_at is null then
    raise exception 'capture_not_recorded';
  end if;

  if exists (
    select 1
    from public.collectables_order_items oi
    left join public.collectables_stock_reservations r
      on r.order_id = oi.order_id
     and r.product_id = oi.product_id
     and r.status = 'active'
    where oi.order_id = p_order_id
      and (r.id is null or r.quantity <> oi.quantity)
  ) then
    raise exception 'active_reservation_missing';
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
        paid_at = coalesce(paid_at, capture_recorded_at, now()),
        last_error = null,
        updated_at = now()
    where id = p_order_id;

  return v_order.order_number;
end;
$$;

create or replace function public.collectables_mark_reconciliation_required(
  p_order_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.collectables_orders
    set status = case
          when status in ('paid','captured_unfinalized') then status
          else 'reconciliation_required'
        end,
        last_error = left(coalesce(p_reason, 'payment_reconciliation_required'), 1000),
        updated_at = now()
    where id = p_order_id
      and status not in ('cancelled','expired');
end;
$$;

create or replace function public.collectables_expire_reservations()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.collectables_stock_reservations r
    set status = 'released'
    where r.status = 'active'
      and r.expires_at <= now()
      and exists (
        select 1
        from public.collectables_orders o
        where o.id = r.order_id
          and o.status in ('reserved','paypal_created','cancelled','failed','expired')
      );
  get diagnostics v_count = row_count;

  update public.collectables_orders
    set status = 'expired',
        updated_at = now()
    where status in ('reserved','paypal_created')
      and expires_at <= now();

  return v_count;
end;
$$;

revoke all on function public.collectables_cancel_order(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_prepare_capture(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_record_capture(uuid,text,text,integer,text,text,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.collectables_finalize_captured_order(uuid) from public, anon, authenticated;
revoke all on function public.collectables_mark_reconciliation_required(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_expire_reservations() from public, anon, authenticated;

grant execute on function public.collectables_cancel_order(uuid,text) to service_role;
grant execute on function public.collectables_prepare_capture(uuid,text) to service_role;
grant execute on function public.collectables_record_capture(uuid,text,text,integer,text,text,text,jsonb,jsonb) to service_role;
grant execute on function public.collectables_finalize_captured_order(uuid) to service_role;
grant execute on function public.collectables_mark_reconciliation_required(uuid,text) to service_role;
grant execute on function public.collectables_expire_reservations() to service_role;

revoke all on function public.collectables_finalize_order(uuid,text,text,integer,text,text,text,jsonb,jsonb)
  from public, anon, authenticated, service_role;
drop function if exists public.collectables_finalize_order(uuid,text,text,integer,text,text,text,jsonb,jsonb);
