# Slime's Collectables Android wrapper

A minimal Android WebView shell for the production storefront:

https://slime786.github.io/slime786/collectables/

## Design

- The website remains the single source of truth.
- Only HTTPS pages under the Collectables path stay inside the app.
- External links open in the user's default browser/app.
- Cleartext HTTP is disabled.
- SSL errors are cancelled rather than bypassed.
- File/content access from the WebView is disabled.
- JavaScript and DOM storage are enabled because the storefront requires them.

## Build

The GitHub Actions workflow `.github/workflows/collectables-android-apk.yml`
builds a signed debug APK suitable for sideload testing.

This is not a Play Store production release. A Play release should use a private
release keystore, Play App Signing, release versioning, store listing assets,
privacy declarations and a tested payment flow.
