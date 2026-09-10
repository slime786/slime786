# Moheen Mahmood — V8.1 GitHub Pages Path Fix

This version fixes the unstyled Journal / raw HTML problem seen on:
`https://slime786.github.io/slime786/`

## What was wrong
Pages inside `/journal/` and `/articles/` were using relative asset paths such as:
- `../style.css`
- `../script.js`

Depending on how GitHub uploaded/preserved the folder structure, those subpages could resolve incorrectly and load without CSS.

## What V8.1 changes
All subpages now use explicit GitHub Pages project-root paths:

- `/slime786/style.css`
- `/slime786/script.js`
- `/slime786/favicon.svg`
- `/slime786/journal/`
- `/slime786/articles/...`
- `/slime786/market-radar.html`

This is tailored to your current GitHub Pages project URL:
`https://slime786.github.io/slime786/`

## Upload instructions
Upload/replace EVERYTHING in this ZIP on the `main` branch.

Keep these folders intact:
- `articles/`
- `journal/`

Your root should contain:
- `index.html`
- `style.css`
- `script.js`
- `market-radar.html`
- `404.html`
- `favicon.svg`
- `hero-cinematic-clean.jpg`
- `astronaut-clean-hd.jpg`
- `README.md`
- `articles/`
- `journal/`

After GitHub Pages finishes redeploying:
1. Open the homepage.
2. Press Ctrl + F5.
3. Open Journal.
4. Open one article.
5. Open Market Radar.
6. Test Ctrl + K.

## Future custom domain
When you move to a custom domain later, these `/slime786/...` paths should be changed to root `/...` paths. Do that at the same time as the custom-domain migration.
