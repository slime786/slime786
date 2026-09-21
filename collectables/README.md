# Slime's Collectables

A personal Yu-Gi-Oh! and Pokémon TCG storefront for singles and sealed items.

## Categories
- Yu-Gi-Oh! singles
- Pokémon singles
- Yu-Gi-Oh! sealed
- Pokémon sealed

The site is designed so additional categories can be added later.

## Before accepting payments
1. Replace all demo inventory in `app.js` with real stock.
2. Replace placeholder images with photos of the exact item being sold.
3. Confirm condition notes and stock quantities.
4. Decide UK shipping rates/rules, especially for sealed items and higher-value orders.
5. Create a PayPal app and add the client ID to `PAYPAL_CLIENT_ID` in `app.js`.
6. Set `DEMO_MODE` to `false` only when you are ready to accept orders.
7. Add a proper order-confirmation/fulfilment backend before relying on the shop for live sales.

## GitHub Pages
This is a static site and can be published directly with GitHub Pages.
