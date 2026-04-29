"use strict";

// Audio System
class AudioSynth {
  constructor() {
    this.audioContext = null;
    this.masterVolume = 0.4;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.log("Web Audio API not available");
    }
  }

  playTone(freq, duration, waveform = "sine", volumeScale = 1) {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const env = this.audioContext.createGain();
    const vol = this.audioContext.createGain();

    osc.type = waveform;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.1, now);
    env.gain.linearRampToValueAtTime(0, now + duration);
    vol.gain.setValueAtTime(this.masterVolume * volumeScale, now);

    osc.connect(env);
    env.connect(vol);
    vol.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playCollect() {
    this.playTone(523, 0.08, "sine", 0.8);
    setTimeout(() => this.playTone(659, 0.12, "sine", 0.8), 50);
  }

  playDeflect() {
    this.playTone(783, 0.06, "square", 0.6);
  }

  playPulse() {
    this.playTone(392, 0.15, "sine", 1);
  }

  playCrash() {
    this.playTone(196, 0.3, "sine", 0.7);
    setTimeout(() => this.playTone(98, 0.4, "sine", 0.7), 100);
  }

  playClick() {
    this.playTone(440, 0.05, "sine", 0.6);
  }
}

const audio = new AudioSynth();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const titleScreen = document.getElementById("titleScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const shieldStatusEl = document.getElementById("shieldStatus");
const finalScoreEl = document.getElementById("finalScore");

const translations = {
  en: {
    scoreLabel: "Score",
    bestLabel: "Best",
    shieldLabel: "Shield",
    ready: "Ready",
    titleEyebrow: "The Official Release",
    titleIntro: "Slip between falling shards, grab bright cores, and keep the dash lane alive.",
    controlLeft: "A / Left",
    controlRight: "D / Right",
    controlPulse: "Space to pulse",
    startButton: "Start Run",
    gameOverEyebrow: "Run Complete",
    gameOverTitle: "Crash Detected",
    gameOverTitleTime: "Time's Up!",
    restartButton: "Restart",
    footerAvoid: "Dodge red shards.",
    footerCollect: "Collect cyan cores.",
    footerPause: "Press P to pause.",
    finalScore: "Score",
    paused: "Paused",
    modeLabel: "Mode",
    timerLabel: "Time",
    waveLabel: "Wave",
    modeClassic: "Classic",
    modeTimeattack: "Time Attack",
    modeEndless: "Endless",
    diffEasy: "Easy",
    diffNormal: "Normal",
    diffHard: "Hard",
    powerupSlow: "SLOW-MO!",
    powerupDouble: "2x SCORE!",
    powerupGhost: "GHOST!",
    waveClear: "WAVE CLEAR!",
    waveNext: "Wave",
    finalWave: "Wave reached:"
  },
  de: {
    scoreLabel: "Punktzahl",
    bestLabel: "Bestwert",
    shieldLabel: "Schild",
    ready: "Bereit",
    titleEyebrow: "Das offizielle Release",
    titleIntro: "Weiche fallenden Splittern aus, sammle leuchtende Kerne und halte die Dash-Spur am Leben.",
    controlLeft: "A / Links",
    controlRight: "D / Rechts",
    controlPulse: "Leertaste fuer Impuls",
    startButton: "Run starten",
    gameOverEyebrow: "Durchlauf beendet",
    gameOverTitle: "Crash erkannt",
    gameOverTitleTime: "Zeit abgelaufen!",
    restartButton: "Neustart",
    footerAvoid: "Weiche roten Splittern aus.",
    footerCollect: "Sammle cyanfarbene Kerne.",
    footerPause: "Druecke P zum Pausieren.",
    finalScore: "Punktzahl",
    paused: "Pausiert",
    modeLabel: "Modus",
    timerLabel: "Zeit",
    waveLabel: "Welle",
    modeClassic: "Klassisch",
    modeTimeattack: "Zeitangriff",
    modeEndless: "Endlos",
    diffEasy: "Leicht",
    diffNormal: "Normal",
    diffHard: "Schwer",
    powerupSlow: "ZEITLUPE!",
    powerupDouble: "2x PUNKTE!",
    powerupGhost: "GEIST!",
    waveClear: "WELLE GESCHAFFT!",
    waveNext: "Welle",
    finalWave: "Erreichte Welle:"
  },
  pl: {
    scoreLabel: "Wynik",
    bestLabel: "Rekord",
    shieldLabel: "Tarcza",
    ready: "Gotowe",
    titleEyebrow: "Oficjalna wersja",
    titleIntro: "Unikaj spadajacych odlamkow, zbieraj jasne rdzenie i utrzymaj pas dash przy zyciu.",
    controlLeft: "A / Lewo",
    controlRight: "D / Prawo",
    controlPulse: "Spacja aby pulsowac",
    startButton: "Start",
    gameOverEyebrow: "Koniec biegu",
    gameOverTitle: "Wykryto crash",
    gameOverTitleTime: "Czas minal!",
    restartButton: "Restart",
    footerAvoid: "Unikaj czerwonych odlamkow.",
    footerCollect: "Zbieraj cyjanowe rdzenie.",
    footerPause: "Nacisnij P, aby pauzowac.",
    finalScore: "Wynik",
    paused: "Pauza",
    modeLabel: "Tryb",
    timerLabel: "Czas",
    waveLabel: "Fala",
    modeClassic: "Klasyczny",
    modeTimeattack: "Atak czasu",
    modeEndless: "Nieskonczona",
    diffEasy: "Latwy",
    diffNormal: "Normalny",
    diffHard: "Trudny",
    powerupSlow: "SPOWOLNIENIE!",
    powerupDouble: "2x WYNIK!",
    powerupGhost: "DUCH!",
    waveClear: "FALA UKONCZONA!",
    waveNext: "Fala",
    finalWave: "Osiagnieta fala:"
  }
};

function resolveLanguage(rawValue) {
  const normalized = String(rawValue || "").trim().toLowerCase();
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("pl")) return "pl";
  return "en";
}

