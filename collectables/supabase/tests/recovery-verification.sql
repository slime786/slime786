-- Slime's Collectables recovery/readiness verification
-- Read-only checks wrapped in a transaction. No customer/order/product data is changed.

begin;

do $$
declare
  v_missing text[] := '{}';
  v_rls_off text[] := '{}';
  v_exposed text[] := '{}';
  v_name text;
  v_signature text;
  v_oid regprocedure;
begin
  foreach v_name in array array[
    'collectables_products',
    'collectables_orders',
    'collectables_order_items',
    'collectables_stock_reservations',
    'collectables_checkout_rate_limits',
    'collectables_paypal_webhook_events'
  ]
  loop
    if to_regclass('public.' || v_name) is null then
      v_missing := array_append(v_missing, v_name);
    end if;
  end loop;

  foreach v_signature in array array[
    'public.collectables_catalog()',
    'public.collectables_reserve_order(jsonb)',
    'public.collectables_cancel_order(uuid,text)',
    'public.collectables_expire_reservations()',
    'public.collectables_finalize_order(uuid,text,text,integer,text,text,text,jsonb,jsonb)',
    'public.collectables_checkout_rate_limit(text,integer,integer)',
    'public.collectables_attach_paypal_order(uuid,text)',
    'public.collectables_begin_capture(uuid,text)',
    'public.collectables_mark_order_review(uuid,text)',
    'public.collectables_mark_capture_failed(uuid,text)'
  ]
  loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is null then
      v_missing := array_append(v_missing, v_signature);
    else
      if has_function_privilege('anon', v_oid, 'EXECUTE')
         or has_function_privilege('authenticated', v_oid, 'EXECUTE') then
        v_exposed := array_append(v_exposed, v_signature);
      end if;
      if not has_function_privilege('service_role', v_oid, 'EXECUTE') then
        v_missing := array_append(v_missing, v_signature || ' service_role grant');
      end if;
    end if;
  end loop;

  select coalesce(array_agg(c.relname order by c.relname),'{}')
    into v_rls_off
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname like 'collectables_%'
    and c.relkind='r'
    and c.relrowsecurity=false;

  select coalesce(array_agg(distinct g.table_name order by g.table_name),'{}')
    into v_exposed
  from information_schema.role_table_grants g
  where g.table_schema='public'
    and g.table_name like 'collectables_%'
    and g.grantee in ('anon','authenticated')
    and g.privilege_type in ('SELECT','INSERT','UPDATE','DELETE');

  if array_length(v_missing,1) is not null then
    raise exception 'collectables recovery verification failed; missing: %', array_to_string(v_missing, ', ');
  end if;

  if array_length(v_rls_off,1) is not null then
    raise exception 'collectables recovery verification failed; RLS off: %', array_to_string(v_rls_off, ', ');
  end if;

  if array_length(v_exposed,1) is not null then
    raise exception 'collectables recovery verification failed; browser role exposure: %', array_to_string(v_exposed, ', ');
  end if;
end $$;

rollback;
