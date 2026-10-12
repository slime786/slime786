# SLIME786 Android wrapper

A lightweight Android WebView wrapper for the live SLIME786 GitHub Pages site.

- App ID: `com.slime786.app`
- Home: https://slime786.github.io/slime786/
- Minimum Android: 7.0 (API 24)
- External links open in the device browser/app.
- Cleartext HTTP traffic is disabled.
- No credentials or production secrets are embedded in the APK.

Build locally with a compatible Android SDK and Gradle:

```bash
gradle -p android assembleDebug
```

The installable debug APK is written to:

`android/app/build/outputs/apk/debug/app-debug.apk`
