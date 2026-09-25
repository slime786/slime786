# Slime's Collectables

A personal UK Yu-Gi-Oh! and Pokémon TCG storefront for singles, sealed products, graded cards and small collector bundles.

## Current state

The public site is a catalogue preview. Demo products and market-guide prices are intentionally labelled as preview stock until the real collection is imported.

Already built:
- responsive storefront and category/search filters
- secure Supabase product catalogue
- protected order, order-item and stock-reservation tables
- server-side price validation
- 30-minute stock reservations
- sold-out handling
- PayPal create/capture Edge Functions
- shipping rules for singles, sealed products and £100+ orders
- rollback-safe checkout regression coverage

## Before accepting real payments

1. Load verified real inventory into `collectables_products`.
2. Use photos of the exact singles/slabs/sealed items being sold.
3. Confirm condition notes, prices and stock quantities.
4. Add PayPal **sandbox** credentials as Supabase Edge Function secrets.
5. Complete a full sandbox purchase from basket through capture/confirmation.
6. Re-check shipping, returns, packing and refund handling.
7. Run the recovery verification and final mobile/desktop walkthrough.
8. Add live PayPal credentials only after sandbox QA passes.
9. Set `DEMO_MODE` to `false` only when the store is deliberately ready to accept orders.

Do not put the PayPal Client Secret in GitHub or browser code.

## Documentation

- [Backend](BACKEND.md)
- [Release readiness](RELEASE-READINESS.md)
- [Data recovery](DATA-RECOVERY.md)
- [Launch runbook](LAUNCH-RUNBOOK.md)
- [Fulfilment guide](FULFILMENT.md)
- [Data retention & deletion](DATA-RETENTION.md)
- [Shipping & returns](shipping-returns.html)
- [Condition guide](condition-guide.html)

The canonical live store is published from this repository under `collectables/`.
