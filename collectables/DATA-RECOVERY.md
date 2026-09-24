# Slime's Collectables — Data Recovery

The canonical storefront lives in this repository under `collectables/`. Checkout/inventory data currently lives in the shared SLIME786 Supabase project.

## Backend data

Current Collectables tables include products, orders, order items and stock reservations. Secure checkout behaviour is implemented server-side through Supabase functions/RPCs.

## Before live payments

- keep the current database structure documented/versioned;
- load only verified real inventory;
- rehearse a restore into a separate test project before accepting real orders;
- test expired reservations and sold-out recovery;
- verify paid-order finalisation remains idempotent;
- document refund/cancellation handling;
- define order/customer retention and deletion rules.

## Shared-project warning

Collectables shares its current Supabase project with other prototypes. Never reset or restore the entire shared project solely for Collectables.

## What Git can recover

Git can recover the storefront code and documentation. It cannot recover real orders, inventory changes or reservations that exist only in the live database.

## Free-first rule

No paid backup service is needed while the store is in demo mode. Revisit managed backup requirements immediately before enabling real payments and loading valuable inventory/order data.

_Last reviewed: 24 September 2026._
