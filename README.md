# Moheen Mahmood — V8.2 Flat GitHub Upload Edition

This version avoids nested folders completely so GitHub's browser uploader cannot flatten or rename files incorrectly.

## Upload every file in this ZIP directly to the root of `main`

Expected root layout:

- index.html
- journal.html
- market-radar.html
- article-ai-interface.html
- article-good-businesses.html
- article-infrastructure.html
- article-living-portfolio.html
- article-weekly-notes.html
- article-ai-infrastructure.html
- article-market-noise.html
- article-agents-interface.html
- style.css
- script.js
- favicon.svg
- 404.html
- hero-cinematic-clean.jpg
- astronaut-clean-hd.jpg
- README.md

## Important cleanup on GitHub

After V8.2 is working, delete any accidental duplicates or old flattened files such as:
- index (1).html
- agents-interface.html
- ai-infrastructure.html
- ai-interface.html
- good-businesses.html
- infrastructure.html
- living-portfolio.html
- market-noise.html

Those old names are no longer used by V8.2.

GitHub Pages stays on:
- branch: main
- folder: / (root)

After deployment, hard refresh with Ctrl + F5.
