-- Slime's Collectables recovery/readiness verification
-- Read-only checks wrapped in a transaction. No customer/order/product data is changed.

begin;

do $$
declare
  v_missing text[] := '{}';
  v_rls_off text[] := '{}';
  v_name text;
begin
  foreach v_name in array array[
    'collectables_products',
    'collectables_orders',
    'collectables_order_items',
    'collectables_stock_reservations'
  ]
  loop
    if to_regclass('public.' || v_name) is null then
      v_missing := array_append(v_missing, v_name);
    end if;
  end loop;

  foreach v_name in array array[
    'collectables_catalog',
    'collectables_reserve_order',
    'collectables_cancel_order',
    'collectables_expire_reservations',
    'collectables_finalize_order'
  ]
  loop
    if not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=v_name
    ) then
      v_missing := array_append(v_missing, v_name || '()');
    end if;
  end loop;

  select coalesce(array_agg(c.relname order by c.relname),'{}')
    into v_rls_off
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in (
      'collectables_products',
      'collectables_orders',
      'collectables_order_items',
      'collectables_stock_reservations'
    )
    and c.relrowsecurity=false;

  if array_length(v_missing,1) is not null then
    raise exception 'collectables recovery verification failed; missing: %', array_to_string(v_missing, ', ');
  end if;

  if array_length(v_rls_off,1) is not null then
    raise exception 'collectables recovery verification failed; RLS off: %', array_to_string(v_rls_off, ', ');
  end if;
end $$;

rollback;
