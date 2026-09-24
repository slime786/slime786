-- Snapshot of applied Supabase migration 20260922152210: collectables_catalog_and_cleanup
-- Recorded in source control on 24 September 2026.

create index if not exists collectables_order_items_order_id_idx
  on public.collectables_order_items(order_id);
create index if not exists collectables_order_items_product_id_idx
  on public.collectables_order_items(product_id);

create or replace function public.collectables_expire_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.collectables_stock_reservations
    set status = 'released'
    where status = 'active'
      and expires_at <= now();
  get diagnostics v_count = row_count;

  update public.collectables_orders
    set status = 'expired',
        updated_at = now()
    where status in ('reserved','paypal_created')
      and expires_at <= now();

  return v_count;
end;
$$;

revoke all on function public.collectables_expire_reservations() from public, anon, authenticated;
grant execute on function public.collectables_expire_reservations() to service_role;

create or replace function public.collectables_catalog()
returns table(
  id text,
  slug text,
  game text,
  product_type text,
  name text,
  set_name text,
  condition text,
  notes text,
  price_pence integer,
  currency text,
  available_stock integer,
  image_url text,
  is_featured boolean,
  is_new boolean,
  is_slime_pick boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.slug,
    p.game,
    p.product_type,
    p.name,
    p.set_name,
    p.condition,
    p.notes,
    p.price_pence,
    p.currency,
    greatest(
      p.stock - coalesce((
        select sum(r.quantity)::integer
        from public.collectables_stock_reservations r
        where r.product_id = p.id
          and r.status = 'active'
          and r.expires_at > now()
      ), 0),
      0
    )::integer as available_stock,
    p.image_url,
    p.is_featured,
    p.is_new,
    p.is_slime_pick,
    p.created_at
  from public.collectables_products p
  where p.is_active = true
  order by p.is_featured desc, p.is_new desc, p.created_at desc;
$$;

revoke all on function public.collectables_catalog() from public, anon, authenticated;
grant execute on function public.collectables_catalog() to service_role;
