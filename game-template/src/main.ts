'use strict';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const context = canvas.getContext('2d');

if (!context) {
  throw new Error('2D canvas context is not available.');
}
const ctx: CanvasRenderingContext2D = context;

const titleScreen = document.getElementById('titleScreen') as HTMLElement;
const gameOverScreen = document.getElementById('gameOverScreen') as HTMLElement;
const startButton = document.getElementById('startButton') as HTMLButtonElement;
const restartButton = document.getElementById('restartButton') as HTMLButtonElement;
const scoreEl = document.getElementById('score') as HTMLElement;
const bestScoreEl = document.getElementById('bestScore') as HTMLElement;
const statusEl = document.getElementById('status') as HTMLElement;
const finalScoreEl = document.getElementById('finalScore') as HTMLElement;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const STORAGE_KEY = 'my-game-best-score';
const keys = new Set<string>();

class AudioSynth {
  private audioContext: AudioContext | null = null;
  private initialized = false;
  private readonly masterVolume = 0.2;

  init() {
    if (this.initialized) {
      return;
    }

    try {
      const AudioContextClass = window.AudioContext ?? (window as Window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
      this.audioContext = AudioContextClass ? new AudioContextClass() : null;
      this.initialized = true;
    } catch {
      this.audioContext = null;
    }
  }

  resume() {
    this.init();
    void this.audioContext?.resume();
  }

  playTone(
    frequency: number,
    duration: number,
    waveform: OscillatorType = 'sine',
    volumeScale = 1
  ) {
    this.resume();
    if (!this.audioContext) {
      return;
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    const volume = this.audioContext.createGain();

    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.12, now);
    envelope.gain.linearRampToValueAtTime(0, now + duration);
    volume.gain.setValueAtTime(this.masterVolume * volumeScale, now);

    oscillator.connect(envelope);
    envelope.connect(volume);
    volume.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  playClick() {
    this.playTone(420, 0.05, 'sine', 0.9);
  }

  playCollect() {
    this.playTone(560, 0.08, 'sine', 0.9);
    window.setTimeout(() => this.playTone(680, 0.12, 'sine', 0.9), 45);
  }

  playPulse() {
    this.playTone(392, 0.14, 'triangle', 1);
  }

  playCrash() {
    this.playTone(210, 0.16, 'sawtooth', 0.85);
    window.setTimeout(() => this.playTone(120, 0.3, 'sine', 0.75), 60);
  }
}

const audio = new AudioSynth();

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
}

interface Hazard {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  rotation: number;
  spin: number;
}

interface Core {
  x: number;
  y: number;
  r: number;
  speed: number;
  wobble: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  life: number;
  scale: number;
}

type PatternKind = 'spread' | 'left' | 'right' | 'center' | 'breather';

interface GameState {
  mode: 'title' | 'playing' | 'paused' | 'over';
  score: number;
  best: number;
  time: number;
  coresCollected: number;
  hazardsCleared: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  wave: number;
  pattern: PatternKind;
  patternTimer: number;
  pulseCooldown: number;
  pulseTime: number;
  spawnTimer: number;
  coreTimer: number;
  shake: number;
  player: Player;
  hazards: Hazard[];
  cores: Core[];
  sparks: Spark[];
  floatingTexts: FloatingText[];
  stars: Star[];
}

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
    // Some browsers disable storage in restricted origins.
  }
}

const state: GameState = {
  mode: 'title',
  score: 0,
  best: loadBestScore(),
  time: 0,
  coresCollected: 0,
  hazardsCleared: 0,
  combo: 0,
  maxCombo: 0,
  comboTimer: 0,
  wave: 1,
  pattern: 'spread',
  patternTimer: 8,
  pulseCooldown: 0,
  pulseTime: 0,
  spawnTimer: 0.6,
  coreTimer: 2.2,
  shake: 0,
  player: {
    x: WIDTH / 2 - 20,
    y: HEIGHT - 82,
    w: 40,
    h: 40,
    vx: 0
  },
  hazards: [],
  cores: [],
  sparks: [],
  floatingTexts: [],
  stars: Array.from({ length: 72 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    speed: 20 + Math.random() * 60,
    size: 1 + Math.random() * 2
  }))
};

