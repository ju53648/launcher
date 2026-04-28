# Multiple Games & Launcher Integration

**How to manage multiple independent game repositories and integrate them with the Lumorix Launcher.**

## Architecture: Decentralized Games

Each game is **completely independent**:

```
Launcher GitHub Repo (ju53648/launcher)
├── Launcher source code
├── game-template/
└── docs/

Game 1 Repository (yourname/my-game)
├── Game source code
└── GitHub Releases → game.zip + manifest.json

Game 2 Repository (yourname/another-game)
├── Game source code
└── GitHub Releases → game.zip + manifest.json

Game 3 Repository (yourname/cool-game)
├── Game source code
└── GitHub Releases → game.zip + manifest.json
```

## Setup Workflow

### 1. Create a New Game Repository

```powershell
# Option A: Use GitHub template
# https://github.com/ju53648/launcher/tree/main/game-template
# Click "Use this template" → Create new repository

# Option B: Clone locally
git clone https://github.com/ju53648/launcher.git launcher
cp -r launcher/game-template my-game
cd my-game
git init
git remote add origin https://github.com/yourname/my-game
git push -u origin main
```

### 2. Develop Your Game

```powershell
cd my-game
npm install
npm run dev
# → Code your game
# → http://localhost:3000
```

### 3. Release & Auto-Upload

```powershell
# Push a tag to trigger GitHub Action
git tag v1.0.0
git push origin main --tags

# GitHub Action automatically:
# - Builds game
# - Creates game.zip + SHA256
# - Generates manifest.json
# - Creates Release on GitHub
```

## Integration Methods

### Method 1: Manual Manifest Registry (Simplest)

Each user manually adds game manifests to their Launcher:

1. Download `manifest.json` from each game's release
2. Save to `%LOCALAPPDATA%\Lumorix Launcher\Manifests\`
3. Restart Launcher

**Pros**: Decentralized, no central server  
**Cons**: Manual process

### Method 2: Manifest Source Configuration

Configure the Launcher to fetch manifests from multiple sources:

**Edit launcher config** (`%LOCALAPPDATA%\Lumorix Launcher\launcher-config.json`):

```json
{
  "manifestSources": [
    {
      "id": "my-game-1",
      "name": "My Game",
      "enabled": true,
      "sourceType": "customHttp",
      "url": "https://github.com/yourname/my-game/releases/latest/download/manifest.json"
    },
    {
      "id": "my-game-2",
      "name": "Another Game",
      "enabled": true,
      "sourceType": "customHttp",
      "url": "https://github.com/yourname/another-game/releases/latest/download/manifest.json"
    },
    {
      "id": "cool-game",
      "name": "Cool Game",
      "enabled": true,
      "sourceType": "customHttp",
      "url": "https://github.com/yourname/cool-game/releases/latest/download/manifest.json"
    }
  ]
}
```

**Pros**: Automatic, one-time setup  
**Cons**: Requires manual config editing

### Method 3: Central Game Catalog (Recommended for Scale)

Create a centralized **game-catalog** repository that lists all available games:

**game-catalog/README.md**
```markdown
# Lumorix Game Catalog

Available games for the Lumorix Launcher.

