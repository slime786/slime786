# Collectables payment rehearsal: controlled test matrix

**Current state:** the public shop is a preview; verified inventory and a full sandbox configuration are not established. This rehearsal must run **only after** those prerequisites have been confirmed. There is no authorisation to enable real payment acceptance.

## Safe preparation

1. Run `node collectables/sandbox-preflight.mjs` and `node tests/commerce-rehearsal-guards.mjs`. Passing checks demonstrate *fail-closed configuration*, not successful PayPal processing.
2. Verify database test product is synthetic, explicitly marked as test inventory, is never publicly advertised, and can be isolated/reverted without affecting real stock. Follow `collectables/LAUNCH-RUNBOOK.md` for exact inventory acceptance requirements.
3. Confirm sandbox business/buyer accounts, server-only sandbox Client ID/secret, webhook ID, test email configuration and operational switches **without printing or committing any secret**.
4. Serve `collectables/shop.html` on localhost, never switch the production GitHub Pages storefront out of demo mode.
5. Enable new-order/capture gates only in an isolated sandbox backend or a tightly controlled test window, never as an unreviewed production launch step. First validate that the webhook endpoint uses the PayPal sandbox signing key.
6. Never use real personal/payment card data in tests. Scrub test buyer PII from logs and report.

## Test matrix (record actual evidence before marking any row passed)

| Scenario | Required evidence |
| --- | --- |
| Inventory loads | Catalog API includes only approved synthetic inventory and correct available stock |
| Create order | Server returns a sandbox PayPal order ID and database reservation with exact GBP totals |
| Approved capture | Sandbox PayPal status COMPLETED; local order paid; inventory decremented exactly once |
| Duplicate capture | Retry returns same order outcome; no second decrement or confirmation email |
| Webhook replay | Verified duplicate webhook acknowledged idempotently; no double fulfillment |
| Invalid webhook | Signature rejected; no database transitions |
| Amount/currency mismatch | Capture rejected or routed for manual review; no false paid state |
| Non-GB shipping | Checkout refused according to UK-only policy |
| Buyer cancellation | Reservation released or expires; stock restored |
| Payment pending/denied | State remains non-fulfillable pending review or confirmed denial |
| Email receipt | A single sandbox receipt delivered with correct buyer, seller and cancellation information |
| Network outage | Recoverable state with no double charge or duplicate reservation |

## Exit criteria

Do not enable live checkout until the sandbox run has evidence for all critical rows, `collectables/supabase/tests/order-flow-regression.sql` passes, and a human reviews product photography, prices, shipping/returns, support email, and PayPal seller verification. Rollback uses **`COLLECTABLES_NEW_ORDERS_ENABLED=false` first**, then deliberate capture/reconciliation handling.

Keep `DEMO_MODE=true` and production `noindex,follow` during this work.
