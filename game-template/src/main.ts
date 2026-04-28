'use strict';

// === Canvas & Context ===
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// === UI Elements ===
const titleScreen = document.getElementById('titleScreen')!;
const gameOverScreen = document.getElementById('gameOverScreen')!;
const startButton = document.getElementById('startButton') as HTMLButtonElement;
const restartButton = document.getElementById('restartButton') as HTMLButtonElement;
const scoreEl = document.getElementById('score')!;
const bestScoreEl = document.getElementById('bestScore')!;
const statusEl = document.getElementById('status')!;
const finalScoreEl = document.getElementById('finalScore')!;

// === Constants ===
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const STORAGE_KEY = 'my-game-best-score';
const keys = new Set<string>();

// === Storage ===
function loadBestScore(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(score: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Some browsers disable storage for file:// origins
  }
}

// === Game State ===
interface GameState {
  mode: 'title' | 'playing' | 'over';
  score: number;
  best: number;
  time: number;
  player: { x: number; y: number; w: number; h: number; vx: number };
}

const state: GameState = {
  mode: 'title',
  score: 0,
  best: loadBestScore(),
  time: 0,
  player: {
    x: WIDTH / 2 - 20,
    y: HEIGHT - 80,
    w: 40,
    h: 40,
    vx: 0,
  },
};

bestScoreEl.textContent = String(state.best);

// === Game Logic ===
function resetGame() {
  state.mode = 'playing';
  state.score = 0;
  state.time = 0;
  state.player.x = WIDTH / 2 - state.player.w / 2;
  state.player.y = HEIGHT - 80;
  state.player.vx = 0;
  titleScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
}

function gameOver() {
  state.mode = 'over';
  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    saveBestScore(state.best);
    bestScoreEl.textContent = String(state.best);
  }
  finalScoreEl.textContent = `Score: ${Math.floor(state.score)}`;
  gameOverScreen.classList.remove('hidden');
}

function update(dt: number) {
  if (state.mode !== 'playing') return;

  state.time += dt;
  state.score += dt * 10; // Scoring based on time

  // === Player Movement ===
  const speed = 300;
  let moveX = 0;

  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) moveX -= speed * dt;
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) moveX += speed * dt;

  state.player.x += moveX;
  state.player.x = Math.max(0, Math.min(state.player.x, WIDTH - state.player.w));

  // === End game after 30 seconds (example) ===
  if (state.time > 30) {
    gameOver();
  }
}

function draw() {
  // === Clear Canvas ===
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // === Draw Grid Background ===
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < WIDTH; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, HEIGHT);
    ctx.stroke();
  }
  for (let i = 0; i < HEIGHT; i += 60) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(WIDTH, i);
    ctx.stroke();
  }

  // === Draw Player ===
  ctx.fillStyle = 'rgb(0, 212, 255)';
  ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
  ctx.shadowBlur = 20;
  ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
  ctx.shadowColor = 'transparent';

  // === Draw Score ===
  ctx.fillStyle = '#f4fbff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`Time: ${Math.floor(state.time)}s`, 20, 40);
}

function gameLoop(currentTime: number) {
  const dt = 0.016; // Assume 60 FPS
  update(dt);
  draw();
  scoreEl.textContent = String(Math.floor(state.score));
  requestAnimationFrame(gameLoop);
}

// === Event Listeners ===
document.addEventListener('keydown', (e) => keys.add(e.key));
document.addEventListener('keyup', (e) => keys.delete(e.key));

startButton.addEventListener('click', () => {
  resetGame();
  gameLoop(0);
});

restartButton.addEventListener('click', () => {
  resetGame();
  gameLoop(0);
});

console.log('🎮 Game Ready - Click "Start Game" to play');
