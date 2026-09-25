# Slime's Collectables — Final QA Checklist

Use this immediately before PayPal sandbox sign-off and again immediately before live launch.

## Desktop

Test at approximately:
- 1440 × 900
- 1280 × 720
- 1024 × 768

Check:
- header/logo/navigation do not overlap;
- hero logo remains unobstructed;
- Yu-Gi-Oh! and Pokémon hero cards stay within the layout;
- category filters, search and sort work;
- product cards align without clipped names/prices/buttons;
- View details opens and closes correctly;
- basket opens, totals correctly and closes;
- footer policy/contact links work.

## Mobile

Test at approximately:
- 390 × 844
- 360 × 800
- 320 × 568 if practical

Check:
- no horizontal page overflow;
- menu and mobile search are usable;
- touch targets are comfortable;
- hero remains readable;
- product images are fully visible;
- product detail dialog is scrollable;
- basket fits the viewport and can be closed;
- long names/set text do not cover buttons;
- keyboard does not permanently hide an important control after search input.

## Keyboard

Without a mouse:
1. Tab from the top of the page.
2. Verify the skip link is visible when focused.
3. Reach navigation, search, filters, sort and product actions.
4. Open a product detail dialog and close with Escape.
5. Confirm focus returns to the View details button.
6. Open the basket.
7. Confirm focus moves to the close button.
8. Close with Escape.
9. Confirm focus returns to the element that opened the basket.
10. During sandbox checkout, confirm PayPal controls can be reached and operated.

## Failure states

Verify:
- a broken product image shows the built-in fallback;
- zero-stock products say Sold out and cannot be added;
- empty search/filter result shows a clear no-results message;
- in demo mode, catalog API failure keeps the preview visible and checkout locked;
- in live mode, catalog API failure shows Shop temporarily unavailable instead of demo stock;
- PayPal failure never marks an order paid;
- capture ambiguity tells the buyer not to retry repeatedly.

## Motion/accessibility

- enable Reduce Motion at OS/browser level and confirm animations/transitions are effectively disabled;
- verify visible focus indicators throughout;
- verify text remains readable at 200% browser zoom;
- check that buttons/controls are at least roughly 44px tall;
- verify product images have meaningful alt text once real inventory is loaded.

## Content before launch

- every live item is physically present;
- every single/slab/sealed listing uses the exact-item photo;
- condition/grade and card/set number are verified;
- price is the intended selling price, not a temporary market-guide placeholder;
- stock quantity is correct;
- preview badges/wording are removed automatically for live catalogue items;
- preview robots noindex tags are removed during live cutover.

## Checkout before launch

- complete PayPal sandbox approval/capture;
- test cancellation;
- test failed payment;
- test expired reservation;
- test last-copy item;
- verify the paid order number;
- verify stock decrements once;
- verify shipping amount;
- verify confirmation text;
- verify the order can be found for fulfilment.

_Record any failure before launch rather than accepting it as a known issue._