bestScoreEl.textContent = String(state.best);

function resetGame() {
  state.mode = 'playing';
  state.score = 0;
  state.time = 0;
  state.coresCollected = 0;
  state.hazardsCleared = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.comboTimer = 0;
  state.wave = 1;
  state.pattern = 'spread';
  state.patternTimer = 8;
  state.pulseCooldown = 0;
  state.pulseTime = 0;
  state.spawnTimer = 0.7;
  state.coreTimer = 2.1;
  state.shake = 0;
  state.player.x = WIDTH / 2 - state.player.w / 2;
  state.player.y = HEIGHT - 82;
  state.player.vx = 0;
  state.hazards = [];
  state.cores = [];
  state.sparks = [];
  state.floatingTexts = [];
  titleScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  updateHud();
}

function returnToTitle() {
  state.mode = 'title';
  state.hazards = [];
  state.cores = [];
  state.sparks = [];
  state.floatingTexts = [];
  state.shake = 0;
  titleScreen.classList.remove('hidden');
  gameOverScreen.classList.add('hidden');
  updateHud();
}

function gameOver() {
  state.mode = 'over';
  state.shake = 12;
  audio.playCrash();
  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    saveBestScore(state.best);
    bestScoreEl.textContent = String(state.best);
  }
  finalScoreEl.textContent = `Score ${Math.floor(state.score)} / Time ${Math.floor(
    state.time
  )}s / Wave ${state.wave} / Cores ${state.coresCollected} / Clears ${state.hazardsCleared} / Best Combo x${state.maxCombo}`;
  gameOverScreen.classList.remove('hidden');
  updateHud();
}

function pulse() {
  if (state.mode !== 'playing' || state.pulseCooldown > 0) {
    return;
  }

  state.pulseCooldown = 4.4;
  state.pulseTime = 0.35;
  state.shake = Math.max(state.shake, 3);
  audio.playPulse();
  addSparks(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#76efff', 18);
}

function spawnHazard() {
  const size = 22 + Math.random() * 26;
  const speedBase =
    180 + Math.min(180, state.time * 8) + Math.random() * 70 + (state.wave - 1) * 10;
  const speed = state.pattern === 'breather' ? speedBase * 0.82 : speedBase;
  let x = 18 + Math.random() * (WIDTH - size - 36);

  if (state.pattern === 'left') {
    x = 18 + Math.random() * Math.max(80, WIDTH * 0.42 - size);
  } else if (state.pattern === 'right') {
    const minX = WIDTH * 0.58;
    x = minX + Math.random() * Math.max(40, WIDTH - size - minX - 18);
  } else if (state.pattern === 'center') {
    const center = WIDTH / 2 - size / 2;
    x = center + (Math.random() - 0.5) * 160;
    x = Math.max(18, Math.min(x, WIDTH - size - 18));
  }

  pushHazard(x, size, speed);

  if (state.pattern === 'center' && Math.random() < 0.28) {
    const flankSize = Math.max(18, size * 0.72);
    pushHazard(x - 74, flankSize, speed * 1.03);
    pushHazard(x + 74, flankSize, speed * 1.03);
    return;
  }

  if ((state.pattern === 'left' || state.pattern === 'right') && Math.random() < 0.24) {
    const offset = state.pattern === 'left' ? 58 : -58;
    pushHazard(x + offset, Math.max(18, size * 0.78), speed * 0.96);
    return;
  }

  if (state.pattern === 'spread' && Math.random() < 0.16) {
    pushHazard(18 + Math.random() * (WIDTH - size - 36), Math.max(18, size * 0.82), speed * 0.92);
  }
}

function pushHazard(x: number, size: number, speed: number) {
  const clampedX = Math.max(18, Math.min(x, WIDTH - size - 18));
  state.hazards.push({
    x: clampedX,
    y: -size,
    w: size,
    h: size,
    speed,
    rotation: Math.random() * Math.PI,
    spin: -2 + Math.random() * 4
  });
}

function spawnCore() {
  state.cores.push({
    x: 28 + Math.random() * (WIDTH - 56),
    y: -28,
    r: 12,
    speed: 120 + Math.random() * 50,
    wobble: Math.random() * Math.PI * 2
  });
}

function addSparks(x: number, y: number, color: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 170;
    state.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: 0.35 + Math.random() * 0.35,
      size: 2 + Math.random() * 3,
      color
    });
  }
}