let currentLanguage = resolveLanguage(window.__LUMORIX_LANGUAGE || navigator.language || "en");

function t(key) {
  return translations[currentLanguage]?.[key] ?? translations.en[key] ?? key;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;

  const textTargets = {
    scoreLabel: "scoreLabel",
    bestLabel: "bestLabel",
    shieldLabel: "shieldLabel",
    titleEyebrow: "titleEyebrow",
    titleIntro: "titleIntro",
    controlLeft: "controlLeft",
    controlRight: "controlRight",
    controlPulse: "controlPulse",
    gameOverEyebrow: "gameOverEyebrow",
    modeLabel: "modeLabel",
    timerLabel: "timerLabel",
    footerAvoid: "footerAvoid",
    footerCollect: "footerCollect",
    footerPause: "footerPause"
  };

  Object.entries(textTargets).forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = t(key);
    }
  });

  startButton.textContent = t("startButton");
  restartButton.textContent = t("restartButton");

  const modeBtnClassic = document.getElementById("modeBtnClassic");
  const modeBtnTimeattack = document.getElementById("modeBtnTimeattack");
  const modeBtnEndless = document.getElementById("modeBtnEndless");
  if (modeBtnClassic) modeBtnClassic.textContent = t("modeClassic");
  if (modeBtnTimeattack) modeBtnTimeattack.textContent = t("modeTimeattack");
  if (modeBtnEndless) modeBtnEndless.textContent = t("modeEndless");

  const diffBtnEasy = document.getElementById("diffBtnEasy");
  const diffBtnNormal = document.getElementById("diffBtnNormal");
  const diffBtnHard = document.getElementById("diffBtnHard");
  if (diffBtnEasy) diffBtnEasy.textContent = t("diffEasy");
  if (diffBtnNormal) diffBtnNormal.textContent = t("diffNormal");
  if (diffBtnHard) diffBtnHard.textContent = t("diffHard");
}

