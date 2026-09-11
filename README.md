# Moheen Mahmood — V8.6 Mobile + Production Polish

## Mobile
- hamburger navigation below 900px
- mobile-safe ticker sizing
- astronaut hero repositioned for phones
- stacked live market cards
- all major grids collapse cleanly
- mobile-sized game HUD/canvas
- touch-friendly social/contact controls

## Social sharing
Open Graph + Twitter Card metadata use:
https://slime786.github.io/slime786/hero-moheen-astronaut.jpg

## Accessibility
- skip-to-content link
- keyboard focus states
- Escape closes mobile navigation
- reduced-motion fallback
- aria-current on current page
- safer external-link rel attributes

## Performance
- hero preload with high fetch priority
- lazy/async astronaut image
- content-visibility for below-fold sections where supported

## Analytics
A privacy-friendly analytics hook is included but OFF by default.
No visitor data is transmitted unless you explicitly set:
window.MM_ANALYTICS_ENDPOINT = "https://your-provider-endpoint";

That hook can send pageviews and link clicks without cookies or fingerprinting.
For a real dashboard, connect a provider later (Plausible, Simple Analytics, Cloudflare Web Analytics, GoatCounter, Google Analytics, etc.).

Upload all files directly to the root of `main`.
