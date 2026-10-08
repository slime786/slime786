# Slime's Collectables Design System

This document defines the visual and interaction contract for the Collectables storefront.

## Design principles

1. **Preserve the collector identity.** The storefront stays recognisably Slime's Collectables: dark base, slime green, Pokémon/Yu-Gi-Oh! visual contrast, collector-led language, and the existing logo/artwork.
2. **Premium through restraint.** Glow, colour and motion are accents rather than decoration on every surface.
3. **Product imagery leads.** The UI should frame cards and sealed products, not compete with them.
4. **One interaction grammar.** Buttons, pills, cards, drawers, dialogs, forms and focus states use the same geometry and motion.
5. **Mobile is first-class.** Dense catalogue information collapses deliberately rather than merely shrinking.
6. **Accessibility is non-negotiable.** Keyboard focus, reduced motion, readable contrast, minimum target sizes and semantic state remain part of the design system.

## Architecture

The storefront uses two CSS layers:

- `styles.css` — legacy/base component styles and structural behaviour.
- `design-system.css` — semantic tokens and the current refinement layer.

The splash page uses:

- inline legacy/base splash styles in `index.html`.
- `splash-system.css` — the current refinement layer.

New visual work should prefer semantic variables and selectors in the design-system files rather than adding another round of hard-coded values to the base stylesheet.

## Core tokens

### Brand colours

- `--sc-bg-0` — deepest page background.
- `--sc-bg-1` — primary storefront background.
- `--sc-surface-1/2/3` — elevated surfaces.
- `--sc-text` — primary text.
- `--sc-text-soft` — secondary readable text.
- `--sc-muted` — tertiary/supporting text.
- `--sc-line` — default border.
- `--sc-line-strong` — interactive/emphasised border.
- `--sc-green` — primary Slime accent.
- `--sc-green-strong` — stronger CTA accent.

Pokémon, Yu-Gi-Oh!, gold, red, blue and violet accents may be used for category identity, but green remains the product-level action colour.

### Radius

- Small: 10px.
- Medium: 14px.
- Large: 18px.
- XL: 24px.
- 2XL: 30px.
- Pill: 999px.

### Motion

- Fast: 150ms.
- Medium: 220ms.
- Slow: 360ms.
- Default easing: `cubic-bezier(.2,.8,.2,1)`.

Avoid continuous animation for functional controls. Honour `prefers-reduced-motion`.

### Layout

- Storefront shell: max 1380px.
- Content column: max 1240px.
- Desktop catalogue: multi-column product grid.
- Mobile catalogue: two columns down to very narrow screens, then one column.

## Component standards

### Header

- Sticky, glass-like surface.
- Existing Slime's Collectables logo remains unchanged.
- Search, navigation, basket and mobile menu retain current behaviour.
- Header chrome should remain visually quieter than the hero.

### Hero

- Keep the Pokémon/Yu-Gi-Oh! split and existing collector imagery.
- Central message and logo remain the primary hierarchy.
- Avoid adding unrelated illustration styles or generic SaaS visual language.
- Hero motion is subtle and optional.

### Category cards

- Category colour supports recognition.
- Consistent card radius, padding and hover lift.
- Text remains readable without relying on colour alone.

### Product cards

- Product image is the dominant area.
- Product metadata should not compete with price/title.
- Keep exactly two primary actions at most.
- On mobile, notes may collapse before title/price/actions.

### Filters

- Selected state uses Slime green.
- Mobile filter rows scroll horizontally instead of wrapping into excessive height.
- Sorting and condition controls use the same field geometry.

### Drawer and dialog

- One overlay/elevation model.
- Keyboard focus remains trapped where appropriate.
- Escape/cancel behaviour remains supported.
- Important payment or stock states must not be communicated through colour alone.

### Policy pages

Policy, contact and cancellation pages use the same type scale, surfaces, borders and spacing as the storefront. They should feel like part of the product, not detached legal documents.

## Do not

- Replace the current Slime's Collectables logo without explicit approval.
- Remove Pokémon/Yu-Gi-Oh! visual identity from the storefront.
- Introduce generic blue SaaS gradients or white-dashboard styling.
- Add one-off hard-coded colours/radii when a semantic token exists.
- Add animation that blocks interaction or ignores reduced-motion preferences.
- Change payment/checkout behaviour as part of a visual-only task.

## Review checklist

Before merging visual changes:

- Desktop and mobile layouts reviewed.
- No horizontal page overflow.
- Keyboard focus visible.
- Reduced-motion mode usable.
- Product cards remain readable at 320px viewport width.
- Existing smoke tests pass.
- Payment/security code unchanged unless the PR explicitly targets those systems.
- Existing logo and core brand artwork preserved unless explicitly approved.