function renderStatusText() {
  finalScoreEl.textContent = `${t("finalScore")} ${Math.floor(state.score)}`;
  shieldStatusEl.textContent = state.pulseCooldown <= 0 ? t("ready") : `${state.pulseCooldown.toFixed(1)}s`;
  const modeDisplay = document.getElementById("modeDisplay");
  if (modeDisplay) modeDisplay.textContent = t(`mode${state.gameMode.charAt(0).toUpperCase() + state.gameMode.slice(1)}`);
  const timerDisplay = document.getElementById("timerDisplay");
  if (timerDisplay) timerDisplay.textContent = Math.ceil(state.timeLeft);
  const finalWaveEl = document.getElementById("finalWave");
  if (finalWaveEl && state.mode === "over") {
    finalWaveEl.textContent = `${t("finalWave")} ${state.wave}`;
    finalWaveEl.classList.remove("hidden");
  } else if (finalWaveEl) {
    finalWaveEl.classList.add("hidden");
  }
}

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const STORAGE_KEY = "lumorix-dropdash-best";
const keys = new Set();

// Mode & difficulty selection
let selectedMode = "classic";
let selectedDiff = "normal";

const DIFFICULTY = {
  easy:   { speedMult: 0.7, spawnMult: 1.4, scoreBonus: 0.8 },
  normal: { speedMult: 1.0, spawnMult: 1.0, scoreBonus: 1.0 },
  hard:   { speedMult: 1.35, spawnMult: 0.72, scoreBonus: 1.5 }
};

const TIME_ATTACK_DURATION = 60;

// Mode/difficulty button wiring
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedMode = btn.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    audio.playClick();
    const hudTimer = document.getElementById("hudTimer");
    if (hudTimer) hudTimer.classList.toggle("hidden", selectedMode !== "timeattack");
  });
});

document.querySelectorAll(".diff-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedDiff = btn.dataset.diff;
    document.querySelectorAll(".diff-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    audio.playClick();
  });
});

function loadBestScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Some locked-down file origins disable storage. The run still plays normally.
  }
}

const state = {
  mode: "title",
  gameMode: "classic",
  difficulty: "normal",
  score: 0,
  best: loadBestScore(),
  time: 0,
  timeLeft: TIME_ATTACK_DURATION,
  spawnTimer: 0,
  coreTimer: 0,
  powerupTimer: 0,
  pulseCooldown: 0,
  pulseTime: 0,
  shake: 0,
  wave: 1,
  waveTimer: 0,
  waveClearTimer: 0,
  activePowerup: null,
  powerupTimeLeft: 0,
  scoreMultiplier: 1,
  floatingTexts: [],
  player: { x: WIDTH / 2 - 18, y: HEIGHT - 74, w: 36, h: 36, vx: 0, ghost: false },
  hazards: [],
  cores: [],
  powerups: [],
  sparks: [],
  stars: Array.from({ length: 96 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    s: 0.6 + Math.random() * 1.9,
    v: 18 + Math.random() * 58
  }))
};

bestScoreEl.textContent = state.best;

function resetGame() {
  state.mode = "playing";
  state.gameMode = selectedMode;
  state.difficulty = selectedDiff;
  state.score = 0;
  state.time = 0;
  state.timeLeft = TIME_ATTACK_DURATION;
  state.spawnTimer = 0;
  state.coreTimer = 1.2;
  state.powerupTimer = 8 + Math.random() * 6;
  state.pulseCooldown = 0;
  state.pulseTime = 0;
  state.shake = 0;
  state.wave = 1;
  state.waveTimer = 0;
  state.waveClearTimer = 0;
  state.activePowerup = null;
  state.powerupTimeLeft = 0;
  state.scoreMultiplier = 1;
  state.floatingTexts = [];
  state.hazards = [];
  state.cores = [];
  state.powerups = [];
  state.sparks = [];
  state.player.x = WIDTH / 2 - state.player.w / 2;
  state.player.y = HEIGHT - 74;
  state.player.vx = 0;
  state.player.ghost = false;
  titleScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  const hudTimer = document.getElementById("hudTimer");
  if (hudTimer) hudTimer.classList.toggle("hidden", state.gameMode !== "timeattack");
}

