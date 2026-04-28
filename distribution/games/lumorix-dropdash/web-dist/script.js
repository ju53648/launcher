"use strict";

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
    titleEyebrow: "Lumorix Test Title",
    titleIntro: "Slip between falling shards, grab bright cores, and keep the dash lane alive.",
    controlLeft: "A / Left",
    controlRight: "D / Right",
    controlPulse: "Space to pulse",
    startButton: "Start Run",
    gameOverEyebrow: "Run Complete",
    gameOverTitle: "Crash Detected",
    restartButton: "Restart",
    footerAvoid: "Dodge red shards.",
    footerCollect: "Collect cyan cores.",
    footerPause: "Press P to pause.",
    finalScore: "Score",
    paused: "Paused"
  },
  de: {
    scoreLabel: "Punktzahl",
    bestLabel: "Bestwert",
    shieldLabel: "Schild",
    ready: "Bereit",
    titleEyebrow: "Lumorix Testtitel",
    titleIntro: "Weiche fallenden Splittern aus, sammle leuchtende Kerne und halte die Dash-Spur am Leben.",
    controlLeft: "A / Links",
    controlRight: "D / Rechts",
    controlPulse: "Leertaste fuer Impuls",
    startButton: "Run starten",
    gameOverEyebrow: "Durchlauf beendet",
    gameOverTitle: "Crash erkannt",
    restartButton: "Neustart",
    footerAvoid: "Weiche roten Splittern aus.",
    footerCollect: "Sammle cyanfarbene Kerne.",
    footerPause: "Druecke P zum Pausieren.",
    finalScore: "Punktzahl",
    paused: "Pausiert"
  },
  pl: {
    scoreLabel: "Wynik",
    bestLabel: "Rekord",
    shieldLabel: "Tarcza",
    ready: "Gotowe",
    titleEyebrow: "Lumorix Tytul Testowy",
    titleIntro: "Unikaj spadajacych odlamkow, zbieraj jasne rdzenie i utrzymaj pas dash przy zyciu.",
    controlLeft: "A / Lewo",
    controlRight: "D / Prawo",
    controlPulse: "Spacja aby pulsowac",
    startButton: "Start",
    gameOverEyebrow: "Koniec biegu",
    gameOverTitle: "Wykryto crash",
    restartButton: "Restart",
    footerAvoid: "Unikaj czerwonych odlamkow.",
    footerCollect: "Zbieraj cyjanowe rdzenie.",
    footerPause: "Nacisnij P, aby pauzowac.",
    finalScore: "Wynik",
    paused: "Pauza"
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
    gameOverTitle: "gameOverTitle",
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
}

function renderStatusText() {
  finalScoreEl.textContent = `${t("finalScore")} ${Math.floor(state.score)}`;
  shieldStatusEl.textContent = state.pulseCooldown <= 0 ? t("ready") : `${state.pulseCooldown.toFixed(1)}s`;
}

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const STORAGE_KEY = "lumorix-dropdash-best";
const keys = new Set();

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
  score: 0,
  best: loadBestScore(),
  time: 0,
  spawnTimer: 0,
  coreTimer: 0,
  pulseCooldown: 0,
  pulseTime: 0,
  shake: 0,
  player: { x: WIDTH / 2 - 18, y: HEIGHT - 74, w: 36, h: 36, vx: 0 },
  hazards: [],
  cores: [],
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
  state.score = 0;
  state.time = 0;
  state.spawnTimer = 0;
  state.coreTimer = 1.2;
  state.pulseCooldown = 0;
  state.pulseTime = 0;
  state.shake = 0;
  state.hazards = [];
  state.cores = [];
  state.sparks = [];
  state.player.x = WIDTH / 2 - state.player.w / 2;
  state.player.y = HEIGHT - 74;
  state.player.vx = 0;
  titleScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

function gameOver() {
  state.mode = "over";
  state.shake = 14;
  state.best = Math.max(state.best, Math.floor(state.score));
  saveBestScore(state.best);
  bestScoreEl.textContent = state.best;
  renderStatusText();
  gameOverScreen.classList.remove("hidden");
}

