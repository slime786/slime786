# Responsive visual QA

The `Responsive visual QA` workflow captures screenshots on a simulated **390 px mobile** and **1440 px desktop** viewport for the live portfolio, Journal, Market Radar, Arcade, Collectables preview/splash and case study. It also checks horizontal overflow at **320, 390, 768 and 1440 px**, verifies the homepage mobile menu keyboard interaction and ensures the Collectables demo does not initiate payment.

Screenshots are uploaded as a GitHub Actions artifact named `responsive-qa-evidence`. Review them before accepting visual changes. They are **review evidence**, not yet approved pixel-baseline comparisons. Screenshots are not committed, so changing copy/images does not generate fragile binary diffs.

Run locally with `npm install --no-save --package-lock=false @playwright/test@1.56.1`, `npx playwright install chromium`, then `npx playwright test --config=playwright.config.mjs`.

The local server emulates the GitHub Pages `/slime786/` route. Avoid using real customer accounts, stock, PayPal credentials or live orders during this pass.
