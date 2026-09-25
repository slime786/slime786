# Slime's Collectables — Checkout Backend

The storefront stays static on GitHub Pages, while secure checkout logic runs server-side.

## What is already built

- Supabase tables for products, orders, order items, and temporary stock reservations
- Row Level Security enabled on all Collectables tables
- Browser users cannot directly read or write private order/reservation data
- Server-side product price validation
- 30-minute stock reservations to reduce overselling risk
- UK shipping calculation:
  - Singles / non-sealed: £3.99
  - Orders containing sealed products: £5.49
  - Free shipping at £100+

Compensation note: these are customer-facing shipping charges. High-value orders should be upgraded operationally to a carrier/service with compensation appropriate to the order value; do not assume the default tracked service is sufficient for every order.
- PayPal create-order function
- PayPal capture-order function
- Order number generation
- Idempotent paid-order finalisation
- Stock deduction only after confirmed capture
- Public catalog API that exposes only active product data
- Expired-reservation cleanup
- Sold-out support in the storefront

## PayPal secrets still required

Add these in Supabase Dashboard → Edge Functions → Secrets:

- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- PAYPAL_ENV=sandbox

Start with sandbox credentials.

Do not put the PayPal Client Secret in GitHub, app.js, HTML, or any browser code.

When sandbox testing is complete:

- replace sandbox credentials with live credentials
- set PAYPAL_ENV=live
- put the public live Client ID in app.js
- keep DEMO_MODE enabled until real inventory is loaded and final checkout tests pass

## Inventory

The storefront now checks the secure catalog API. If there are no active database products, it continues to show demo listings.

When real inventory is added to collectables_products, it can automatically replace the demo catalog without a storefront rewrite.

## Launch sequence

1. Add real inventory and photos
2. Add PayPal sandbox secrets
3. Test create/capture flow
4. Confirm shipping and returns wording
5. Test mobile, desktop, cart, sold-out behavior and confirmation
6. Add live PayPal credentials
7. Disable demo mode only after the final test order


## Source-controlled database recovery

The currently applied Collectables database foundation is recorded under:

- `supabase/migrations/20260922150418_collectables_secure_checkout_foundation.sql`
- `supabase/migrations/20260922152210_collectables_catalog_and_cleanup.sql`

These files are the schema/RPC recovery reference for the checkout foundation. Real order and inventory data still lives in Supabase and must never be committed to Git.

See [DATA-RECOVERY.md](DATA-RECOVERY.md) and [RELEASE-READINESS.md](RELEASE-READINESS.md) before enabling real payments.


## Checkout regression test

A rollback-safe database regression is stored at:

`supabase/tests/order-flow-regression.sql`

It covers empty-cart rejection, single/sealed/free shipping totals, one-copy oversell protection, cancellation release, capture amount mismatch safety, successful stock deduction, idempotent finalisation and reservation expiry.

The test uses synthetic products inside a transaction and ends with `rollback`, so no test inventory/orders remain behind.


## Edge Function source control

The current intended Edge Function source is now versioned in Git:

- `supabase/functions/collectables-create-order/index.ts`
- `supabase/functions/collectables-capture-order/index.ts`
- `supabase/functions/collectables-catalog/index.ts`

The source-controlled versions use exact production-origin matching, allow `localhost` / `127.0.0.1` for local sandbox testing, and send `Cache-Control: no-store`.

Deployment status checked 25 September 2026:
- `collectables-create-order`: hardened version deployed live (version 3).
- `collectables-capture-order`: hardened Git copy exists; live redeploy is still pending because the current connector blocked the deployment action.
- `collectables-catalog`: hardened Git copy exists; live redeploy is still pending because the current connector blocked the deployment action.

Do not treat the pending two functions as aligned with Git until their live source has been rechecked after redeployment.
