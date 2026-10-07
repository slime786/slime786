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

The currently applied Collectables database migrations are recorded under:

- `supabase/migrations/20260922150418_collectables_secure_checkout_foundation.sql`
- `supabase/migrations/20260922152210_collectables_catalog_and_cleanup.sql`
- `supabase/migrations/20261004091955_collectables_checkout_hardening.sql`

These files were restored directly from the live Supabase migration ledger and are the schema/RPC recovery reference for the current checkout foundation. Real order and inventory data still lives in Supabase and must never be committed to Git.

See [DATA-RECOVERY.md](DATA-RECOVERY.md) and [RELEASE-READINESS.md](RELEASE-READINESS.md) before enabling real payments.


## Checkout regression test

The documentation previously referenced `supabase/tests/order-flow-regression.sql`, but that file is not currently present in the repository.

Until it is restored and re-run against the current hardening migration, treat SQL regression coverage as a recovery gap rather than a source-controlled guarantee. The intended coverage remains: empty-cart rejection, single/sealed/free-shipping totals, one-copy oversell protection, cancellation release, capture amount mismatch safety, successful stock deduction, idempotent finalisation and reservation expiry.


## Edge Function source control

The deployed Collectables Edge Function source is versioned in Git:

- `supabase/functions/collectables-create-order/index.ts`
- `supabase/functions/collectables-capture-order/index.ts`
- `supabase/functions/collectables-catalog/index.ts`
- `supabase/functions/collectables-paypal-webhook/index.ts`
- `supabase/functions/collectables-public-info/index.ts`

Per-function authentication settings are recorded in `supabase/config.toml`. These five endpoints intentionally use `verify_jwt=false` because they are public browser/webhook endpoints with their own origin, signature, launch-gate and server-side authorization controls.

Deployment status verified 7 October 2026:
- `collectables-create-order`: live version 4 matches Git exactly.
- `collectables-capture-order`: live version 3 matches Git exactly.
- `collectables-catalog`: live version 3 matches Git exactly.
- `collectables-paypal-webhook`: live version 1 matches Git exactly.
- `collectables-public-info`: live version 1 matches Git exactly.

Re-check live source against Git after any future Edge Function deployment before treating production as aligned.

## Checkout hardening additions

The Collectables backend now uses an explicit state boundary around PayPal capture:

`reserved -> paypal_created -> capturing -> paid`

Ambiguous or externally pending payment outcomes move to `review`; confirmed capture denial moves to `failed`. Only `reserved` and `paypal_created` orders are eligible for automatic reservation expiry/release. A `capturing` order extends its active reservation before contacting PayPal so a completed capture cannot race the normal expiry job.

New supporting objects:
- `collectables_checkout_rate_limits` — short-lived hashed client-fingerprint counters;
- `collectables_paypal_webhook_events` — verified PayPal webhook replay/outcome tracking;
- `collectables_attach_paypal_order(...)` — atomic transition from local reservation to PayPal-created state;
- `collectables_begin_capture(...)` — validates state/reservation consistency and extends the hold;
- `collectables_mark_order_review(...)` and `collectables_mark_capture_failed(...)`.

The browser is never authoritative for price, stock, delivery, payment state, or launch availability. New-order and capture availability are controlled by Edge Function environment switches. Direct table and RPC access remains revoked from `anon` and `authenticated`; the Edge Functions use the service role internally.

PayPal webhook reconciliation is intentionally independent from the browser callback. A verified `PAYMENT.CAPTURE.COMPLETED` event can finalize an order that was charged at PayPal but interrupted before browser finalization. Pending/denied events are routed to safe states rather than being treated as successful.

For live commerce, order creation/capture also requires configured public seller details and transactional email. Confirmation messages are idempotent and record only the provider email ID/status in the order row.

