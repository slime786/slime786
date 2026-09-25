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
- [ ] Re-check UK shipping prices and thresholds
- [ ] Re-check returns wording
- [ ] Define packing process for singles vs sealed
- [ ] Define refund/cancellation handling
- [ ] Define what happens if physical stock cannot be located

## UX & accessibility
- [ ] Desktop walkthrough
- [ ] Small-screen/mobile walkthrough
- [ ] Keyboard-only checkout walkthrough
- [ ] Focus/contrast/touch-target review
- [x] Broken-image/no-stock/network-error states
- [x] Reduced-motion safeguards present on the splash and shop

## Data & recovery
- [x] Orders/reservations are server-side and protected
- [x] Recovery guidance exists in `DATA-RECOVERY.md`
- [ ] Rehearse a test restore before live payments
- [ ] Define order/customer retention and deletion rules

## Cost gate
Do not pay for extra commerce services, monitoring, premium hosting or other tooling while the store remains in demo mode. Real payment processing should only be enabled after real inventory, fulfilment and sandbox checkout are ready.

_Last reviewed: 25 September 2026._


## Launch procedure
The exact sandbox, cutover and rollback sequence is documented in [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md).
