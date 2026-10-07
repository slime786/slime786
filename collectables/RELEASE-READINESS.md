# Slime's Collectables — Release Readiness

Current stage: **Demo storefront / not ready for real payments**

This is the canonical live storefront checklist. The live code is in `slime786/slime786/collectables/`.

## Inventory
- [ ] Load real products into the secure catalog
- [ ] Use photos of the exact item being sold
- [ ] Verify condition notes and grading details
- [ ] Verify stock quantities
- [ ] Confirm sealed/singles category and shipping class
- [ ] Confirm sold-out behaviour with real database stock

## Checkout
- [x] Secure backend scaffold exists
- [x] Edge Functions are source-controlled for recovery
- [x] Hardened create/capture/catalog Edge Functions are deployed and verified byte-for-byte against Git
- [x] Browser-side real payments remain disabled
- [ ] Add PayPal sandbox credentials to Supabase secrets
- [ ] Test server-side create/capture flow
- [x] Test stock reservation expiry at database/RPC level
- [x] Test concurrent-order / last-item behaviour at database/RPC level
- [x] Test cancellation release, failed capture amount and idempotent finalisation at database/RPC level
- [ ] Test cancelled and failed payment paths through PayPal sandbox
- [ ] Test final paid-order confirmation
- [ ] Move to live credentials only after sandbox QA is complete

## Fulfilment
- [x] Re-check UK shipping prices and thresholds against current Royal Mail tracked pricing
- [x] Re-check returns wording against current UK distance-selling guidance
- [x] Define packing process for singles, graded and sealed products
- [x] Define refund/cancellation handling
- [x] Define what happens if physical stock cannot be located

## UX & accessibility
- [ ] Desktop walkthrough
- [ ] Small-screen/mobile walkthrough
- [ ] Keyboard-only checkout walkthrough
- [x] Focus and minimum touch-target safeguards implemented
- [ ] Final visual contrast review
- [x] Broken-image/no-stock/network-error states
- [x] Reduced-motion safeguards present on the splash and shop

## Data & recovery
- [x] Orders/reservations are server-side and protected
- [x] Recovery guidance exists in `DATA-RECOVERY.md`
- [ ] Rehearse a test restore before live payments
- [x] Define working order/customer retention and deletion rules (exact accounting period still requires seller-status confirmation)

## Cost gate
Do not pay for extra commerce services, monitoring, premium hosting or other tooling while the store remains in demo mode. Real payment processing should only be enabled after real inventory, fulfilment and sandbox checkout are ready.

_Last reviewed: 7 October 2026._


## Launch procedure
The exact sandbox, cutover and rollback sequence is documented in [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md).


## Operational guides
- [Fulfilment guide](FULFILMENT.md)
- [Data retention & deletion](DATA-RETENTION.md)


## Final QA
Use [QA-CHECKLIST.md](QA-CHECKLIST.md) for the final desktop, mobile, keyboard and checkout walkthrough.

## 2026-10-07 live readiness snapshot

Current production database state:
- 0 catalogue products;
- 0 active products;
- 0 active stock units;
- 0 orders;
- 0 active reservations;
- 0 PayPal webhook events.

Public launch controls remain correctly closed in source:
- `DEMO_MODE=true`;
- browser `PAYPAL_CLIENT_ID` is empty;
- storefront remains `noindex,follow`.

Do not begin payment rehearsal or enable order/capture switches until verified real inventory is loaded and PayPal sandbox credentials are configured. The current blocker is operational readiness, not checkout architecture.

## 2026-10-04 hardening status

Implemented in source and deployed backend:
- server-side new-order and capture kill switches;
- checkout fingerprint rate limiting;
- atomic PayPal-order attachment and pre-capture state transition;
- `capturing` / `review` order states that prevent reservation expiry during capture;
- UK shipping-country validation before browser-driven capture;
- verified PayPal webhook reconciliation with replay tracking;
- reduced PayPal-response retention instead of storing the full response body;
- idempotent transactional order-confirmation support;
- seller identity/address/contact launch gate;
- public seller-info endpoint that keeps the postal address out of Git;
- cart DOM-XSS sink removed;
- improved keyboard/focus and filter/search accessibility state;
- CI enforcement for Edge Function safeguards and Deno type checks;
- expanded SQL regression/recovery tests.

Remaining launch blockers are operational rather than hidden code toggles: real catalogue/stock, exact seller postal details, verified mail sender, PayPal live credentials/webhook registration, and final end-to-end sandbox/live rehearsal. Keep `DEMO_MODE=true`, `COLLECTABLES_NEW_ORDERS_ENABLED=false`, and public indexing disabled until those are complete.

