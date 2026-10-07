# SLIME786 Portfolio — Release Readiness

Current stage: **Live portfolio / continuously maintained**

This checklist covers the public portfolio shell. Product-specific readiness lives in each product repository; Slime's Collectables has its own checklist under `collectables/RELEASE-READINESS.md`.

## Public site
- [x] GitHub Pages deployment works
- [x] Core portfolio smoke tests exist
- [x] Repository index and release plan are published
- [ ] Final mobile pass across the main portfolio, Journal, Arcade and Market Radar
- [x] Keyboard focus trapping/restoration and Escape handling implemented for primary navigation and command palette\n- [ ] Final manual keyboard-only walkthrough across primary navigation and command palette
- [ ] Check contrast/focus/reduced-motion on retained legacy pages
- [ ] Confirm all public contact/social links are current

## Content
- [ ] Review project statuses against the individual repositories before major public updates
- [x] Review article metadata/canonical links
- [ ] Remove or redirect a public page only when there is a deliberate URL plan

## Slime's Collectables
- [x] Canonical live storefront is under `collectables/`
- [x] Backend/recovery/readiness documentation is now in the canonical folder
- [x] Applied database migrations are recorded in source control
- [ ] Complete the Collectables-specific release checklist before enabling real payments

## Release hygiene
- [x] Proprietary repository notice exists
- [x] Account-wide free-first release plan exists
- [x] Accessibility, canonical metadata, Supabase source layout and keyboard interaction safeguards are checked in CI
- [ ] Capture final portfolio screenshots only after the design settles
- [ ] Keep a tested rollback path for meaningful visual/site changes

_Last reviewed: 7 October 2026._
