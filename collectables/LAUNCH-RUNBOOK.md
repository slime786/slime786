# Slime's Collectables — Launch Runbook

This is the exact cutover and rollback sequence for moving the public shop from catalogue preview to real orders.

## Safety rules

- Keep `DEMO_MODE = true` on the public site until the final launch cutover.
- Never commit `PAYPAL_CLIENT_SECRET` or the Supabase service-role key.
- The PayPal browser Client ID is public by design, but the server secret belongs only in Supabase Edge Function secrets.
- While `DEMO_MODE = true`, PayPal sandbox checkout is allowed only on `localhost` / `127.0.0.1`. GitHub Pages stays locked.
- Use verified real stock only. Never test against valuable one-off inventory when a synthetic test product will do.

## Phase 1 — Real inventory preparation

1. Export/collect the items that are actually for sale.
2. Separate sale stock from personal keepers.
3. Photograph the exact singles, slabs and sealed items.
4. Verify game, product type, set, condition/grade, GBP price and stock quantity.
5. Load the verified items into `collectables_products`.
6. Confirm the secure catalog API returns only the intended active products.
7. Check sold-out behaviour with a zero-stock test item.

## Phase 2 — PayPal sandbox

1. Create/use a PayPal sandbox app.
2. Add `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and `PAYPAL_ENV=sandbox` to Supabase Edge Function secrets.
3. Put only the public sandbox Client ID in `collectables/app.js`.
4. Keep `DEMO_MODE = true`.
5. Serve the site locally from the repository so the hostname is `localhost` or `127.0.0.1`.
6. Use synthetic/test catalogue stock for the first checkout.
7. Verify: reserve → PayPal approve → capture → paid order → single stock decrement → confirmation number.
8. Verify cancellation, failed capture and reservation expiry.
9. Remove synthetic test products/orders as appropriate after the test.

## Phase 3 — Final preflight

Run and confirm:
- `node tests/portfolio-smoke.mjs`
- `node tests/collectables-smoke.mjs`
- `collectables/supabase/tests/order-flow-regression.sql`
- `collectables/supabase/tests/recovery-verification.sql`

Then manually check:
- mobile and desktop layout
- keyboard navigation and focus
- every real product image
- exact price and condition
- basket totals and shipping
- Shipping & Returns, Terms, Privacy, Condition Guide and Contact
- refund/cancellation and packing process

## Phase 4 — Live cutover

Only after sandbox QA passes:

1. Add live PayPal server credentials in Supabase and set `PAYPAL_ENV=live`.
2. Put the public live Client ID in `app.js`.
3. Set `PAYPAL_MODE = "live"`.
4. Set `DEMO_MODE = false`.
5. Remove the shop/policy `noindex` robots meta tags so search engines may index the real store.
6. Replace preview-only wording/badges with live-store wording where required.
7. Deploy.
8. Complete one low-risk real purchase and verify the order, stock decrement and confirmation.
9. Keep the order reference and verify fulfilment end-to-end.

## Rollback

If anything looks wrong after cutover:

1. Immediately set `DEMO_MODE = true` and redeploy. This locks public checkout.
2. If needed, deactivate affected products in `collectables_products`.
3. Do not delete or overwrite paid order records.
4. Check Supabase order/reservation state and PayPal before retrying a payment.
5. Restore the previous known-good Git commit if the issue is frontend-only.
6. Re-run the regression and recovery checks before reopening checkout.

## Launch blockers

Do not go live while any of these remain:
- unverified inventory or missing exact-item photos
- PayPal sandbox flow not completed
- shipping/returns/refund process not confirmed
- recovery verification failing
- critical mobile/keyboard issue
- real-payment credentials present while the public store is unintentionally in preview
