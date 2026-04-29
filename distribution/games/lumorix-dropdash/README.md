# Lumorix DropDash

Lumorix DropDash is an official arcade game. Navigate through falling obstacles, collect power cores, and achieve the highest score. A fast-paced challenge for quick reflexes and strategy.

The game is packaged as a self-contained native Tauri desktop app. There is no separate browser launcher or external web distribution step.

## Package Contents

```text
lumorix-dropdash/
  runtime/
    LumorixDropDash.exe
  build-tauri.ps1
  tauri-app/
    ui/
      index.html
      styles.css
      script.js
  README.md
```

## Launcher Start Target

The launcher starts:

```text
runtime\LumorixDropDash.exe
```

No browser launch script is used anymore.

## Local Run

Run `LumorixDropDash.exe`.

Controls:

- `A` / `Left`: move left
- `D` / `Right`: move right
- `Space`: pulse shield
- `P`: pause

## Rebuild Desktop Binary

If you change the UI files in `tauri-app\ui\`, rebuild the desktop binary:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-tauri.ps1
```

This updates `LumorixDropDash.exe` in the game root.
It also publishes the launcher runtime binary to `runtime\LumorixDropDash.exe`.

## Release Upload Artifact

The same build script now also prepares the upload package in:

```text
release\lumorix-dropdash-win64.zip
release\lumorix-dropdash-win64.zip.sha256
```

Upload both files beside the production manifest for the public launcher catalog entry.