function addFloatingText(
  text: string,
  x: number,
  y: number,
  color: string,
  life = 0.8,
  scale = 1
) {
  state.floatingTexts.push({ text, x, y, color, age: 0, life, scale });
}

function patternLabel(pattern: PatternKind) {
  switch (pattern) {
    case 'left':
      return 'Left pressure';
    case 'right':
      return 'Right pressure';
    case 'center':
      return 'Center lock';
    case 'breather':
      return 'Breather';
    default:
      return 'Open spread';
  }
}

function patternDuration(pattern: PatternKind) {
  return pattern === 'breather' ? 5.5 : 7.5;
}

function advancePattern() {
  const cycle: PatternKind[] = ['spread', 'left', 'right', 'center', 'breather'];
  state.wave += 1;
  state.pattern = cycle[(state.wave - 1) % cycle.length];
  state.patternTimer = patternDuration(state.pattern);
  addFloatingText(`Wave ${state.wave}`, WIDTH / 2, HEIGHT / 2 - 74, '#f6ff80', 1.2, 1.1);
  addFloatingText(patternLabel(state.pattern), WIDTH / 2, HEIGHT / 2 - 46, '#f4fbff', 1.3, 0.9);
  audio.playClick();
}

function awardComboPoints(baseScore: number, x: number, y: number, color: string, label?: string) {
  state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.comboTimer = 2.2;

  const comboMultiplier = 1 + Math.min(1.6, (state.combo - 1) * 0.2);
  const awarded = Math.round(baseScore * comboMultiplier);
  state.score += awarded;

  addFloatingText(`+${awarded}`, x, y, color, 0.85, 1);
  if (label) {
    addFloatingText(label, x, y - 18, '#f6ff80', 1.05, 0.82);
  }
  if (state.combo >= 2) {
    addFloatingText(`x${state.combo} chain`, x, y - 36, '#f4fbff', 1.1, 0.76);
  }
}

