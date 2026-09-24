-- Snapshot of applied Supabase migration 20260922150418: collectables_secure_checkout_foundation
-- Recorded in source control on 24 September 2026.

create table if not exists public.collectables_products (
  id text primary key,
  slug text unique,
  game text not null check (game in ('yugioh','pokemon')),
  product_type text not null check (product_type in ('single','sealed','graded','bundle')),
  name text not null,
  set_name text,
  condition text,
  notes text,
  price_pence integer not null check (price_pence >= 0),
  currency text not null default 'GBP' check (currency = 'GBP'),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default false,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_slime_pick boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collectables_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  paypal_order_id text unique,
  paypal_capture_id text unique,
  status text not null default 'reserved'
    check (status in ('reserved','paypal_created','paid','cancelled','failed','expired')),
  currency text not null default 'GBP' check (currency = 'GBP'),
  subtotal_pence integer not null default 0 check (subtotal_pence >= 0),
  shipping_pence integer not null default 0 check (shipping_pence >= 0),
  total_pence integer not null default 0 check (total_pence >= 0),
  buyer_email text,
  buyer_name text,
  shipping_address jsonb,
  paypal_response jsonb,
  last_error text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.collectables_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.collectables_orders(id) on delete cascade,
  product_id text not null references public.collectables_products(id),
  product_name text not null,
  game text not null,
  product_type text not null,
  unit_price_pence integer not null check (unit_price_pence >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.collectables_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.collectables_orders(id) on delete cascade,
  product_id text not null references public.collectables_products(id),
  quantity integer not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','captured','released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(order_id, product_id)
);

create index if not exists collectables_products_active_idx
  on public.collectables_products(is_active, game, product_type);
create index if not exists collectables_orders_paypal_idx
  on public.collectables_orders(paypal_order_id);
create index if not exists collectables_reservations_product_idx
  on public.collectables_stock_reservations(product_id, status, expires_at);
create index if not exists collectables_reservations_order_idx
  on public.collectables_stock_reservations(order_id);

alter table public.collectables_products enable row level security;
alter table public.collectables_orders enable row level security;
alter table public.collectables_order_items enable row level security;
alter table public.collectables_stock_reservations enable row level security;

revoke all on public.collectables_products from anon, authenticated;
revoke all on public.collectables_orders from anon, authenticated;
revoke all on public.collectables_order_items from anon, authenticated;
revoke all on public.collectables_stock_reservations from anon, authenticated;

create or replace function public.collectables_reserve_order(p_cart jsonb)
returns table(
  order_id uuid,
  order_number text,
  subtotal_pence integer,
  shipping_pence integer,
  total_pence integer,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'SC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_item jsonb;
  v_product public.collectables_products%rowtype;
  v_qty integer;
  v_reserved integer;
  v_subtotal integer := 0;
  v_shipping integer := 0;
  v_has_sealed boolean := false;
begin
  if p_cart is null or jsonb_typeof(p_cart) <> 'array' or jsonb_array_length(p_cart) = 0 then
    raise exception 'cart_empty';
  end if;

  if jsonb_array_length(p_cart) > 50 then
    raise exception 'cart_too_large';
  end if;

  insert into public.collectables_orders(id, order_number, status, expires_at)
  values (v_order_id, v_order_number, 'reserved', now() + interval '30 minutes');

  for v_item in select value from jsonb_array_elements(p_cart)
  loop
    begin
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'invalid_quantity';
    end;

    if v_qty < 1 or v_qty > 10 then
      raise exception 'invalid_quantity';
    end if;

    select *
      into v_product
      from public.collectables_products
      where id = v_item->>'id'
        and is_active = true
      for update;

    if not found then
      raise exception 'product_unavailable:%', coalesce(v_item->>'id','unknown');
    end if;

    select coalesce(sum(r.quantity),0)::integer
      into v_reserved
      from public.collectables_stock_reservations r
      where r.product_id = v_product.id
        and r.status = 'active'
        and r.expires_at > now();

    if (v_product.stock - v_reserved) < v_qty then
      raise exception 'insufficient_stock:%', v_product.id;
    end if;

    insert into public.collectables_order_items(
      order_id, product_id, product_name, game, product_type, unit_price_pence, quantity
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.game, v_product.product_type,
      v_product.price_pence, v_qty
    );

    insert into public.collectables_stock_reservations(
      order_id, product_id, quantity, status, expires_at
    ) values (
      v_order_id, v_product.id, v_qty, 'active', now() + interval '30 minutes'
    );

    v_subtotal := v_subtotal + (v_product.price_pence * v_qty);
    if v_product.product_type = 'sealed' then
      v_has_sealed := true;
    end if;
  end loop;

  if v_subtotal >= 10000 then
    v_shipping := 0;
  elsif v_has_sealed then
    v_shipping := 549;
  else
    v_shipping := 399;
  end if;

  update public.collectables_orders
    set subtotal_pence = v_subtotal,
        shipping_pence = v_shipping,
        total_pence = v_subtotal + v_shipping,
        updated_at = now()
    where id = v_order_id;

  return query
    select v_order_id, v_order_number, v_subtotal, v_shipping, v_subtotal + v_shipping, 'GBP'::text;
end;
$$;

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
    set status = case when status = 'paid' then status else 'cancelled' end,
        last_error = coalesce(p_reason, last_error),
        updated_at = now()
    where id = p_order_id;

  update public.collectables_stock_reservations
    set status = 'released'
    where order_id = p_order_id
      and status = 'active';
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
    return v_order.order_number;
  end if;

  if v_order.expires_at <= now() then
    raise exception 'reservation_expired';
  end if;

  if p_currency <> v_order.currency or p_capture_amount_pence <> v_order.total_pence then
    raise exception 'capture_amount_mismatch';
  end if;

  if v_order.paypal_order_id is not null and v_order.paypal_order_id <> p_paypal_order_id then
    raise exception 'paypal_order_mismatch';
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
        updated_at = now()
    where id = p_order_id;

  return v_order.order_number;
end;
$$;

revoke all on function public.collectables_reserve_order(jsonb) from public, anon, authenticated;
revoke all on function public.collectables_cancel_order(uuid,text) from public, anon, authenticated;
revoke all on function public.collectables_finalize_order(uuid,text,text,integer,text,text,text,jsonb,jsonb) from public, anon, authenticated;

grant execute on function public.collectables_reserve_order(jsonb) to service_role;
grant execute on function public.collectables_cancel_order(uuid,text) to service_role;
grant execute on function public.collectables_finalize_order(uuid,text,text,integer,text,text,text,jsonb,jsonb) to service_role;
