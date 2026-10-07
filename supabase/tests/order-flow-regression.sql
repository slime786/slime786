begin;

set local statement_timeout = '20s';

do $test$
declare
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_single text := 'test-single-' || v_suffix;
  v_sealed text := 'test-sealed-' || v_suffix;
  v_high text := 'test-high-' || v_suffix;
  v_onecopy text := 'test-onecopy-' || v_suffix;
  v_success text := 'test-success-' || v_suffix;
  v_order record;
  v_order2 record;
  v_status text;
  v_reservation_status text;
  v_stock integer;
  v_count integer;
  v_order_number text;
begin
  insert into public.collectables_products
    (id, game, product_type, name, price_pence, stock, is_active)
  values
    (v_single, 'pokemon', 'single', 'Regression single', 1000, 10, true),
    (v_sealed, 'yugioh', 'sealed', 'Regression sealed', 2000, 10, true),
    (v_high, 'pokemon', 'single', 'Regression high value', 10000, 3, true),
    (v_onecopy, 'yugioh', 'single', 'Regression one copy', 2500, 1, true),
    (v_success, 'pokemon', 'single', 'Regression capture item', 3200, 3, true);

  begin
    perform * from public.collectables_reserve_order('[]'::jsonb);
    raise exception 'regression_failed: empty cart was accepted';
  exception
    when others then
      if sqlerrm not like 'cart_empty%' then raise; end if;
  end;

  select * into v_order
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_single, 'quantity', 1))
  );
  if v_order.subtotal_pence <> 1000 or v_order.shipping_pence <> 399 or v_order.total_pence <> 1399 then
    raise exception 'regression_failed: single shipping totals';
  end if;
  perform public.collectables_cancel_order(v_order.order_id, 'regression cleanup');

  select * into v_order
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_sealed, 'quantity', 1))
  );
  if v_order.subtotal_pence <> 2000 or v_order.shipping_pence <> 549 or v_order.total_pence <> 2549 then
    raise exception 'regression_failed: sealed shipping totals';
  end if;
  perform public.collectables_cancel_order(v_order.order_id, 'regression cleanup');

  select * into v_order
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_high, 'quantity', 1))
  );
  if v_order.subtotal_pence <> 10000 or v_order.shipping_pence <> 0 or v_order.total_pence <> 10000 then
    raise exception 'regression_failed: free shipping threshold';
  end if;
  perform public.collectables_cancel_order(v_order.order_id, 'regression cleanup');

  select * into v_order
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_onecopy, 'quantity', 1))
  );
  begin
    perform * from public.collectables_reserve_order(
      jsonb_build_array(jsonb_build_object('id', v_onecopy, 'quantity', 1))
    );
    raise exception 'regression_failed: oversell reservation was accepted';
  exception
    when others then
      if sqlerrm not like 'insufficient_stock:%' then raise; end if;
  end;

  perform public.collectables_cancel_order(v_order.order_id, 'regression cancellation');
  select status into v_reservation_status
  from public.collectables_stock_reservations
  where order_id = v_order.order_id and product_id = v_onecopy;
  if v_reservation_status <> 'released' then
    raise exception 'regression_failed: cancellation did not release reservation';
  end if;

  select * into v_order2
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_onecopy, 'quantity', 1))
  );
  perform public.collectables_cancel_order(v_order2.order_id, 'regression cleanup');

  select * into v_order
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_single, 'quantity', 1))
  );
  update public.collectables_orders
  set expires_at = now() - interval '1 minute'
  where id = v_order.order_id;
  update public.collectables_stock_reservations
  set expires_at = now() - interval '1 minute'
  where order_id = v_order.order_id;
  perform public.collectables_expire_reservations();

  select status into v_status
  from public.collectables_orders where id = v_order.order_id;
  select status into v_reservation_status
  from public.collectables_stock_reservations
  where order_id = v_order.order_id limit 1;
  if v_status <> 'expired' or v_reservation_status <> 'released' then
    raise exception 'regression_failed: expiry state transition';
  end if;

  select stock into v_stock from public.collectables_products where id = v_success;
  select * into v_order
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_success, 'quantity', 1))
  );
  perform public.collectables_attach_paypal_order(v_order.order_id, 'PP-MISMATCH-' || v_suffix);
  perform public.collectables_begin_capture(v_order.order_id, 'PP-MISMATCH-' || v_suffix);
  begin
    perform public.collectables_finalize_order(
      v_order.order_id,
      'PP-MISMATCH-' || v_suffix,
      'CAP-MISMATCH-' || v_suffix,
      v_order.total_pence + 1,
      'GBP',
      'regression@example.invalid',
      'Regression Test',
      '{}'::jsonb,
      '{}'::jsonb
    );
    raise exception 'regression_failed: capture amount mismatch was accepted';
  exception
    when others then
      if sqlerrm not like 'capture_amount_mismatch%' then raise; end if;
  end;
  if (select stock from public.collectables_products where id = v_success) <> v_stock then
    raise exception 'regression_failed: mismatch changed stock';
  end if;
  perform public.collectables_mark_capture_failed(v_order.order_id, 'regression mismatch cleanup');

  select stock into v_stock from public.collectables_products where id = v_success;
  select * into v_order
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_success, 'quantity', 1))
  );
  perform public.collectables_attach_paypal_order(v_order.order_id, 'PP-SUCCESS-' || v_suffix);
  perform public.collectables_begin_capture(v_order.order_id, 'PP-SUCCESS-' || v_suffix);

  select status into v_status
  from public.collectables_orders where id = v_order.order_id;
  if v_status <> 'capturing' then
    raise exception 'regression_failed: begin_capture did not enter capturing';
  end if;

  v_order_number := public.collectables_finalize_order(
    v_order.order_id,
    'PP-SUCCESS-' || v_suffix,
    'CAP-SUCCESS-' || v_suffix,
    v_order.total_pence,
    'GBP',
    'regression@example.invalid',
    'Regression Test',
    '{"country_code":"GB"}'::jsonb,
    '{"source":"regression"}'::jsonb
  );

  select status into v_status
  from public.collectables_orders where id = v_order.order_id;
  select status into v_reservation_status
  from public.collectables_stock_reservations
  where order_id = v_order.order_id and product_id = v_success;
  select stock into v_count
  from public.collectables_products where id = v_success;

  if v_status <> 'paid' then
    raise exception 'regression_failed: successful capture not paid';
  end if;
  if v_reservation_status <> 'captured' then
    raise exception 'regression_failed: successful reservation not captured';
  end if;
  if v_count <> v_stock - 1 then
    raise exception 'regression_failed: successful capture stock deduction';
  end if;

  if public.collectables_finalize_order(
    v_order.order_id,
    'PP-SUCCESS-' || v_suffix,
    'CAP-SUCCESS-' || v_suffix,
    v_order.total_pence,
    'GBP',
    'regression@example.invalid',
    'Regression Test',
    '{"country_code":"GB"}'::jsonb,
    '{"source":"regression-repeat"}'::jsonb
  ) <> v_order_number then
    raise exception 'regression_failed: idempotent finalisation returned different order';
  end if;

  if (select stock from public.collectables_products where id = v_success) <> v_stock - 1 then
    raise exception 'regression_failed: idempotent finalisation deducted stock twice';
  end if;

  begin
    perform public.collectables_finalize_order(
      v_order.order_id,
      'PP-SUCCESS-' || v_suffix,
      'CAP-DIFFERENT-' || v_suffix,
      v_order.total_pence,
      'GBP',
      null, null, null, null
    );
    raise exception 'regression_failed: mismatched replay accepted';
  exception
    when others then
      if sqlerrm not like 'paid_order_payment_mismatch%' then raise; end if;
  end;

  select * into v_order2
  from public.collectables_reserve_order(
    jsonb_build_array(jsonb_build_object('id', v_single, 'quantity', 2))
  );
  select available_stock into v_count
  from public.collectables_catalog()
  where id = v_single;
  if v_count <> 8 then
    raise exception 'regression_failed: catalog available stock expected 8, got %', v_count;
  end if;
  perform public.collectables_cancel_order(v_order2.order_id, 'regression cleanup');
end
$test$;

rollback;

select 'collectables_order_flow_regression_passed' as result;