function rectsOverlap(a: Pick<Player, 'x' | 'y' | 'w' | 'h'>, b: Pick<Hazard, 'x' | 'y' | 'w' | 'h'>) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectOverlap(circle: Pick<Core, 'x' | 'y' | 'r'>, rect: Pick<Player, 'x' | 'y' | 'w' | 'h'>) {
  const cx = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function updateHud() {
  scoreEl.textContent = String(Math.floor(state.score));
  bestScoreEl.textContent = String(state.best);

  if (state.mode === 'title') {
    statusEl.textContent = 'Ready';
    return;
  }
  if (state.mode === 'paused') {
    statusEl.textContent = 'Paused';
    return;
  }
  if (state.mode === 'over') {
    statusEl.textContent = 'Run complete';
    return;
  }
  if (state.combo >= 2 && state.comboTimer > 0) {
    statusEl.textContent = `Combo x${state.combo}`;
    return;
  }
  if (state.pulseTime > 0) {
    statusEl.textContent = 'Pulse active';
    return;
  }
  if (state.pulseCooldown > 0) {
    statusEl.textContent = `Pulse ${state.pulseCooldown.toFixed(1)}s`;
    return;
  }
  statusEl.textContent = 'Pulse ready';
}

function update(dt: number) {
  for (const star of state.stars) {
    star.y += star.speed * dt;
    if (star.y > HEIGHT + 4) {
      star.y = -8;
      star.x = Math.random() * WIDTH;
    }
  }

  state.sparks = state.sparks.filter((spark) => {
    spark.age += dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 0.98;
    spark.vy *= 0.98;
    return spark.age < spark.life;
  });

  state.floatingTexts = state.floatingTexts.filter((text) => {
    text.age += dt;
    text.y -= 28 * dt;
    return text.age < text.life;
  });

  if (state.mode !== 'playing') {
    state.shake = Math.max(0, state.shake - dt * 20);
    return;
  }

  state.time += dt;
  state.score += dt * 12;
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.comboTimer === 0 && state.combo !== 0) {
    state.combo = 0;
  }
  state.patternTimer = Math.max(0, state.patternTimer - dt);
  if (state.patternTimer === 0) {
    advancePattern();
  }
  state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
  state.pulseTime = Math.max(0, state.pulseTime - dt);
  state.spawnTimer -= dt;
  state.coreTimer -= dt;
  state.shake = Math.max(0, state.shake - dt * 26);

  const left = keys.has('arrowleft') || keys.has('a');
  const right = keys.has('arrowright') || keys.has('d');
  const targetDirection = (right ? 1 : 0) - (left ? 1 : 0);
  state.player.vx += (targetDirection * 520 - state.player.vx) * Math.min(1, dt * 10);
  state.player.x += state.player.vx * dt;
  state.player.x = Math.max(14, Math.min(state.player.x, WIDTH - state.player.w - 14));

  if (state.spawnTimer <= 0) {
    spawnHazard();
    const patternFactor =
      state.pattern === 'breather'
        ? 1.55
        : state.pattern === 'center'
          ? 0.82
          : state.pattern === 'spread'
            ? 1
            : 0.9;
    state.spawnTimer = Math.max(0.16, (0.88 - state.time * 0.012) * patternFactor);
  }

  if (state.coreTimer <= 0) {
    spawnCore();
    state.coreTimer = 2 + Math.random() * 1.3;
  }

  const pulseBox = {
    x: state.player.x - 44,
    y: state.player.y - 44,
    w: state.player.w + 88,
    h: state.player.h + 88
  };

  state.hazards = state.hazards.filter((hazard) => {
    hazard.y += hazard.speed * dt;
    hazard.rotation += hazard.spin * dt;

    if (state.pulseTime > 0 && rectsOverlap(pulseBox, hazard)) {
      state.hazardsCleared += 1;
      awardComboPoints(14, hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, '#ff5270', 'CLEAR');
      addSparks(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, '#ff5270', 10);
      return false;
    }

    if (rectsOverlap(state.player, hazard)) {
      gameOver();
      return false;
    }

    return hazard.y < HEIGHT + 80;
  });

  state.cores = state.cores.filter((core) => {
    core.y += core.speed * dt;
    core.wobble += dt * 4;
    const liveCore = {
      x: core.x + Math.sin(core.wobble) * 8,
      y: core.y,
      r: core.r
    };

    if (circleRectOverlap(liveCore, state.player)) {
      state.coresCollected += 1;
      state.pulseCooldown = Math.max(0, state.pulseCooldown - 1.3);
      awardComboPoints(60, liveCore.x, liveCore.y, '#76efff', 'CORE');
      audio.playCollect();
      addSparks(liveCore.x, liveCore.y, '#76efff', 16);
      return false;
    }

    return core.y < HEIGHT + 40;
  });
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#07111f');
  gradient.addColorStop(0.5, '#071019');
  gradient.addColorStop(1, '#04070d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(180, 245, 255, 0.55)';
  for (const star of state.stars) {
    ctx.fillRect(star.x, star.y, star.size, star.size * 2);
  }

  ctx.strokeStyle = 'rgba(118, 239, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 70; x < WIDTH + 70; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 70, HEIGHT);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2);
  ctx.shadowColor = '#76efff';
  ctx.shadowBlur = state.pulseTime > 0 ? 28 : 14;
  ctx.fillStyle = '#effcff';
  ctx.fillRect(-state.player.w / 2, -state.player.h / 2, state.player.w, state.player.h);
  ctx.fillStyle = '#0b171e';
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();

  if (state.pulseTime <= 0) {
    return;
  }

  ctx.save();
  const radius = 74 - state.pulseTime * 35;
  ctx.shadowColor = 'rgba(118, 239, 255, 0.8)';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = `rgba(118, 239, 255, ${state.pulseTime * 2})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();

  for (const core of state.cores) {
    const x = core.x + Math.sin(core.wobble) * 8;
    ctx.save();
    ctx.translate(x, core.y);
    ctx.shadowColor = '#76efff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(118, 239, 255, 0.24)';
    ctx.beginPath();
    ctx.arc(0, 0, core.r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#76efff';
    ctx.beginPath();
    ctx.arc(0, 0, core.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6ff80';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const hazard of state.hazards) {
    ctx.save();
    ctx.translate(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2);
    ctx.rotate(hazard.rotation);
    ctx.shadowColor = '#ff4160';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ff4160';
    ctx.fillRect(-hazard.w / 2, -hazard.h / 2, hazard.w, hazard.h);
    ctx.fillStyle = '#ffc3ce';
    ctx.fillRect(-hazard.w / 2 + 4, -hazard.h / 2 + 4, hazard.w - 8, 4);
    ctx.restore();
  }

  drawPlayer();

  for (const spark of state.sparks) {
    const alpha = 1 - spark.age / spark.life;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.shadowColor = spark.color;
    ctx.shadowBlur = spark.size * 1.5;
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#f4fbff';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(`Time ${Math.floor(state.time)}s`, 20, 42);
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText(`Wave ${state.wave}`, 20, 96);
  if (state.combo >= 2 && state.comboTimer > 0) {
    ctx.fillStyle = '#f6ff80';
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText(`Combo x${state.combo}`, 20, 70);
  }
  ctx.fillStyle = state.pattern === 'breather' ? '#80ffca' : '#c9d8ea';
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText(patternLabel(state.pattern), WIDTH - 170, 42);
  ctx.fillStyle = '#91a6b3';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText(`${state.patternTimer.toFixed(1)}s`, WIDTH - 82, 42);

  for (const text of state.floatingTexts) {
    const alpha = Math.max(0, 1 - text.age / text.life);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = text.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = text.color;
    ctx.font = `800 ${Math.round(16 * text.scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text.text, text.x, text.y);
    ctx.restore();
  }

  if (state.mode === 'paused') {
    ctx.fillStyle = 'rgba(3, 6, 12, 0.62)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#f4fbff';
    ctx.font = '800 46px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', WIDTH / 2, HEIGHT / 2);
    ctx.textAlign = 'start';
  }

  ctx.restore();
}

