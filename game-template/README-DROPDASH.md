# Game Template: Basierend auf Lumorix DropDash

**Dieses Template zeigt wie man ein echtes Arcade-Game für den Lumorix Launcher entwickelt.**

Das Template basiert auf der Architektur von **Lumorix DropDash** — ein funktionierendes Arcade-Spiel mit:
- Canvas 2D Rendering
- Game-Loop (Update/Draw-Zyklus)
- Score-System mit localStorage
- Arcade-UI mit Title/GameOver Screens
- Tasten-Input-Handling

## Was ist anders zum Standard-Template?

### Vorher (einfach)
```typescript
// Alte Struktur: Button-Click Listener
document.getElementById('start-btn').addEventListener('click', () => {
  alert('Game logic!');
});
```

### Nachher (DropDash-Style)
```typescript
// Neue Struktur: Canvas Game-Loop
function update(dt: number) { /* Input, Physics, Logic */ }
function draw() { /* Canvas Rendering */ }
function gameLoop() { requestAnimationFrame(gameLoop); }

startButton.addEventListener('click', () => {
  resetGame();
  gameLoop(0);  // Start loop
});
```

## Key Components

### 1. **HTML Canvas + HUD**
```html
<canvas id="gameCanvas" width="960" height="540"></canvas>
<div class="hud">
  <div><span>Score</span><strong id="score">0</strong></div>
  <div><span>Best</span><strong id="bestScore">0</strong></div>
</div>
```

### 2. **Game State Management**
```typescript
const state = {
  mode: 'title' | 'playing' | 'over',
  score: 0,
  best: 0,
  time: 0,
  player: { x, y, w, h },
};
```

### 3. **Update/Draw Pattern**
```typescript
function gameLoop() {
  update(deltaTime);  // Physics & Input
  draw();              // Render to Canvas
  requestAnimationFrame(gameLoop);
}
```

### 4. **Score Persistence**
```typescript
// localStorage speichert Best Score
localStorage.setItem('my-game-best-score', state.best);
```

## Direkt von DropDash übernehmen

Schau dir die echte Implementation an:

📁 `distribution/games/lumorix-dropdash/`
- `index.html` — Canvas + HUD Structure
- `script.js` — Game Loop, Physics, Input
- `styles.css` — Arcade Design mit Glassmorphism

Nutze diese Dateien als Vorlage:
- Player-Bewegung
- Hazard-Spawning
- Kollisions-Detection
- Score-Rendering
- Screen-Übergänge

## Customization Guide

### Player-Bewegung
```typescript
// In update()
const speed = 300; // px/s
if (keys.has('ArrowLeft')) state.player.x -= speed * dt;
if (keys.has('ArrowRight')) state.player.x += speed * dt;
```

### Gegner/Objekte
```typescript
state.hazards.push({
  x: Math.random() * WIDTH,
  y: -50,
  w: 30, h: 30,
  vy: 200,  // Speed down
});
```

### Kollisions-Detection
```typescript
function rectsCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// In update()
for (const hazard of state.hazards) {
  if (rectsCollide(state.player, hazard)) gameOver();
}
```

### Rendering
```typescript
// Clear
ctx.fillStyle = '#05070d';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Draw Player (Cyan like DropDash)
ctx.fillStyle = '#00d4ff';
ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);

// Draw Hazards (Red)
ctx.fillStyle = '#ff3a5b';
hazards.forEach(h => ctx.fillRect(h.x, h.y, h.w, h.h));
```

## Arcade-Design Verwenden

Das Template nutzt das Lumorix Design System:

```css
/* Cyan Primary Color */
background: linear-gradient(135deg, #00d4ff, #00a8ff);

/* Dark Backgrounds */
background: rgba(5, 10, 18, 0.74);

/* Glassmorphism Effect */
backdrop-filter: blur(10px);
border: 1px solid rgba(139, 241, 255, 0.32);

/* Glow Effects */
box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
```

Passe die Farben für dein Spiel an:
- Cyan `#00d4ff` — Player
- Red `#ff3a5b` — Hazards/Danger
- Green `#00ff88` — Collectibles
- Purple `#a855f7` — Power-ups

## Performance Tips (von DropDash)

✅ **Canvas ist schnell** — 60 FPS möglich  
✅ **Vermeide DOM-Änderungen** — nur Canvas zeichnen  
✅ **requestAnimationFrame** — Browser-optimiert  
✅ **Kleine Dateigröße** — DropDash ist nur ~16 KB  

## Debugging im Browser

Öffne Developer Tools (F12) während das Spiel läuft:

```javascript
// Im Console Tab eingeben:
console.log(state);              // Spiel-Status
console.log(state.hazards);      // Gegner-Liste
console.log(state.player);       // Player-Position
```

## Test-Checkliste

Bevor du releasest:
- [ ] Title Screen zeigt?
- [ ] Start Button funktioniert?
- [ ] Game Loop läuft (60 FPS)?
- [ ] Score steigt?
- [ ] Best Score wird gespeichert?
- [ ] Game Over Screen zeigt?
- [ ] Play Again funktioniert?
- [ ] localStorage funktioniert?

## Nächste Schritte

1. **Game Loop verstehen** — Schau `src/main.ts` an
2. **DropDash studieren** — `distribution/games/lumorix-dropdash/`
3. **Features hinzufügen** — Gegner, Power-ups, Levels
4. **Styling anpassen** — Farben & Effects in `style.css`
5. **Releasen** — `git tag v1.0.0` + Push

---

**Viel Spaß beim Entwickeln! 🎮**

Dieses Template ist dein Startpunkt. DropDash ist dein Lehrbuch. Nutze beide um dein eigenes Arcade-Game zu bauen!
