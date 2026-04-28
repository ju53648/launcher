# Lumorix DropDash

Lumorix DropDash is a standalone desktop game package for Lumorix Launcher.
The gameplay, visuals, controls, and scoring logic are unchanged.

## Package Contents

```text
lumorix-dropdash/
  runtime/
    LumorixDropDash.exe
  index.html
  styles.css
  script.js
  build-tauri.ps1
  web-dist/
  tauri-app/
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

If you change `index.html`, `styles.css`, or `script.js`, rebuild the desktop binary:

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
