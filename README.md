# V10 — QUIET ORBIT / Quiet Command

A deliberate reduction of V9.3.1.

## What changed
- drastically simplified homepage and navigation
- removed duplicate/repetitive homepage sections
- preserved Journal, Market Radar, Project 001 and all three Arcade games as dedicated destinations
- moved Arcade to `arcade.html`
- added a minimal command menu (Cmd/Ctrl + K)
- stronger whitespace, typography and visual hierarchy
- subtle astronaut parallax instead of extra widgets/animations
- live dock for London time, BTC, ETH and GitHub activity
- automatic high-signal technology story
- local caching so live information can show the last successful value when an API is temporarily unavailable
- automated Journal indexing from article files
- automated sitemap generation and internal-link validation
- GitHub Actions workflow for site maintenance
- mobile-first navigation and reduced-motion support

## Automation
The site automatically refreshes:
- London time: every second
- BTC/ETH: every minute
- GitHub public activity: every 3 minutes
- technology high-signal story: every 5 minutes
- Journal index and sitemap: rebuilt by GitHub Actions after pushes and checked weekly

Personal journal/project opinions are intentionally **not auto-written**. They remain reviewed/published by Moheen so the site does not present machine-generated opinions as personal authorship.

## Rollback
See `ROLLBACK.md`. A separate V9.3.1 backup ZIP is provided alongside this release.

Upload the entire extracted V10 folder contents to the root of `main`, including `.github`, `data`, and `tools`.