| Game | Developer | Latest | Repository |
|------|-----------|--------|------------|
| My Game | You | v1.0.0 | [link](https://github.com/yourname/my-game) |
| Another Game | You | v1.2.0 | [link](https://github.com/yourname/another-game) |
| Cool Game | Studio | v2.1.0 | [link](https://github.com/yourname/cool-game) |
```

**game-catalog/manifests.json**
```json
{
  "version": "1",
  "timestamp": "2026-04-24T12:00:00Z",
  "manifests": [
    {
      "url": "https://github.com/yourname/my-game/releases/latest/download/manifest.json",
      "developer": "You",
      "category": "Action"
    },
    {
      "url": "https://github.com/yourname/another-game/releases/latest/download/manifest.json",
      "developer": "You",
      "category": "Puzzle"
    },
    {
      "url": "https://github.com/yourname/cool-game/releases/latest/download/manifest.json",
      "developer": "Studio",
      "category": "Adventure"
    }
  ]
}
```

Then configure Launcher to fetch from:
```
https://github.com/yourname/game-catalog/releases/latest/download/manifests.json
```

**Pros**: Scalable, discoverable, curated  
**Cons**: Requires central repository

## Step-by-Step: Your First 3 Games

### Game 1: "Click Counter"

```powershell
# Create from template
gh repo create click-counter --template ju53648/launcher --include-all-branches --source=launcher

cd click-counter
npm install

# Code the game (see game-development.md for example)

# Release
git tag v1.0.0
git push origin main --tags

# Release now at:
# https://github.com/yourname/click-counter/releases/v1.0.0/manifest.json
```

### Game 2: "Memory Match"

```powershell
# Same process
gh repo create memory-match --template ju53648/launcher --include-all-branches
cd memory-match
npm install

# Code the game...

git tag v1.0.0
git push origin main --tags
```

### Game 3: "Flappy Bird Clone"

```powershell
# Same process...
gh repo create flappy-bird --template ju53648/launcher --include-all-branches
```

### Add All to Launcher

**Option A**: Edit launcher-config.json
```json
{
  "manifestSources": [
    { "url": "https://github.com/yourname/click-counter/releases/latest/download/manifest.json" },
    { "url": "https://github.com/yourname/memory-match/releases/latest/download/manifest.json" },
    { "url": "https://github.com/yourname/flappy-bird/releases/latest/download/manifest.json" }
  ]
}
```

**Option B**: Create game-catalog repo

```powershell
gh repo create game-catalog
cd game-catalog

# Add manifests.json with all three games

git push origin main
```

Then add to Launcher:
```json
{
  "manifestSources": [
    { "url": "https://github.com/yourname/game-catalog/releases/latest/download/manifests.json" }
  ]
}
```

## Updating Games

To release a new version:

```powershell
cd my-game

# Update version in package.json
# Update manifest.template.json

# Commit and tag
git commit -am "v1.1.0: Bug fixes and new level"
git tag v1.1.0
git push origin main --tags

# Launcher will detect update when it next refreshes
# Players can click "Update" on the game card
```

## Git Workflow for Multiple Repos

**Keep track of all your games:**

```powershell
# Clone all at once
mkdir my-games
cd my-games

git clone https://github.com/yourname/click-counter
git clone https://github.com/yourname/memory-match
git clone https://github.com/yourname/flappy-bird

# Update all to latest
foreach ($dir in ls -d */ ) {
  cd $dir
  git pull
  cd ..
}
```

## Continuous Deployment Tips

### Auto-generate Catalog

Create a GitHub Action in your game-catalog repo:

```yaml
name: Sync Games

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Fetch latest manifests
        run: |
          # Download all manifest.json files from releases
          # Update manifests.json
          # Commit changes
```

### Badge for Launcher

Add to your game README:

```markdown
![Lumorix Compatible](https://img.shields.io/badge/Lumorix-Compatible-blue)

Available on [Lumorix Launcher](https://github.com/ju53648/launcher)
```

## Directory Structure Reference

Your local setup:

```
~/projects/
├── lumorix-launcher/
│   ├── game-template/
│   ├── docs/
│   └── src-tauri/
│
├── my-games/
│   ├── click-counter/
│   │   ├── src/
│   │   ├── package.json
│   │   └── .github/workflows/release.yml
│   │
│   ├── memory-match/
│   │   └── (same structure)
│   │
│   └── flappy-bird/
│       └── (same structure)
│
└── game-catalog/ (optional)
    ├── manifests.json
    └── README.md
```

## Troubleshooting

### Launcher won't find game
- [ ] manifest.json URL is correct
- [ ] manifest.json is valid JSON
- [ ] game.zip exists at download URL
- [ ] SHA256 matches

### Game updates not appearing
- [ ] New version tagged correctly (`vX.Y.Z`)
- [ ] GitHub Action completed successfully
- [ ] Launcher refreshed (or restarted)
- [ ] Version in manifest is newer than previous

### Large download times
- [ ] game.zip is unnecessarily large (optimize!)
- [ ] GitHub CDN has latency (normal)
- [ ] Check with `npm run package` to see file size

## Next Steps

1. **Create your first game** with `game-template/`
2. **Release to GitHub** with git tags
3. **Add to Launcher** via manifest configuration
4. **Iterate**: Update and re-release with new versions
5. **Scale**: Create more games using the same workflow

---

**You now have a complete decentralized game distribution system!** 🎮

Each game is independent, versioned, and updateable without touching the Launcher code.
