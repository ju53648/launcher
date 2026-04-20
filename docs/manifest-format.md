# Lumorix Game Manifest Format

The launcher accepts JSON game manifests. Embedded manifests are compiled into the Rust app for a reliable first run. Additional local manifests can be placed in the local app data `Manifests` folder.

## Minimal Example

```json
{
  "id": "com.lumorix.example-game",
  "name": "Example Game",
  "version": "1.0.0",
  "description": "Short package description.",
  "developer": "Lumorix",
  "releaseDate": "2026-04-20",
  "tags": ["Action", "Offline"],
  "coverImage": "/assets/games/example-cover.png",
  "bannerImage": "/assets/games/example-banner.png",
  "iconImage": "/assets/games/example-icon.png",
  "executable": "Game.exe",
  "installSizeBytes": 2147483648,
  "defaultInstallFolder": "Example Game",
  "supportedActions": ["install", "launch", "update", "repair", "uninstall", "openFolder"],
  "installStrategy": {
    "kind": "zipArchive",
    "rootFolder": "ExampleGame"
  },
  "download": {
    "kind": "httpArchive",
    "url": "https://github.com/lumorix/example-game/releases/download/v1.0.0/example-game.zip",
    "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
    "sizeBytes": 2147483648
  },
  "changelog": [
    {
      "version": "1.0.0",
      "date": "2026-04-20",
      "items": ["Initial release."]
    }
  ]
}
```

## Supported Install Strategies

- `synthetic`: Creates local files from manifest content. Keep this for internal development or tightly controlled first-party packages.
- `zipArchive`: Downloads a zip archive, checks SHA-256, safely extracts it and records install metadata.

Synthetic strategy fields are camelCase in JSON and map to Rust snake_case fields. The required synthetic launch script field is `executableTemplate`, which deserializes to Rust as `executable_template`.

## Distribution Start

For v1, publish each game package as a GitHub Release asset and publish its manifest beside it. The launcher can later load a remote registry file that points to these manifests. Moving to a CDN only changes manifest URLs and hosting; install semantics stay the same.

## Signed Release Package Workflow

For production game delivery:

1. Build the game package zip for Windows.
2. Sign the package in CI (detached signature, e.g. minisign/cosign) and upload both `.zip` and `.sig` to the game release.
3. Generate a SHA-256 manifest file and upload it as an additional release asset.
4. Copy the final SHA-256 into the launcher game manifest `download.sha256`.

Example SHA-256 manifest file (`sha256sum.txt`):

```text
7ab8c58ef7052e9cf0c0f2f2f4e9f1d487f2d2df056e45cb0e9a1f94cbcf9d9d  example-game-win64.zip
```

PowerShell command to produce SHA-256 from CI:

```powershell
(Get-FileHash .\example-game-win64.zip -Algorithm SHA256).Hash.ToLower()
```
