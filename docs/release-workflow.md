# Release Workflow (One Installer, then In-App Updates)

Goal: users install Lumorix once with the Windows installer. All later updates come from in-app updater via GitHub Releases.

## 1) One-time local setup

1. Install toolchain:
- Rust + Cargo (MSVC target)
- Visual Studio Build Tools 2022 with C++ workload
- Windows SDK (for signtool, optional but recommended)

2. Generate updater signing key pair:

```powershell
npx tauri signer generate --ci --write-keys "$env:LOCALAPPDATA\Lumorix Launcher\keys\updater.key"
```

3. Put the generated public key into [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) at plugins.updater.pubkey.

## 2) GitHub secrets

Set these repository secrets:

- TAURI_SIGNING_PRIVATE_KEY (private key content, full text)
- TAURI_SIGNING_PRIVATE_KEY_PASSWORD (optional, empty if key has no password)
- LUMORIX_SIGN_CERT_SHA1 (optional, for Windows Authenticode)
- LUMORIX_SIGN_TIMESTAMP_URL (optional)

## 3) First clean local install build

1. Clean local project artifacts:

```powershell
npm run clean:project
```

2. Build installer locally:

```powershell
npm run tauri:build
```

3. Install one of these outputs:
- [src-tauri/target/release/bundle/msi](src-tauri/target/release/bundle/msi)
- [src-tauri/target/release/bundle/nsis](src-tauri/target/release/bundle/nsis)

## 4) Publish a new release (future standard flow)

1. Edit [release-info.json](release-info.json).
2. Sync derived release metadata and build the signed bundles:

```powershell
npm run prepare-release
```

This updates the generated release files automatically:
- [package.json](package.json)
- [package-lock.json](package-lock.json)
- [src-tauri/Cargo.toml](src-tauri/Cargo.toml)
- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)
- [distribution/latest.json](distribution/latest.json)

Do not edit those generated release files manually anymore.
3. Commit and tag:

```powershell
git add .
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

4. GitHub Action [.github/workflows/release-windows.yml](.github/workflows/release-windows.yml) runs automatically and uploads:
- installer files (.msi, .exe)
- updater artifacts (.zip + .sig)
- finalized latest.json

## 5) In-app updater test

1. Install an older Lumorix build once.
2. Publish a newer GitHub release tag.
3. Start installed Lumorix.
4. In Settings or About, click update check and install.
5. App downloads signed artifact from GitHub Releases and installs update.
6. App restarts automatically; if restart fails, UI shows manual restart message.

## 6) How to avoid testing old app by accident

Before testing, run:

```powershell
npm run audit:local
```

This checks processes, uninstall entries, shortcuts and local Lumorix state folders.

For system cleanup, remove only Lumorix-specific entries if they exist:
- old Lumorix uninstall entry in Apps & Features
- old Lumorix desktop shortcut
- old Lumorix start menu folder/shortcut
- old local state folder at %LOCALAPPDATA%\Lumorix Launcher (except keys if still needed)

## 7) Where artifacts are

Local build artifacts:
- [src-tauri/target/release/bundle](src-tauri/target/release/bundle)

Updater manifest published in release:
- latest.json (generated from release-info.json, then finalized and uploaded by workflow)
