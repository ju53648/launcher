# Lumorix Launcher

Professional local-first Windows game launcher foundation built with Tauri, Rust, React and TypeScript.

## Technical Target Architecture

Lumorix is split into a thin React UI and a Rust desktop core. The UI owns navigation, interaction states and visual feedback. The Rust side owns filesystem access, install safety, local config, manifests, downloads, verification, process launching and logs.

Primary modules:

- `src/`: React, TypeScript, design system and launcher state provider.
- `src-tauri/src/models.rs`: shared domain models serialized to the UI.
- `src-tauri/src/storage.rs`: local JSON config, installed game database, logs and snapshots.
- `src-tauri/src/libraries.rs`: library folder creation, probing, default selection and removal rules.
- `src-tauri/src/manifest.rs`: embedded and local manifest loading plus validation.
- `src-tauri/src/installer.rs`: job-based install, update, repair, verification and uninstall pipeline.
- `src-tauri/src/launcher_update.rs`: explicit launcher update checks through a remote release manifest.
- `src-tauri/src/process.rs`: game launch and install folder opening.

The initial distribution decision is GitHub Releases plus JSON manifests. The source is represented as config, so a later CDN or own backend can replace the URL without changing the UI.

## Project Structure

```text
Lumorix Launcher/
  src/
    components/          Reusable launcher UI components
    domain/              TypeScript domain types and formatting helpers
    services/            Tauri command bridge and browser mock fallback
    store/               Launcher state provider and actions
    styles/              Design tokens, global styles and components
    views/               Onboarding, Home, Library, Detail, Downloads, Settings, About
  src-tauri/
    capabilities/        Tauri v2 permission capability
    manifests/           Optional embedded v1 game manifests
    src/                 Rust desktop core
    tauri.conf.json      Tauri application config
  public/assets/games/   Local cover, banner and icon artwork
  distribution/          Example external manifests and launcher update manifest
  docs/                  Architecture, privacy and manifest notes
```

## Implemented V1 Features

- First-run setup with recommended or user-selected primary game library.
- Multiple local libraries with add, rename, remove and default selection.
- Game library cards, detail pages, status badges, changelogs and install actions.
- Install queue with progress, phases, cancellation and completed-job clearing.
- Empty first-party catalog by default; game manifests can be added without changing the app shell.
- Repair/verify, update, uninstall, launch and show-folder command wiring.
- Resumable HTTP archive download support with SHA-256 final verification.
- Disk-space checks for cache and target library before install and move operations.
- Move-install flow with explicit copy, verify, switch and cleanup phases.
- Local JSON config and installed-game database under `%LOCALAPPDATA%\Lumorix Launcher`.
- Explicit launcher update check through a release manifest.
- Tauri updater plugin is enabled with signed updater artifact generation and in-app update actions in About and Settings.
- No login, no telemetry, no analytics package and no automatic upload path.

## Run

Install JavaScript dependencies:

```powershell
npm install
```

Run the React UI in browser preview mode:

```powershell
npm run dev
```

Run as a Tauri desktop app:

```powershell
npm run tauri:dev
```

Build the web assets:

```powershell
npm run build
```

Build the Windows desktop bundle:

```powershell
npm run tauri:build
```

Required toolchain for production builds:

- Rust via `rustup` with `stable-x86_64-pc-windows-msvc`
- Visual Studio Build Tools 2022, workload `Desktop development with C++`
- Windows SDK signing tools (`signtool.exe`) if code signing is enabled

Optional signing environment variables used by `src-tauri/scripts/sign-windows.ps1`:

- `LUMORIX_SIGN_CERT_SHA1`
- `LUMORIX_SIGN_TIMESTAMP_URL` (defaults to `http://timestamp.digicert.com`)

## Launcher Updates

Lumorix is wired for Tauri's signed updater flow:

- `src-tauri/tauri.conf.json` enables updater artifacts and points to a GitHub Releases `latest.json`.
- `src-tauri/capabilities/default.json` grants `updater:default`.
- About and Settings expose in-app update actions that check, download and install a signed launcher release.

To make the button download a real update, publish a release containing the generated installer/update artifact, its `.sig` file and a valid `latest.json` matching `distribution/launcher-latest.example.json`.

## Release Source Of Truth

Future launcher releases are driven from a single file: `release-info.json`.

1. Edit `release-info.json`.
2. Run `npm run prepare-release`.
3. Commit, tag `vX.Y.Z`, and push.

That flow syncs the derived release files automatically:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `distribution/latest.json`

Those derived files should not be edited by hand for releases anymore.

## Manifest Format

Game manifests are JSON files with stable launcher-facing fields:

- `id`, `name`, `version`, `description`
- `coverImage`, `bannerImage`, `iconImage`
- `executable`, `installSizeBytes`, `defaultInstallFolder`
- `download.kind`, `download.url`, `download.sha256`
- `installStrategy.kind`
- `supportedActions`
- `changelog`

Embedded examples live in `src-tauri/manifests/`. External examples live in `distribution/manifests/games/`.

## Privacy Baseline

Lumorix stores settings, libraries, install metadata and logs locally. It does not include accounts, telemetry, analytics SDKs or crash upload services. Network access is isolated to explicit manifest/update checks and package downloads.

## Next Production Steps

1. Add integration tests for resumable downloads, move-install verification and low-disk handling.
2. Add the first production game manifests to `distribution/manifests/games/` with CI-generated release checksums.
3. Publish the first signed launcher release and upload a valid `latest.json` for the in-app updater.
4. Add real game executables or signed launch descriptors.
5. Finalize installer branding assets, legal metadata and EV certificate pipeline in CI.
