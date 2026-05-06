# Lumorix Android Release Plan

Lumorix 0.7.0 introduces a split release model:

- Desktop remains on the existing launcher catalog and update flow.
- Android uses separate package identifiers, manifests, and a dedicated catalog lane.

## Current lanes

- Desktop launcher update manifest: `distribution/latest.json`
- Android launcher update manifest: `distribution/latest-android.json`
- Desktop content catalog: `distribution/manifests/catalog.json`
- Android content catalog: `distribution/manifests/catalog.android.json`
- Desktop DropDash manifest: `distribution/manifests/games/lumorix-dropdash.json`
- Android DropDash manifest: `distribution/manifests/games/lumorix-dropdash-android.json`

## Build targets

- Launcher desktop: `npm run tauri:build`
- Launcher Android: `npm run tauri:android:build`
- Launcher Android (guarded script): `scripts/build-launcher-android.ps1`
- DropDash desktop: `distribution/games/lumorix-dropdash/build-tauri.ps1`
- DropDash Android: `distribution/games/lumorix-dropdash/build-android.ps1`

## One-click release commands

- DropDash Android manifest + catalog lane update:
	`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release-dropdash-android.ps1 -Version 2.0.0-alpha.1 -BuildFirst`
- Launcher Android updater lane update:
	`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release-launcher-android.ps1 -Version 0.7.0-android-alpha.1`

NPM aliases are available as well:

- `npm run release:dropdash:android -- -Version 2.0.0-alpha.1 -BuildFirst`
- `npm run release:launcher:android -- -Version 0.7.0-android-alpha.1`

## Fully automated CI release

Tag push is enough to trigger Android APK generation in CI:

- `git add .`
- `git commit -m "v0.7.0"`
- `git tag v0.7.0`
- `git push origin main --tags`

What CI does automatically on tag push:

- builds Windows release lane (existing flow)
- builds Android launcher APK
- uploads APK as release asset
- rewrites `distribution/latest-android.json` in the release artifact with:
	- `platforms.android-aarch64.url` pointing to the generated APK asset URL
	- `platforms.android-aarch64.signature` set to APK SHA-256

## Website linking

Use this file as the single source for website links:

- `distribution/release-links.json`

Android launcher update lane is controlled by:

- `distribution/latest-android.json`

If your website should link Android launcher updates, use `latest-android.json`.
If your website should link Android game downloads, use `release-links.json.android.dropdashApk`.

## After upload: fields to update

After uploading a new Android launcher package/signature:

- `distribution/latest-android.json`
	- `platforms.android-aarch64.url`
	- `platforms.android-aarch64.signature`

After uploading a new DropDash Android APK:

- `distribution/release-config/games/lumorix-dropdash-android.json`
	- `version`
	- `releaseDate`
	- optional `description`

Then run:

- `npm run release:dropdash:android -- -Version <new-version>`

This updates:

- `distribution/manifests/games/lumorix-dropdash-android.json`
- `distribution/manifests/catalog.android.json`

## Required Android machine setup

The Android build lane requires local tooling that is not needed for desktop:

- Android Studio
- Android SDK Platform and Platform-Tools
- Android NDK
- `ANDROID_HOME`
- `NDK_HOME`
- Rust Android targets via `rustup`

## Release rule

Desktop manifests must continue to default to `platform: desktop` and keep their existing archive URLs so current launcher users see no behavior change.

Desktop catalog must not include Android-only manifests. Android content stays in `catalog.android.json` so desktop users do not see mobile-only entries.