function returnToTitle() {
  state.mode = "title";
  state.hazards = [];
  state.cores = [];
  state.powerups = [];
  state.sparks = [];
  state.floatingTexts = [];
  state.activePowerup = null;
  state.powerupTimeLeft = 0;
  state.scoreMultiplier = 1;
  state.player.ghost = false;
  keys.clear();

  titleScreen.classList.remove("hidden");
  gameOverScreen.classList.add("hidden");

  const hudTimer = document.getElementById("hudTimer");
  if (hudTimer) hudTimer.classList.toggle("hidden", selectedMode !== "timeattack");
  renderStatusText();
}

function gameOver(timeUp = false) {
  state.mode = "over";
  state.shake = timeUp ? 4 : 14;
  audio.playCrash();
  state.best = Math.max(state.best, Math.floor(state.score));
  saveBestScore(state.best);
  bestScoreEl.textContent = state.best;
  const gameOverTitle = document.getElementById("gameOverTitle");
  if (gameOverTitle) gameOverTitle.textContent = timeUp ? t("gameOverTitleTime") : t("gameOverTitle");
  renderStatusText();
  gameOverScreen.classList.remove("hidden");
}

function spawnPowerup() {
  const types = ["slow", "double", "ghost"];
  const type = types[Math.floor(Math.random() * types.length)];
  const colors = { slow: "#a78bfa", double: "#f6ff80", ghost: "#80ffca" };
  state.powerups.push({
    x: 40 + Math.random() * (WIDTH - 80),
    y: -20,
    r: 14,
    speed: 100 + Math.random() * 50,
    wobble: Math.random() * Math.PI * 2,
    type,
    color: colors[type]
  });
}

function activatePowerup(type) {
  const durations = { slow: 5, double: 8, ghost: 4 };
  const labels = { slow: "powerupSlow", double: "powerupDouble", ghost: "powerupGhost" };
  state.activePowerup = type;
  state.powerupTimeLeft = durations[type];
  if (type === "double") state.scoreMultiplier = 2;
  if (type === "ghost") state.player.ghost = true;
  addFloatingText(t(labels[type]), WIDTH / 2, HEIGHT / 2 - 60, type === "slow" ? "#a78bfa" : type === "double" ? "#f6ff80" : "#80ffca");
  audio.playCollect();
}

function addFloatingText(text, x, y, color) {
  state.floatingTexts.push({ text, x, y, color, age: 0, life: 1.4 });
}

function spawnHazard() {
  const diff = DIFFICULTY[state.difficulty];
  const waveBoost = (state.wave - 1) * 12;
  const size = 24 + Math.random() * 28;
  const speed = (160 + Math.min(210, state.time * 9) + Math.random() * 70 + waveBoost) * diff.speedMult;
  const slowMult = state.activePowerup === "slow" ? 0.4 : 1;
  state.hazards.push({
    x: 22 + Math.random() * (WIDTH - 44 - size),
    y: -size,
    w: size,
    h: size,
    rot: Math.random() * Math.PI,
    spin: -2 + Math.random() * 4,
    speed: speed * slowMult
  });
}

function spawnCore() {
  state.cores.push({
    x: 28 + Math.random() * (WIDTH - 56),
    y: -24,
    r: 12,
    speed: 125 + Math.random() * 70,
    wobble: Math.random() * Math.PI * 2
  });
}