let lastFrame = 0;
function gameLoop(currentTime: number) {
  if (lastFrame === 0) {
    lastFrame = currentTime;
  }
  const dt = Math.min(0.033, (currentTime - lastFrame) / 1000);
  lastFrame = currentTime;

  update(dt);
  draw();
  updateHud();
  requestAnimationFrame(gameLoop);
}

function beginRun() {
  audio.playClick();
  lastFrame = 0;
  resetGame();
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (['arrowleft', 'arrowright', 'a', 'd', ' ', 'enter', 'escape', 'p'].includes(key)) {
    event.preventDefault();
  }

  if (key === 'enter' && state.mode !== 'playing') {
    beginRun();
    return;
  }

  if (key === 'escape' && state.mode !== 'title') {
    returnToTitle();
    return;
  }

  if (key === 'p' && (state.mode === 'playing' || state.mode === 'paused')) {
    state.mode = state.mode === 'paused' ? 'playing' : 'paused';
    updateHud();
    return;
  }

  if (key === ' ' || key === 'spacebar') {
    pulse();
    return;
  }

  keys.add(key);
});

document.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener('blur', () => {
  keys.clear();
  if (state.mode === 'playing') {
    state.mode = 'paused';
    updateHud();
  }
});

startButton.addEventListener('click', beginRun);
restartButton.addEventListener('click', beginRun);

updateHud();
requestAnimationFrame(gameLoop);
