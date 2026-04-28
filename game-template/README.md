# Lumorix Game Template

**Template für die Entwicklung von Windows-Spielen für den Lumorix Launcher.**

Jedes Spiel läuft als Web-App (HTML/CSS/JS/TypeScript) und wird in ein ZIP-Paket gebündelt, das der Launcher automatisch installiert und startet.

## Features

✅ Vite-basiertes Buildsystem  
✅ TypeScript + CSS support  
✅ Automatische Release-Automation via GitHub  
✅ SHA-256 Verifikation  
✅ Manifest-Generierung  
✅ Sofort einsatzbereit  

## Setup

### 1. Repository klonen oder forken

```powershell
# Option A: Lokal klonen und in dein Repo kopieren
git clone <template-url> my-game
cd my-game
```

### 2. Dependencies installieren

```powershell
npm install
```

### 3. Entwickeln & Testen

```powershell
# Dev-Server mit Hot-Reload
npm run dev

# Dann öffne http://localhost:3000 im Browser
```

### 4. Spiel programmieren

Bearbeite:
- **HTML**: `src/index.html` - Spielstruktur
- **Styling**: `src/style.css` - Design und Layout
- **Logik**: `src/main.ts` - Spielmechaniken

```typescript
// Beispiel: Listener für Game-Button
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
if (startBtn) {
  startBtn.addEventListener('click', () => {
    // Dein Spiel-Code hier
  });
}
```

### 5. Lokal bauen und testen

```powershell
# Build und Packaging
npm run package

# Generiert:
# - dist/         (gebundelte Web-App)
# - game.zip      (komprimiertes Paket)
# - game.zip.sha256 (Checksumme für Verifikation)
```

### 6. Manifest konfigurieren

Bearbeite die Eigenschaften in `.github/workflows/release.yml`:

```json
{
  "id": "com.lumorix.my-game",
  "name": "My Game",
  "version": "1.0.0",
  "description": "Meine erste Lumorix-Game",
  "developer": "Your Name",
  "releaseDate": "2026-04-24",
  "tags": ["Action", "Arcade"],
  "executable": "index.html"
}
```

### 7. Release & Upload

```powershell
# Git tag erstellen und pushen
git tag v1.0.0
git push origin main --tags

# GitHub Action läuft automatisch:
# 1. Builds das Spiel
# 2. Erstellt game.zip + SHA256
# 3. Generiert manifest.json
# 4. Pusht alles zu GitHub Releases
```

### 8. Im Launcher registrieren

Die `manifest.json` vom Release kopieren und im Launcher hinzufügen:

**Option A**: Im Launcher einbinden
```json
{
  "url": "https://github.com/username/my-game/releases/download/v1.0.0/manifest.json"
}
```

**Option B**: Lokal unter `%LOCALAPPDATA%\Lumorix Launcher\Manifests` speichern

## Dateistruktur

```
my-game/
├── src/
│   ├── index.html        # Spieleinstieg
│   ├── main.ts           # Hauptlogik
│   └── style.css         # Styling
├── .github/
│   └── workflows/
│       └── release.yml   # CI/CD Pipeline
├── package.json          # Dependencies
├── vite.config.ts        # Build-Konfiguration
└── tsconfig.json         # TypeScript-Konfiguration
```

## Packaging-Output

Nach `npm run package`:

```
game.zip                  # ← Diese Datei
├── index.html            #   wird vom Launcher
├── style.css             #   installiert
├── main.js               #
└── ...                   #

game.zip.sha256           # SHA256: abc123...
manifest.json             # Launcher-Metadaten
```

## Best Practices

### Größe minimieren

- Nutze minification (default in `vite.config.ts`)
- Komprimiere Assets (Bilder, Sounds)
- Vermeide große externe Libraries

### Offline-tauglich

- Alle Assets müssen in `game.zip` enthalten sein
- Keine externen API-Calls (kein Internet erforderlich)
- Nutze localStorage für Persistierung

### Performance

- Lazy-load große Assets
- Nutze Web Workers für CPU-intensive Tasks
- Minimiere DOM-Manipulationen

### Debugging

```powershell
# Dev-Build mit Sourcemaps
npm run dev

# Produktions-Build ohne Sourcemaps (kleiner)
npm run build
npm run preview  # Local preview
```

## Beispiel: Einfaches Arcade-Spiel

```typescript
// src/main.ts
class Game {
  private score = 0;
  private gameActive = false;

  constructor() {
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    startBtn?.addEventListener('click', () => this.start());
  }

  private start() {
    this.gameActive = true;
    this.score = 0;
    console.log('Game started!');
  }
}

new Game();
```

## CI/CD Automatisierung

Die GitHub Action `.github/workflows/release.yml` macht automatisch:

1. **Build**: `npm run build` (Vite-Bundling)
2. **Package**: `npm run package` (ZIP + SHA256)
3. **Release**: GitHub Release erstellen
4. **Manifest**: `manifest.json` generieren
5. **Upload**: Alles zu GitHub Releases pushen

**Auslöser**: `git tag v*` → GitHub Action läuft automatisch

## Troubleshooting

### Build-Fehler
```powershell
# Dependencies aktualisieren
npm install

# Clean rebuild
rm -r node_modules package-lock.json dist
npm install
npm run build
```

### Launcher lädt Spiel nicht
1. Prüfe: Ist `manifest.json` gültig? (JSON validator)
2. Prüfe: Existiert `game.zip` mit der SHA256?
3. Prüfe: Ist `id` eindeutig?

### Spiel startet nicht
1. Browser-Console prüfen (F12)
2. `src/index.html` hat `<div id="app"></div>`?
3. `src/main.ts` ist geladen?

## Support & Weitere Infos

- [Launcher Architecture](../docs/architecture.md)
- [Manifest Format](../docs/manifest-format.md)
- [Vite Dokumentation](https://vitejs.dev/)

---

**Happy Coding! 🎮**
