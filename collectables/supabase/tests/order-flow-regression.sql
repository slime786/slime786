-- Slime's Collectables checkout regression test
-- All synthetic rows are rolled back.
-- Covers reservation safety, shipping, checkout state transitions, capture protection,
-- rate limiting, failure release and finalize idempotency.

begin;

do $$
declare
  v_order uuid;
  v_order2 uuid;
  v_order3 uuid;
  v_order4 uuid;
  v_number text;
  v_sub integer;
  v_ship integer;
  v_total integer;
  v_currency text;
  v_stock integer;
  v_status text;
  v_res_status text;
  v_failed boolean := false;
  v_allowed boolean;
begin
  insert into public.collectables_products(
    id,slug,game,product_type,name,set_name,condition,price_pence,currency,stock,is_active
  ) values
    ('__sc_test_single','sc-test-single','pokemon','single','Synthetic Single','Test','NM',1000,'GBP',2,true),
    ('__sc_test_sealed','sc-test-sealed','yugioh','sealed','Synthetic Sealed','Test','Sealed',1000,'GBP',2,true),
    ('__sc_test_high','sc-test-high','pokemon','single','Synthetic High Value','Test','NM',10000,'GBP',2,true);

  begin
    perform * from public.collectables_reserve_order('[]'::jsonb);
  exception when others then
    if sqlerrm like '%cart_empty%' then v_failed := true; else raise; end if;
  end;
  if not v_failed then raise exception 'test_failed: empty cart accepted'; end if;

  select public.collectables_checkout_rate_limit('__sc_test_client_key_0000000000000001',2,600)
    into v_allowed;
  if not v_allowed then raise exception 'test_failed: first rate-limit attempt rejected'; end if;
  select public.collectables_checkout_rate_limit('__sc_test_client_key_0000000000000001',2,600)
    into v_allowed;
  if not v_allowed then raise exception 'test_failed: second rate-limit attempt rejected'; end if;
  select public.collectables_checkout_rate_limit('__sc_test_client_key_0000000000000001',2,600)
    into v_allowed;
  if v_allowed then raise exception 'test_failed: rate limit not enforced'; end if;

  select order_id,order_number,subtotal_pence,shipping_pence,total_pence,currency
    into v_order,v_number,v_sub,v_ship,v_total,v_currency
    from public.collectables_reserve_order('[{"id":"__sc_test_single","quantity":1}]'::jsonb);
  if v_sub <> 1000 or v_ship <> 399 or v_total <> 1399 or v_currency <> 'GBP' then
    raise exception 'test_failed: single shipping totals';
  end if;

  perform public.collectables_attach_paypal_order(v_order,'PAYPAL-CANCEL-TEST');
  select status into v_status from public.collectables_orders where id=v_order;
  if v_status <> 'paypal_created' then raise exception 'test_failed: PayPal order not attached'; end if;

  perform public.collectables_cancel_order(v_order,'synthetic test cancel');
  select status into v_status from public.collectables_orders where id=v_order;
  select status into v_res_status from public.collectables_stock_reservations where order_id=v_order;
  if v_status <> 'cancelled' or v_res_status <> 'released' then
    raise exception 'test_failed: cancel did not release';
  end if;

  select order_id,order_number,subtotal_pence,shipping_pence,total_pence,currency
    into v_order2,v_number,v_sub,v_ship,v_total,v_currency
    from public.collectables_reserve_order('[{"id":"__sc_test_single","quantity":2}]'::jsonb);
  perform public.collectables_attach_paypal_order(v_order2,'PAYPAL-CAPTURE-TEST');
  perform public.collectables_begin_capture(v_order2,'PAYPAL-CAPTURE-TEST');

  select status into v_status from public.collectables_orders where id=v_order2;
  if v_status <> 'capturing' then raise exception 'test_failed: begin capture state'; end if;

  update public.collectables_stock_reservations
    set expires_at=now()-interval '1 minute'
    where order_id=v_order2;
  update public.collectables_orders
    set expires_at=now()-interval '1 minute'
    where id=v_order2;
  perform public.collectables_expire_reservations();

  select status into v_status from public.collectables_orders where id=v_order2;
  select status into v_res_status from public.collectables_stock_reservations where order_id=v_order2;
  if v_status <> 'capturing' or v_res_status <> 'active' then
    raise exception 'test_failed: capturing order was expired/released';
  end if;

  v_failed := false;
  begin
    perform public.collectables_finalize_order(
      v_order2,'PAYPAL-CAPTURE-TEST','CAP-WRONG',2398,'GBP',null,null,null,'{}'::jsonb
    );
  exception when others then
    if sqlerrm like '%capture_amount_mismatch%' then v_failed := true; else raise; end if;
  end;
  if not v_failed then raise exception 'test_failed: wrong capture amount accepted'; end if;

  perform public.collectables_finalize_order(
    v_order2,'PAYPAL-CAPTURE-TEST','CAP-OK',2399,'GBP',
    'buyer@example.invalid','Synthetic Buyer','{}'::jsonb,'{}'::jsonb
  );
  select stock into v_stock from public.collectables_products where id='__sc_test_single';
  if v_stock <> 0 then raise exception 'test_failed: stock not decremented'; end if;

  perform public.collectables_finalize_order(
    v_order2,'PAYPAL-CAPTURE-TEST','CAP-OK',2399,'GBP',
    'buyer@example.invalid','Synthetic Buyer','{}'::jsonb,'{}'::jsonb
  );
  select stock into v_stock from public.collectables_products where id='__sc_test_single';
  if v_stock <> 0 then raise exception 'test_failed: idempotent finalize decremented twice'; end if;

  select order_id,order_number,subtotal_pence,shipping_pence,total_pence,currency
    into v_order3,v_number,v_sub,v_ship,v_total,v_currency
    from public.collectables_reserve_order('[{"id":"__sc_test_sealed","quantity":1}]'::jsonb);
  if v_ship <> 549 or v_total <> 1549 then raise exception 'test_failed: sealed shipping totals'; end if;
  perform public.collectables_attach_paypal_order(v_order3,'PAYPAL-DENIED-TEST');
  perform public.collectables_begin_capture(v_order3,'PAYPAL-DENIED-TEST');
  perform public.collectables_mark_capture_failed(v_order3,'synthetic denial');
  select status into v_status from public.collectables_orders where id=v_order3;
  select status into v_res_status from public.collectables_stock_reservations where order_id=v_order3;
  if v_status <> 'failed' or v_res_status <> 'released' then
    raise exception 'test_failed: capture denial did not release stock';
  end if;

  select order_id,order_number,subtotal_pence,shipping_pence,total_pence,currency
    into v_order4,v_number,v_sub,v_ship,v_total,v_currency
    from public.collectables_reserve_order('[{"id":"__sc_test_high","quantity":1}]'::jsonb);
  if v_ship <> 0 or v_total <> 10000 then raise exception 'test_failed: free shipping threshold'; end if;

  update public.collectables_stock_reservations set expires_at=now()-interval '1 minute' where order_id=v_order4;
  update public.collectables_orders set expires_at=now()-interval '1 minute' where id=v_order4;
  perform public.collectables_expire_reservations();
  select status into v_status from public.collectables_orders where id=v_order4;
  select status into v_res_status from public.collectables_stock_reservations where order_id=v_order4;
  if v_status <> 'expired' or v_res_status <> 'released' then
    raise exception 'test_failed: expiry cleanup';
  end if;
end $$;

rollback;