function spawnHazard() {
  const size = 24 + Math.random() * 28;
  const speed = 160 + Math.min(210, state.time * 9) + Math.random() * 70;
  state.hazards.push({
    x: 22 + Math.random() * (WIDTH - 44 - size),
    y: -size,
    w: size,
    h: size,
    rot: Math.random() * Math.PI,
    spin: -2 + Math.random() * 4,
    speed
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
    state.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.35,
      age: 0,
      color
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
    spark.vx *= 0.98;
    spark.vy *= 0.98;
    return spark.age < spark.life;
  });

  if (state.mode !== "playing") {
    state.shake = Math.max(0, state.shake - dt * 25);
    return;
  }

  state.time += dt;
  state.score += dt * 12;
  state.spawnTimer -= dt;
  state.coreTimer -= dt;
  state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
  state.pulseTime = Math.max(0, state.pulseTime - dt);
  state.shake = Math.max(0, state.shake - dt * 28);

  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const target = (right ? 1 : 0) - (left ? 1 : 0);
  state.player.vx += (target * 520 - state.player.vx) * Math.min(1, dt * 10);
  state.player.x += state.player.vx * dt;
  state.player.x = Math.max(16, Math.min(WIDTH - state.player.w - 16, state.player.x));

  if (state.spawnTimer <= 0) {
    spawnHazard();
    state.spawnTimer = Math.max(0.24, 0.82 - state.time * 0.012);
  }

  if (state.coreTimer <= 0) {
    spawnCore();
    state.coreTimer = 2.4 + Math.random() * 1.1;
  }

  const pulseBox = {
    x: state.player.x - 42,
    y: state.player.y - 42,
    w: state.player.w + 84,
    h: state.player.h + 84
  };

  state.hazards = state.hazards.filter((hazard) => {
    hazard.y += hazard.speed * dt;
    hazard.rot += hazard.spin * dt;

    if (state.pulseTime > 0 && rectsOverlap(hazard, pulseBox)) {
      state.score += 8;
      addSparks(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, "#ff4160", 10);
      return false;
    }

    if (rectsOverlap(hazard, state.player)) {
      gameOver();
    }
    return hazard.y < HEIGHT + 80;
  });

  state.cores = state.cores.filter((core) => {
    core.y += core.speed * dt;
    core.wobble += dt * 4;
    const liveCore = { x: core.x + Math.sin(core.wobble) * 8, y: core.y, r: core.r };
    if (circleRectOverlap(liveCore, state.player)) {
      state.score += 50;
      state.pulseCooldown = Math.max(0, state.pulseCooldown - 1.4);
      addSparks(liveCore.x, liveCore.y, "#76efff", 18);
      return false;
    }
    return core.y < HEIGHT + 40;
  });
}

function drawPlayer() {
  const p = state.player;
  const glow = state.pulseTime > 0 ? 28 : 12;
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.shadowColor = "#76efff";
  ctx.shadowBlur = glow;
  ctx.fillStyle = "#effcff";
  ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  ctx.fillStyle = "#0b171e";
  ctx.fillRect(-9, -9, 18, 18);
  ctx.restore();

  if (state.pulseTime > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(118, 239, 255, ${state.pulseTime * 1.5})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 82 - state.pulseTime * 40, 0, Math.PI * 2);
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
    ctx.shadowColor = "#76efff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#76efff";
    ctx.beginPath();
    ctx.arc(0, 0, core.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f6ff80";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  state.hazards.forEach((hazard) => {
    ctx.save();
    ctx.translate(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2);
    ctx.rotate(hazard.rot);
    ctx.shadowColor = "#ff4160";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff4160";
    ctx.fillRect(-hazard.w / 2, -hazard.h / 2, hazard.w, hazard.h);
    ctx.fillStyle = "#ffc3ce";
    ctx.fillRect(-hazard.w / 2 + 5, -hazard.h / 2 + 5, hazard.w - 10, 4);
    ctx.restore();
  });

  drawPlayer();

  state.sparks.forEach((spark) => {
    const alpha = 1 - spark.age / spark.life;
    ctx.fillStyle = spark.color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
    ctx.globalAlpha = alpha;
    ctx.fillRect(spark.x, spark.y, 3, 3);
    ctx.globalAlpha = 1;
  });

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

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "a", "d", " ", "p", "enter"].includes(key)) {
    event.preventDefault();
  }
  if (key === " " || key === "spacebar") {
    pulse();
  } else if (key === "enter" && state.mode !== "playing") {
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

requestAnimationFrame(loop);
