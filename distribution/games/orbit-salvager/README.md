# Orbit Salvager Distribution

Standalone native Tauri packaging lane for `Orbit Salvager`.

## Structure

- `tauri-app/` contains the native shell and embedded web assets
- `runtime/` receives the packaged desktop executable
- `release/` contains the zip archive and checksum for launcher delivery

## Build

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-tauri.ps1
```

The script builds the web UI from `games/orbit-salvager`, copies it into the
Tauri app `ui/` folder, compiles the native executable, and refreshes the
release archive.

## Local dev install

Before the GitHub-hosted archive exists, register a local launcher override:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\register-dev-manifest.ps1
```

This writes a local manifest override into the launcher data folder and switches
`Orbit Salvager` to direct-folder install from the built native runtime.