function addSparks(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 180;
    const size = 2 + Math.random() * 4;
    state.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.4,
      age: 0,
      color,
      size,
      gravity: color === "#76efff" ? 0 : 80
    });
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectOverlap(circle, rect) {
  const cx = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function pulse() {
  if (state.mode !== "playing" || state.pulseCooldown > 0) {
    return;
  }
  state.pulseCooldown = 5.5;
  state.pulseTime = 0.45;
  state.shake = 4;
  audio.playPulse();
  addSparks(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, "#76efff", 22);
}

function update(dt) {
  state.stars.forEach((star) => {
    star.y += star.v * dt;
    if (star.y > HEIGHT) {
      star.x = Math.random() * WIDTH;
      star.y = -8;
    }
  });

  state.sparks = state.sparks.filter((spark) => {
    spark.age += dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vy += (spark.gravity || 0) * dt;
    spark.vx *= 0.98;
    spark.vy *= 0.98;
    return spark.age < spark.life;
  });

  if (state.mode !== "playing") {
    state.shake = Math.max(0, state.shake - dt * 25);
    return;
  }

  state.time += dt;
  const diff = DIFFICULTY[state.difficulty];
  const baseScoreRate = 12 * diff.scoreBonus * state.scoreMultiplier;
  state.score += dt * baseScoreRate;
  state.spawnTimer -= dt;
  state.coreTimer -= dt;
  state.powerupTimer -= dt;
  state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
  state.pulseTime = Math.max(0, state.pulseTime - dt);
  state.shake = Math.max(0, state.shake - dt * 28);

  // Time Attack countdown
  if (state.gameMode === "timeattack") {
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    if (state.timeLeft <= 0) {
      gameOver(true);
      return;
    }
  }

  // Wave system (Classic & Hard only)
  if (state.gameMode !== "endless") {
    state.waveTimer += dt;
    const waveDuration = 20 + state.wave * 5;
    if (state.waveTimer >= waveDuration) {
      state.wave += 1;
      state.waveTimer = 0;
      state.waveClearTimer = 1.8;
      addFloatingText(`${t("waveNext")} ${state.wave}`, WIDTH / 2, HEIGHT / 2 - 80, "#f6ff80");
      audio.playCollect();
    }
    if (state.waveClearTimer > 0) state.waveClearTimer -= dt;
  }

  // Powerup timer
  if (state.activePowerup) {
    state.powerupTimeLeft -= dt;
    if (state.powerupTimeLeft <= 0) {
      if (state.activePowerup === "double") state.scoreMultiplier = 1;
      if (state.activePowerup === "ghost") state.player.ghost = false;
      state.activePowerup = null;
    }
  }

  // Floating texts
  state.floatingTexts = state.floatingTexts.filter((ft) => {
    ft.age += dt;
    ft.y -= 28 * dt;
    return ft.age < ft.life;
  });

  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const target = (right ? 1 : 0) - (left ? 1 : 0);
  state.player.vx += (target * 520 - state.player.vx) * Math.min(1, dt * 10);
  state.player.x += state.player.vx * dt;
  state.player.x = Math.max(16, Math.min(WIDTH - state.player.w - 16, state.player.x));

  if (state.spawnTimer <= 0) {
    spawnHazard();
    const diff2 = DIFFICULTY[state.difficulty];
    state.spawnTimer = Math.max(0.18, (0.82 - state.time * 0.012) * diff2.spawnMult);
  }

  if (state.coreTimer <= 0) {
    spawnCore();
    state.coreTimer = 2.4 + Math.random() * 1.1;
  }

  if (state.powerupTimer <= 0) {
    spawnPowerup();
    state.powerupTimer = 12 + Math.random() * 10;
  }

  const pulseBox = {
    x: state.player.x - 42,
    y: state.player.y - 42,
    w: state.player.w + 84,
    h: state.player.h + 84
  };

  state.hazards = state.hazards.filter((hazard) => {
    const slowMult = state.activePowerup === "slow" ? 0.4 : 1;
    hazard.y += hazard.speed * slowMult * dt;
    hazard.rot += hazard.spin * dt;

    if (state.pulseTime > 0 && rectsOverlap(hazard, pulseBox)) {
      state.score += 8;
      audio.playDeflect();
      addSparks(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, "#ff4160", 10);
      return false;
    }

    if (rectsOverlap(hazard, state.player)) {
      if (!state.player.ghost) gameOver();
    }
    return hazard.y < HEIGHT + 80;
  });

  state.cores = state.cores.filter((core) => {
    const slowMult = state.activePowerup === "slow" ? 0.4 : 1;
    core.y += core.speed * slowMult * dt;
    core.wobble += dt * 4;
    const liveCore = { x: core.x + Math.sin(core.wobble) * 8, y: core.y, r: core.r };
    if (circleRectOverlap(liveCore, state.player)) {
      state.score += 50 * state.scoreMultiplier;
      audio.playCollect();
      state.pulseCooldown = Math.max(0, state.pulseCooldown - 1.4);
      addSparks(liveCore.x, liveCore.y, "#76efff", 18);
      return false;
    }
    return core.y < HEIGHT + 40;
  });

  state.powerups = state.powerups.filter((pu) => {
    const slowMult = state.activePowerup === "slow" ? 0.4 : 1;
    pu.y += pu.speed * slowMult * dt;
    pu.wobble += dt * 3;
    const livePu = { x: pu.x + Math.sin(pu.wobble) * 6, y: pu.y, r: pu.r };
    if (circleRectOverlap(livePu, state.player)) {
      activatePowerup(pu.type);
      addSparks(livePu.x, livePu.y, pu.color, 22);
      return false;
    }
    return pu.y < HEIGHT + 40;
  });
}

function drawPlayer() {
  const p = state.player;
  const glow = state.pulseTime > 0 ? 28 : 12;
  const alpha = p.ghost ? 0.38 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.shadowColor = p.ghost ? "#80ffca" : "#76efff";
  ctx.shadowBlur = p.ghost ? 32 : glow;
  ctx.fillStyle = p.ghost ? "#80ffca" : "#effcff";
  ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  ctx.fillStyle = "#0b171e";
  ctx.fillRect(-9, -9, 18, 18);
  ctx.globalAlpha = 1;
  ctx.restore();

  if (state.pulseTime > 0) {
    ctx.save();
    const pulseRadius = 82 - state.pulseTime * 40;
    ctx.shadowColor = "rgba(118, 239, 255, 0.8)";
    ctx.shadowBlur = 28;
    ctx.strokeStyle = `rgba(118, 239, 255, ${state.pulseTime * 1.5})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(246, 255, 128, ${state.pulseTime * 0.8})`;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, pulseRadius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#08101f");
  gradient.addColorStop(0.55, "#071018");
  gradient.addColorStop(1, "#04070d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(180, 245, 255, 0.56)";
  state.stars.forEach((star) => ctx.fillRect(star.x, star.y, star.s, star.s * 2.1));

  ctx.strokeStyle = "rgba(118, 239, 255, 0.1)";
  ctx.lineWidth = 1;
  for (let x = 80; x < WIDTH; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 80, HEIGHT);
    ctx.stroke();
  }

  state.cores.forEach((core) => {
    const x = core.x + Math.sin(core.wobble) * 8;
    ctx.save();
    ctx.translate(x, core.y);
    
    // Outer glow
    ctx.shadowColor = "rgba(118, 239, 255, 0.6)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "rgba(118, 239, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(0, 0, core.r + 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Main core
    ctx.shadowColor = "#76efff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#76efff";
    ctx.beginPath();
    ctx.arc(0, 0, core.r, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner light
    ctx.fillStyle = "#f6ff80";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Shimmer ring
    ctx.strokeStyle = "rgba(246, 255, 128, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, core.r - 2, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  });

  state.hazards.forEach((hazard) => {
    ctx.save();
    ctx.translate(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2);
    ctx.rotate(hazard.rot);
    
    // Outer glow aura
    ctx.shadowColor = "rgba(255, 65, 96, 0.4)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(255, 65, 96, 0.15)";
    ctx.fillRect(-hazard.w / 2 - 8, -hazard.h / 2 - 8, hazard.w + 16, hazard.h + 16);
    
    // Main hazard
    ctx.shadowColor = "#ff4160";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ff4160";
    ctx.fillRect(-hazard.w / 2, -hazard.h / 2, hazard.w, hazard.h);
    
    // Highlight stripe
    ctx.fillStyle = "#ffc3ce";
    ctx.fillRect(-hazard.w / 2 + 5, -hazard.h / 2 + 5, hazard.w - 10, 4);
    
    // Edge glow
    ctx.strokeStyle = "rgba(255, 195, 206, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-hazard.w / 2, -hazard.h / 2, hazard.w, hazard.h);
    
    ctx.restore();
  });

  drawPlayer();

  // Draw powerup items
  state.powerups.forEach((pu) => {
    const x = pu.x + Math.sin(pu.wobble) * 6;
    ctx.save();
    ctx.translate(x, pu.y);
    ctx.shadowColor = pu.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = pu.color + "44";
    ctx.beginPath();
    ctx.arc(0, 0, pu.r + 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pu.color;
    ctx.beginPath();
    ctx.arc(0, 0, pu.r, 0, Math.PI * 2);
    ctx.fill();
    // Star symbol inside
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pu.type === "slow" ? "S" : pu.type === "double" ? "2x" : "G", 0, 0.5);
    ctx.restore();
  });

  state.sparks.forEach((spark) => {
    const alpha = 1 - spark.age / spark.life;
    const size = spark.size || 3;
    ctx.fillStyle = spark.color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
    ctx.globalAlpha = alpha;
    ctx.shadowColor = spark.color;
    ctx.shadowBlur = size * 1.5;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  });

  // Floating texts (wave clear, powerup labels)
  state.floatingTexts.forEach((ft) => {
    const alpha = Math.min(1, 1 - (ft.age / ft.life - 0.6) * 2.5);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = ft.color;
    ctx.font = "900 28px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });

  // Active powerup HUD bar
  if (state.activePowerup && state.mode === "playing") {
    const colors = { slow: "#a78bfa", double: "#f6ff80", ghost: "#80ffca" };
    const durations = { slow: 5, double: 8, ghost: 4 };
    const color = colors[state.activePowerup];
    const fraction = state.powerupTimeLeft / durations[state.activePowerup];
    const barW = 160;
    const barH = 8;
    const barX = WIDTH / 2 - barW / 2;
    const barY = HEIGHT - 28;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barW * fraction, barH);
    ctx.restore();
  }

  // Wave banner
  if (state.waveClearTimer > 0 && state.mode === "playing") {
    const alpha = Math.min(1, state.waveClearTimer * 1.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f6ff8044";
    ctx.fillRect(0, HEIGHT / 2 - 54, WIDTH, 54);
    ctx.shadowColor = "#f6ff80";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#f6ff80";
    ctx.font = "900 36px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${t("waveNext")} ${state.wave} — ${t("waveClear")}`, WIDTH / 2, HEIGHT / 2 - 27);
    ctx.restore();
  }

  if (state.mode === "paused") {
    ctx.fillStyle = "rgba(3, 6, 12, 0.58)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 48px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(t("paused"), WIDTH / 2, HEIGHT / 2);
  }

  ctx.restore();

  scoreEl.textContent = Math.floor(state.score);
  bestScoreEl.textContent = state.best;
  renderStatusText();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", () => {
  audio.playClick();
  resetGame();
});
restartButton.addEventListener("click", () => {
  audio.playClick();
  resetGame();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "a", "d", " ", "p", "enter", "escape"].includes(key)) {
    event.preventDefault();
  }
  if (key === "escape" && state.mode !== "title") {
    audio.playClick();
    returnToTitle();
  } else if (key === " " || key === "spacebar") {
    pulse();
  } else if (key === "enter" && state.mode !== "playing") {
    audio.playClick();
    resetGame();
  } else if (key === "p" && (state.mode === "playing" || state.mode === "paused")) {
    state.mode = state.mode === "paused" ? "playing" : "paused";
  } else {
    keys.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener("lumorix-language", (event) => {
  currentLanguage = resolveLanguage(event.detail);
  applyStaticTranslations();
  renderStatusText();
});

applyStaticTranslations();
renderStatusText();
audio.init();

requestAnimationFrame(loop);
