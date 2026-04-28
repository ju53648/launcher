# Local Development & Packaging Guide

## Local Testing with Launcher

You can test your game directly in the Lumorix Launcher during development:

### 1. Build your game
```powershell
npm run build
```

### 2. Create a local manifest
Copy `manifest.template.json` to `my-game-local.json` and update:
```json
{
  "id": "com.lumorix.my-game",
  "downloadUrl": "file:///C:/Users/YourName/my-game/dist",
  "installStrategy": {
    "kind": "directFolder",
    "sourcePath": "C:\\Users\\YourName\\my-game\\dist"
  }
}
```

### 3. Add to Launcher
Place the manifest in:
```
%LOCALAPPDATA%\Lumorix Launcher\Manifests\my-game-local.json
```

Then restart the Launcher.

## Production Release Flow

### Step 1: Prepare for Release
```powershell
# Update version in package.json
# Update manifest.template.json with correct URLs

git add .
git commit -m "v1.0.0: Game release"
git tag v1.0.0
git push origin main --tags
```

### Step 2: GitHub Action runs automatically
- Builds your game
- Creates `game.zip` and SHA256
- Generates `manifest.json`
- Creates GitHub Release

### Step 3: Add to Launcher Registry
Download `manifest.json` from the release and add it to your launcher's manifest source.

## Windows Packaging Details

The `package:zip` script:
1. Takes `dist/` (built web app)
2. Zips entire contents
3. Calculates SHA256 checksum
4. Saves both files

```powershell
# Manual packaging (if needed)
npm run build
npm run package:zip

# Or manually:
Compress-Archive -Path dist\* -DestinationPath game.zip
(Get-FileHash game.zip -Algorithm SHA256).Hash | Out-File game.zip.sha256
```

## Directory Structure in ZIP

When `npm run package` creates `game.zip`, it contains:
```
game.zip
├── index.html
├── style.css
├── main.js (compiled TypeScript)
├── assets/
│   ├── images/
│   └── sounds/
└── ... (all build outputs)
```

The `rootFolder: "."` in the manifest tells Launcher to use everything as the game root.

## Versioning

Use semantic versioning:
- **Major** (1.0.0): Big features or breaking changes
- **Minor** (1.1.0): New features
- **Patch** (1.0.1): Bug fixes

Update in:
1. `package.json` → `version`
2. `manifest.template.json` → `version`
3. Git tag → `vX.Y.Z`

## Troubleshooting

### Game.zip is too large
```powershell
# Check what's in the zip
Expand-Archive game.zip -DestinationPath check/
du -r check | sort -Descending | head -20
```

Common culprits: Large images, videos, or node_modules (shouldn't be there!)

### Manifest validation fails
Use a JSON validator and ensure:
- All required fields are present
- URLs are correct and accessible
- SHA256 matches actual file
- `id` is unique (e.g., `com.lumorix.GAMENAME`)

### Game won't launch from Launcher
1. Check browser console (F12) in launcher
2. Ensure `index.html` exists in root of ZIP
3. Verify all assets are relative paths: `./assets/...` not `/assets/...`
