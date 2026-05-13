import * as THREE from "three";

type GameMode = "idle" | "running" | "paused" | "draft" | "over";
type EntityKind = "obstacle" | "pickup";
type SectorObjectiveKind = "collect" | "clear" | "survive" | "boss";
type ObstacleVariant = "mine" | "sweeper";

interface Entity {
  kind: EntityKind;
  lane: number;
  x: number;
  z: number;
  speed: number;
  radius: number;
  rotationSpeed: number;
  bobOffset: number;
  ghosted: boolean;
  variant?: ObstacleVariant;
  laneDrift?: number;
  pickupTag?: "anchor";
  mesh: THREE.Group;
  core: THREE.Mesh;
}

interface SectorConfig {
  id: string;
  title: string;
  subtitle: string;
  objectiveKind: SectorObjectiveKind;
  objectiveTarget: number;
  obstacleRate: number;
  pickupRate: number;
  speedMultiplier: number;
  accent: string;
  reward: string;
  encounter?: "boss" | "eclipse";
}

interface BossEncounter {
  group: THREE.Group;
  core: THREE.Mesh;
  weakpoint: THREE.Mesh;
  warningLanes: THREE.Mesh[];
  attackLane: number;
  attackTimer: number;
  vulnerableTimer: number;
  introTimer: number;
  hitFlashTimer: number;
  health: number;
}

interface EclipseEncounter {
  group: THREE.Group;
  core: THREE.Mesh;
  warningLanes: THREE.Mesh[];
  safeLane: number;
  attackTimer: number;
  introTimer: number;
  pulseTimer: number;
}

interface AudioDirector {
  context: AudioContext;
  master: GainNode;
  droneGain: GainNode;
  pulseGain: GainNode;
  droneOsc: OscillatorNode;
  pulseOsc: OscillatorNode;
  ready: boolean;
  muted: boolean;
}

interface AugmentConfig {
  id: string;
  title: string;
  chip: string;
  rarity: "standard" | "rare" | "legendary";
  description: string;
  perkLabels: string[];
}

interface LoadoutConfig {
  id: string;
  title: string;
  tagline: string;
  description: string;
  accent: string;
  unlockCost: number;
  startingIntegrity: number;
  startingShield: number;
  pulseRegenMultiplier: number;
  pulseCooldownMultiplier: number;
  laneResponse: number;
  scoreMultiplier: number;
  perkLabels: string[];
}

interface PlayerProfile {
  salvage: number;
  unlockedLoadoutIds: string[];
  selectedLoadoutId: string;
  lastRunReport: string;
  tutorialCompleted: boolean;
}

interface GameState {
  mode: GameMode;
  score: number;
  best: number;
  integrity: number;
  shieldCharges: number;
  pulseCharge: number;
  pulseCooldown: number;
  pulseTimer: number;
  laneIndex: number;
  shipX: number;
  distance: number;
  runTime: number;
  magnetTimer: number;
  overdriveTimer: number;
  obstacleTimer: number;
  pickupTimer: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  sectorIndex: number;
  sectorTimer: number;
  sectorProgress: number;
  sectorCompleted: boolean;
  briefingOpen: boolean;
  sectorsCleared: number;
  bossDefeated: boolean;
  salvageEarnedThisRun: number;
  pendingDraft: boolean;
  draftChoices: string[];
  activeAugmentIds: string[];
  bonusPulseRegenMultiplier: number;
  bonusPulseCooldownMultiplier: number;
  bonusLaneResponse: number;
  bonusScoreMultiplier: number;
  bonusMagnetDuration: number;
  bonusOverdriveDuration: number;
  draftRerolls: number;
  tutorialActive: boolean;
  tutorialDismissed: boolean;
  tutorialMoved: boolean;
  tutorialCollected: boolean;
  tutorialPulsed: boolean;
  tutorialCompletionTimer: number;
}

const sectors: SectorConfig[] = [
  {
    id: "relay-harvest",
    title: "Relay Harvest",
    subtitle: "Sammle 5 Signal-Kerne aus dem dichten Bergungsfeld.",
    objectiveKind: "collect",
    objectiveTarget: 5,
    obstacleRate: 0.95,
    pickupRate: 0.58,
    speedMultiplier: 1,
    accent: "#76f1ff",
    reward: "Belohnung: Pulse-Full + Magnetfenster."
  },
  {
    id: "debris-storm",
    title: "Debris Storm",
    subtitle: "Pulse durch 4 markierte Truemmerkerne, ohne die Linie zu verlieren.",
    objectiveKind: "clear",
    objectiveTarget: 4,
    obstacleRate: 0.62,
    pickupRate: 1.18,
    speedMultiplier: 1.1,
    accent: "#ff9d64",
    reward: "Belohnung: Eine Shield-Reserve."
  },
  {
    id: "slipstream-gate",
    title: "Slipstream Gate",
    subtitle: "Halte 12 Sekunden durch den beschleunigten Korridor.",
    objectiveKind: "survive",
    objectiveTarget: 12,
    obstacleRate: 0.8,
    pickupRate: 0.92,
    speedMultiplier: 1.22,
    accent: "#b6abff",
    reward: "Belohnung: Kurzer Overdrive."
  },
  {
    id: "signal-eclipse",
    title: "Signal Eclipse",
    subtitle: "Reite durch die Blackout-Wellen und sichere 3 Anchor-Shards auf der jeweils sicheren Spur.",
    objectiveKind: "collect",
    objectiveTarget: 3,
    obstacleRate: 0,
    pickupRate: 0,
    speedMultiplier: 1.18,
    accent: "#f6dd7a",
    reward: "Belohnung: Eclipse Cache, Magnet-Impuls und massive Salvage-Ausbeute.",
    encounter: "eclipse"
  },
  {
    id: "rift-leviathan",
    title: "Rift Leviathan",
    subtitle: "Triff den exponierten Kern dreimal mit deinem Pulse und ueberlebe die Ladungsbahnen.",
    objectiveKind: "boss",
    objectiveTarget: 3,
    obstacleRate: 0,
    pickupRate: 0,
    speedMultiplier: 1.3,
    accent: "#ff6b8d",
    reward: "Belohnung: Leviathan-Kern, Shield + Overdrive + massiver Score-Schub.",
    encounter: "boss"
  }
];

const loadouts: LoadoutConfig[] = [
  {
    id: "pulse-striker",
    title: "Pulse Striker",
    tagline: "Default rig",
    description: "Der ausgeglichene Bergungsrahmen fuer saubere Linien und schnelle Pulse-Rotation.",
    accent: "#76f1ff",
    unlockCost: 0,
    startingIntegrity: 3,
    startingShield: 0,
    pulseRegenMultiplier: 1.16,
    pulseCooldownMultiplier: 0.86,
    laneResponse: 9,
    scoreMultiplier: 1,
    perkLabels: ["Pulse-Regen+", "Kurze Cooldown-Fenster", "Allrounder"]
  },
  {
    id: "bastion-array",
    title: "Bastion Array",
    tagline: "Heavy frame",
    description: "Schwerere Huelle mit Reserve-Schild und hoeherer Integritaet fuer lange Boss-Runs.",
    accent: "#ffb47d",
    unlockCost: 160,
    startingIntegrity: 4,
    startingShield: 1,
    pulseRegenMultiplier: 0.94,
    pulseCooldownMultiplier: 1.04,
    laneResponse: 7.8,
    scoreMultiplier: 1.05,
    perkLabels: ["Integritaet +1", "Shield x1", "Solider Score-Bonus"]
  },
  {
    id: "slipstream-vector",
    title: "Slipstream Vector",
    tagline: "Agile frame",
    description: "Aggressiver High-speed-Rahmen fuer spaete Sektoren, schnelle Spurwechsel und hoeheres Scoring.",
    accent: "#b6abff",
    unlockCost: 260,
    startingIntegrity: 3,
    startingShield: 0,
    pulseRegenMultiplier: 1.06,
    pulseCooldownMultiplier: 0.9,
    laneResponse: 11.8,
    scoreMultiplier: 1.14,
    perkLabels: ["Schnellere Spurwechsel", "Score-Multiplikator", "Leichtes Pulse-Tempo+"]
  }
];

const augments: AugmentConfig[] = [
  {
    id: "flux-capacitors",
    title: "Flux Capacitors",
    chip: "Pulse Tech",
    rarity: "standard",
    description: "Beschleunigt die Pulse-Schleife und drueckt die Cooldown-Fenster nach unten.",
    perkLabels: ["Pulse-Cooldown -18%", "Aggressiveres Timing", "Boss-ready"]
  },
  {
    id: "phase-fins",
    title: "Phase Fins",
    chip: "Handling",
    rarity: "standard",
    description: "Feinere Seitenruder fuer spaetere Sweeper und harte Spurwechsel in Special-Sektoren.",
    perkLabels: ["Schnellere Spurwechsel", "Besser fuer Eclipse", "Kontrollfokus"]
  },
  {
    id: "magnet-array",
    title: "Magnet Array",
    chip: "Salvage Flow",
    rarity: "standard",
    description: "Verlaengert spaetere Magnet-Fenster und macht Sammelsektoren deutlich wertvoller.",
    perkLabels: ["Magnet +6s", "Collect-Sektoren staerker", "Sauberer Loot-Strom"]
  },
  {
    id: "reactive-shielding",
    title: "Reactive Shielding",
    chip: "Defense",
    rarity: "standard",
    description: "Setzt sofort eine Shield-Reserve und macht harte Treffer in spaeteren Runs verzeihlicher.",
    perkLabels: ["Shield +1 sofort", "Mehr Fehlerpuffer", "Boss-Sicherheit"]
  },
  {
    id: "overdrive-chamber",
    title: "Overdrive Chamber",
    chip: "Burst",
    rarity: "rare",
    description: "Jeder spaetere Overdrive zieht laenger durch und laesst Scoring-Spitzen hoeher steigen.",
    perkLabels: ["Overdrive +5s", "Bessere Burst-Phasen", "Risk-Reward+"]
  },
  {
    id: "salvage-market",
    title: "Salvage Market",
    chip: "Economy",
    rarity: "rare",
    description: "Hebt den Run-Score dauerhaft an und spuelt mehr Wert in den Hangar zurueck.",
    perkLabels: ["Score +10%", "Mehr Salvage", "Meta-Progression+"]
  },
  {
    id: "event-horizon",
    title: "Event Horizon",
    chip: "Legendary Overclock",
    rarity: "legendary",
    description: "Verzieht die Run-Oekonomie brutal nach oben: Boss- und Event-Sektoren eskalieren, aber Scores explodieren ebenfalls.",
    perkLabels: ["Score +18%", "Overdrive +4s", "Legendary high-roll"]
  },
  {
    id: "ghost-lattice",
    title: "Ghost Lattice",
    chip: "Legendary Overclock",
    rarity: "legendary",
    description: "Ein seltenes Pulse-Gewebe, das Cooldowns stark beschleunigt und aggressive Runs fast permanent am Limit haelt.",
    perkLabels: ["Pulse-Regen +22%", "Cooldown -20%", "Hyper-aggressiv"]
  },
  {
    id: "salvage-singularity",
    title: "Salvage Singularity",
    chip: "Rare Prototype",
    rarity: "rare",
    description: "Verdichtet Bergung um das Schiff und macht Magnet-Fenster deutlich wertvoller fuer lange Loops.",
    perkLabels: ["Magnet +10s", "Mehr Salvage sofort", "Smoother collect-runs"]
  }
];

const appShell = document.getElementById("app") as HTMLElement;
const canvas = document.getElementById("game") as HTMLCanvasElement;
const overlay = document.getElementById("overlay") as HTMLElement;
const overlayTitle = document.getElementById("overlay-title") as HTMLElement;
const overlayBody = document.getElementById("overlay-body") as HTMLElement;
const overlayMeta = document.getElementById("overlay-meta") as HTMLElement;
const overlayButton = document.getElementById("overlay-button") as HTMLButtonElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const integrityEl = document.getElementById("integrity") as HTMLElement;
const pulseEl = document.getElementById("pulse") as HTMLElement;
const bestEl = document.getElementById("best") as HTMLElement;
const hintEl = document.getElementById("hint") as HTMLElement;
const sectorChipEl = document.getElementById("sector-chip") as HTMLElement;
const sectorNameEl = document.getElementById("sector-name") as HTMLElement;
const sectorObjectiveEl = document.getElementById("sector-objective") as HTMLElement;
const sectorProgressEl = document.getElementById("sector-progress") as HTMLElement;
const comboEl = document.getElementById("combo") as HTMLElement;
const boostEl = document.getElementById("boost") as HTMLElement;
const shieldEl = document.getElementById("shield") as HTMLElement;
const briefingToggle = document.getElementById("briefing-toggle") as HTMLButtonElement;
const briefingSectorEl = document.getElementById("briefing-sector") as HTMLElement;
const briefingRewardEl = document.getElementById("briefing-reward") as HTMLElement;
const briefingAugmentsEl = document.getElementById("briefing-augments") as HTMLElement;
const briefingAssetsEl = document.getElementById("briefing-assets") as HTMLElement;
const toastEl = document.getElementById("toast") as HTMLElement;
const soundToggleEl = document.getElementById("sound-toggle") as HTMLButtonElement;
const cinematicBannerEl = document.getElementById("cinematic-banner") as HTMLElement;
const cinematicChipEl = document.getElementById("cinematic-chip") as HTMLElement;
const cinematicTitleEl = document.getElementById("cinematic-title") as HTMLElement;
const cinematicBodyEl = document.getElementById("cinematic-body") as HTMLElement;
const activeLoadoutEl = document.getElementById("active-loadout") as HTMLElement;
const salvageBankEl = document.getElementById("salvage-bank") as HTMLElement;
const hangarPanelEl = document.getElementById("hangar-panel") as HTMLElement;
const draftPanelEl = document.getElementById("draft-panel") as HTMLElement;
const draftCopyEl = document.getElementById("draft-copy") as HTMLElement;
const draftRerollsEl = document.getElementById("draft-rerolls") as HTMLElement;
const hangarSalvageEl = document.getElementById("hangar-salvage") as HTMLElement;
const hangarLastRunEl = document.getElementById("hangar-last-run") as HTMLElement;
const loadoutListEl = document.getElementById("loadout-list") as HTMLElement;
const draftListEl = document.getElementById("draft-list") as HTMLElement;
const draftRerollButton = document.getElementById("draft-reroll") as HTMLButtonElement;
const tutorialPanelEl = document.getElementById("tutorial-panel") as HTMLElement;
const tutorialTitleEl = document.getElementById("tutorial-title") as HTMLElement;
const tutorialBodyEl = document.getElementById("tutorial-body") as HTMLElement;
const tutorialButtonEl = document.getElementById("tutorial-button") as HTMLButtonElement;
const tutorialStepMoveEl = document.getElementById("tutorial-step-move") as HTMLElement;
const tutorialStepCollectEl = document.getElementById("tutorial-step-collect") as HTMLElement;
const tutorialStepPulseEl = document.getElementById("tutorial-step-pulse") as HTMLElement;

const lanePositions = [-4.4, 0, 4.4];
const playerZ = 3.2;
const sectorDuration = 18;
const storageKey = "orbit-salvager-best-score";
const profileStorageKey = "orbit-salvager-profile";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#02060c");
scene.fog = new THREE.Fog("#02060c", 18, 80);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 140);
camera.position.set(0, 6.6, 12.6);
camera.lookAt(0, 1.8, -12);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const clock = new THREE.Clock();
const keys = new Set<string>();
const obstacles: Entity[] = [];
const pickups: Entity[] = [];
let bossEncounter: BossEncounter | null = null;
let eclipseEncounter: EclipseEncounter | null = null;
let overlayAction: (() => void) | null = null;
let toastTimer = 0;
let cinematicTimer = 0;
let audioDirector: AudioDirector | null = null;

const playerGroup = new THREE.Group();
const pulseMaterial = new THREE.MeshBasicMaterial({
  color: "#76f1ff",
  transparent: true,
  opacity: 0
});
const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 18, 48), pulseMaterial);
pulseRing.rotation.x = Math.PI / 2;
pulseRing.position.y = 0.16;
playerGroup.add(pulseRing);
let profile = readProfile();

const state: GameState = {
  mode: "idle",
  score: 0,
  best: readBestScore(),
  integrity: 3,
  shieldCharges: 0,
  pulseCharge: 1,
  pulseCooldown: 0,
  pulseTimer: 0,
  laneIndex: 1,
  shipX: 0,
  distance: 0,
  runTime: 0,
  magnetTimer: 0,
  overdriveTimer: 0,
  obstacleTimer: 1.2,
  pickupTimer: 0.8,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  sectorIndex: 0,
  sectorTimer: sectorDuration,
  sectorProgress: 0,
  sectorCompleted: false,
  briefingOpen: false,
  sectorsCleared: 0,
  bossDefeated: false,
  salvageEarnedThisRun: 0,
  pendingDraft: false,
  draftChoices: [],
  activeAugmentIds: [],
  bonusPulseRegenMultiplier: 1,
  bonusPulseCooldownMultiplier: 1,
  bonusLaneResponse: 0,
  bonusScoreMultiplier: 1,
  bonusMagnetDuration: 0,
  bonusOverdriveDuration: 0,
  draftRerolls: 1,
  tutorialActive: !profile.tutorialCompleted,
  tutorialDismissed: false,
  tutorialMoved: false,
  tutorialCollected: false,
  tutorialPulsed: false,
  tutorialCompletionTimer: 0
};

bestEl.textContent = String(state.best);

bootstrapScene();
resetGame(false);
syncHud();
resize();
animate();

window.addEventListener("resize", resize);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
overlayButton.addEventListener("click", () => overlayAction?.());
briefingToggle.addEventListener("click", () => toggleBriefing());
loadoutListEl.addEventListener("click", onLoadoutListClick);
draftListEl.addEventListener("click", onDraftListClick);
draftRerollButton.addEventListener("click", () => rerollDraftChoices());
soundToggleEl.addEventListener("click", () => toggleAudioMute());
tutorialButtonEl.addEventListener("click", () => dismissTutorial());

renderLoadoutDock();
syncProfileHud();
syncAudioHud();

function bootstrapScene() {
  const ambient = new THREE.AmbientLight("#7bb6ff", 1.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#ffe2ad", 1.85);
  sun.position.set(6, 9, 8);
  scene.add(sun);

  const rim = new THREE.PointLight("#5de8ff", 30, 45, 2);
  rim.position.set(0, 6, 3);
  scene.add(rim);

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 140, 18, 48),
    new THREE.MeshStandardMaterial({
      color: "#0b1320",
      emissive: "#0d2230",
      emissiveIntensity: 0.35,
      roughness: 0.82,
      metalness: 0.18,
      wireframe: true
    })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, -0.1, -28);
  scene.add(runway);

  const trackGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 120),
    new THREE.MeshBasicMaterial({
      color: "#0f3859",
      transparent: true,
      opacity: 0.36
    })
  );
  trackGlow.rotation.x = -Math.PI / 2;
  trackGlow.position.set(0, 0.02, -25);
  scene.add(trackGlow);

  const sideRailGeometry = new THREE.BoxGeometry(0.18, 0.18, 130);
  const sideRailMaterial = new THREE.MeshStandardMaterial({
    color: "#6fefff",
    emissive: "#2eb7ff",
    emissiveIntensity: 0.6
  });

  for (const x of [-6.8, 6.8]) {
    const rail = new THREE.Mesh(sideRailGeometry, sideRailMaterial);
    rail.position.set(x, 0.12, -26);
    scene.add(rail);
  }

  buildPlayer();
  addBackgroundStars();
  addPlaceholderBillboards();
}

function buildPlayer() {
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 1.8, 5),
    new THREE.MeshStandardMaterial({
      color: "#f4f8ff",
      emissive: "#2dbbff",
      emissiveIntensity: 0.65,
      metalness: 0.72,
      roughness: 0.26
    })
  );
  core.rotation.z = Math.PI;
  core.rotation.x = Math.PI / 2;
  core.position.y = 0.65;
  playerGroup.add(core);

  const wingMaterial = new THREE.MeshStandardMaterial({
    color: "#fc8f57",
    emissive: "#7f3518",
    emissiveIntensity: 0.4,
    metalness: 0.38,
    roughness: 0.45
  });

  for (const direction of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.44), wingMaterial);
    wing.position.set(direction * 0.86, 0.4, 0);
    wing.rotation.z = direction * 0.24;
    playerGroup.add(wing);
  }

  playerGroup.position.set(0, 0.45, playerZ);
  scene.add(playerGroup);
}

function addBackgroundStars() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 240;
  const positions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    positions[index * 3] = THREE.MathUtils.randFloatSpread(95);
    positions[index * 3 + 1] = THREE.MathUtils.randFloat(8, 34);
    positions[index * 3 + 2] = THREE.MathUtils.randFloat(-110, 20);
  }
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: "#d9f9ff", size: 0.18, transparent: true, opacity: 0.9 })
  );
  scene.add(stars);
}

function addPlaceholderBillboards() {
  const leftVideo = createTextPlate("VIDEO PLACEHOLDER", "Later: intro loop / trailer wall");
  leftVideo.position.set(-14.2, 5.8, -38);
  leftVideo.rotation.y = 0.34;
  leftVideo.scale.setScalar(0.74);
  if (leftVideo.material instanceof THREE.MeshBasicMaterial) {
    leftVideo.material.opacity = 0.42;
  }
  scene.add(leftVideo);

  const rightEvent = createTextPlate("FX PLACEHOLDER", "Later: beacon burst or cutscene cue");
  rightEvent.position.set(14.6, 4.8, -46);
  rightEvent.rotation.y = -0.38;
  rightEvent.scale.setScalar(0.66);
  if (rightEvent.material instanceof THREE.MeshBasicMaterial) {
    rightEvent.material.opacity = 0.34;
  }
  scene.add(rightEvent);
}

function createTextPlate(title: string, subtitle: string) {
  const drawCanvas = document.createElement("canvas");
  drawCanvas.width = 1024;
  drawCanvas.height = 512;
  const drawContext = drawCanvas.getContext("2d");
  if (!drawContext) {
    throw new Error("2D context unavailable for billboard generation.");
  }

  drawContext.fillStyle = "#07131f";
  drawContext.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawContext.strokeStyle = "#66ebff";
  drawContext.lineWidth = 12;
  drawContext.strokeRect(20, 20, drawCanvas.width - 40, drawCanvas.height - 40);
  drawContext.fillStyle = "#7be4ff";
  drawContext.font = "700 78px Trebuchet MS";
  drawContext.fillText(title, 62, 170);
  drawContext.fillStyle = "#f0f6ff";
  drawContext.font = "500 38px Trebuchet MS";
  drawContext.fillText(subtitle, 62, 258);
  drawContext.fillStyle = "#ff9d64";
  drawContext.font = "600 32px Trebuchet MS";
  drawContext.fillText("Swap this panel once the final media is ready.", 62, 354);

  const texture = new THREE.CanvasTexture(drawCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true
  });

  return new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.4), material);
}

function getLoadoutById(id: string) {
  return loadouts.find((loadout) => loadout.id === id) ?? loadouts[0];
}

function getActiveLoadout() {
  return getLoadoutById(profile.selectedLoadoutId);
}

function isLoadoutUnlocked(loadoutId: string) {
  return profile.unlockedLoadoutIds.includes(loadoutId);
}

function unlockLoadout(loadoutId: string) {
  const loadout = getLoadoutById(loadoutId);
  if (isLoadoutUnlocked(loadoutId) || profile.salvage < loadout.unlockCost) {
    return false;
  }

  profile.salvage -= loadout.unlockCost;
  profile.unlockedLoadoutIds.push(loadoutId);
  profile.selectedLoadoutId = loadoutId;
  saveProfile(profile);
  renderLoadoutDock();
  syncProfileHud();
  showToast(`${loadout.title} freigeschaltet.`);
  return true;
}

function selectLoadout(loadoutId: string) {
  if (!isLoadoutUnlocked(loadoutId)) {
    return false;
  }

  profile.selectedLoadoutId = loadoutId;
  saveProfile(profile);
  renderLoadoutDock();
  syncProfileHud();
  showToast(`${getLoadoutById(loadoutId).title} aktiv.`);
  return true;
}

function renderLoadoutDock() {
  loadoutListEl.innerHTML = loadouts
    .map((loadout) => {
      const unlocked = isLoadoutUnlocked(loadout.id);
      const selected = profile.selectedLoadoutId === loadout.id;
      const actionLabel = unlocked
        ? selected
          ? "Ausgewaehlt"
          : "Diesen Rig waehlen"
        : `Freischalten // ${loadout.unlockCost} Salvage`;
      const actionClass = unlocked && !selected ? "loadout-action is-secondary" : "loadout-action";
      return `
        <article class="loadout-card${selected ? " is-selected" : ""}${unlocked ? "" : " is-locked"}" style="--accent:${loadout.accent}">
          <div class="loadout-top">
            <div>
              <p class="loadout-tag">${loadout.tagline}</p>
              <h4 class="loadout-title">${loadout.title}</h4>
            </div>
            <p class="loadout-tag">${unlocked ? (selected ? "active" : "unlocked") : `${loadout.unlockCost} salvage`}</p>
          </div>
          <p class="loadout-copy">${loadout.description}</p>
          <div class="loadout-perks">
            ${loadout.perkLabels.map((label) => `<span>${label}</span>`).join("")}
          </div>
          <button class="${actionClass}" type="button" data-loadout-action="${unlocked ? "select" : "unlock"}" data-loadout-id="${loadout.id}" ${selected ? "disabled" : ""}>
            ${actionLabel}
          </button>
        </article>
      `;
    })
    .join("");
}

function syncProfileHud() {
  const activeLoadout = getActiveLoadout();
  activeLoadoutEl.textContent = `Rig // ${activeLoadout.title}`;
  salvageBankEl.textContent = `Salvage // ${profile.salvage}`;
  hangarSalvageEl.textContent = `${profile.salvage} credits`;
  hangarLastRunEl.textContent = profile.lastRunReport;
}

function getAugmentById(id: string) {
  return augments.find((augment) => augment.id === id) ?? augments[0];
}

function augmentRarityWeight(rarity: AugmentConfig["rarity"]) {
  switch (rarity) {
    case "legendary":
      return 1;
    case "rare":
      return 2;
    case "standard":
      return 5;
  }
}

function weightedPickAugment(available: AugmentConfig[]) {
  const totalWeight = available.reduce((sum, augment) => sum + augmentRarityWeight(augment.rarity), 0);
  let roll = Math.random() * totalWeight;
  for (const augment of available) {
    roll -= augmentRarityWeight(augment.rarity);
    if (roll <= 0) {
      return augment;
    }
  }
  return available[available.length - 1];
}

function renderDraftChoices() {
  draftRerollsEl.textContent = String(state.draftRerolls);
  draftRerollButton.disabled = state.draftRerolls <= 0;
  draftListEl.innerHTML = state.draftChoices
    .map((augmentId) => {
      const augment = getAugmentById(augmentId);
      const rarityLabel =
        augment.rarity === "legendary" ? "legendary overclock" : augment.rarity === "rare" ? "rare prototype" : "run upgrade";
      return `
        <article class="draft-card${augment.rarity === "rare" ? " is-rare" : ""}${augment.rarity === "legendary" ? " is-legendary" : ""}">
          <div class="draft-top">
            <div>
              <p class="draft-tag${augment.rarity === "rare" ? " is-rare" : ""}${augment.rarity === "legendary" ? " is-legendary" : ""}">${augment.chip}</p>
              <h4 class="draft-title">${augment.title}</h4>
            </div>
            <p class="draft-tag${augment.rarity === "rare" ? " is-rare" : ""}${augment.rarity === "legendary" ? " is-legendary" : ""}">${rarityLabel}</p>
          </div>
          <p class="draft-copy">${augment.description}</p>
          <div class="draft-perks">
            ${augment.perkLabels.map((label) => `<span>${label}</span>`).join("")}
          </div>
          <button class="draft-action" type="button" data-augment-id="${augment.id}">
            Diesen Boost nehmen
          </button>
        </article>
      `;
    })
    .join("");
}

function isTutorialComplete() {
  return state.tutorialMoved && state.tutorialCollected && state.tutorialPulsed;
}

function syncTutorialHud() {
  const visible =
    state.tutorialActive &&
    !state.tutorialDismissed &&
    (state.mode === "running" || state.mode === "paused");
  tutorialPanelEl.classList.toggle("is-hidden", !visible);
  appShell.dataset.tutorial = visible ? "visible" : "hidden";

  tutorialStepMoveEl.classList.toggle("is-done", state.tutorialMoved);
  tutorialStepCollectEl.classList.toggle("is-done", state.tutorialCollected);
  tutorialStepPulseEl.classList.toggle("is-done", state.tutorialPulsed);

  if (!visible) {
    return;
  }

  if (isTutorialComplete()) {
    tutorialTitleEl.textContent = "Flight Check komplett";
    tutorialBodyEl.textContent =
      "Spurwechsel, Bergung und Pulse sitzen. Ab hier kannst du den Run ganz normal spielen.";
    tutorialButtonEl.textContent = "Verstanden";
    return;
  }

  tutorialButtonEl.textContent = "Spaeter";

  if (!state.tutorialMoved) {
    tutorialTitleEl.textContent = "Wechsle einmal die Spur";
    tutorialBodyEl.textContent =
      "Tippe A / D oder die Pfeiltasten, damit dein Rig einmal sauber die Lane wechselt.";
    return;
  }

  if (!state.tutorialCollected) {
    tutorialTitleEl.textContent = "Berg den ersten Signal-Kern";
    tutorialBodyEl.textContent =
      "Fliege in einen blauen Kern, um Score, Pulse-Ladung und Flow aufzubauen.";
    return;
  }

  tutorialTitleEl.textContent = "Nutze jetzt deinen Pulse";
  tutorialBodyEl.textContent =
    "Druecke Leertaste, wenn ein Hindernis vor dir liegt. Der Pulse ghostet nahe Gefahren kurz aus.";
}

function markTutorialProgress(step: "move" | "collect" | "pulse") {
  if (!state.tutorialActive) {
    return;
  }

  if (step === "move") {
    state.tutorialMoved = true;
  } else if (step === "collect") {
    state.tutorialCollected = true;
  } else {
    state.tutorialPulsed = true;
  }

  if (isTutorialComplete() && !profile.tutorialCompleted) {
    profile.tutorialCompleted = true;
    saveProfile(profile);
    state.tutorialCompletionTimer = 4.2;
    hintEl.textContent = "Flight Check abgeschlossen. Du bist frei fuer den vollen Salvage-Run.";
    showToast("Flight Check abgeschlossen.");
  }

  syncTutorialHud();
}

function dismissTutorial() {
  if (isTutorialComplete()) {
    state.tutorialActive = false;
  }
  state.tutorialDismissed = true;
  syncTutorialHud();
}

function syncDraftCopy(mode: "default" | "rerolled") {
  if (mode === "rerolled") {
    draftCopyEl.textContent =
      "Reroll eingeloest. Diese Auswahl ist auf seltene oder legendaere Overclocks zugespitzt.";
    return;
  }

  draftCopyEl.textContent =
    state.draftRerolls > 0
      ? `Zwei Upgrades stehen bereit. Du hast noch ${state.draftRerolls} Reroll-Token fuer seltene oder legendaere Overclocks.`
      : "Zwei Upgrades stehen bereit. Eins mitnehmen, dann startet direkt der naechste Sektor.";
}

function buildDraftChoices(forceHighRoll = false) {
  const available = augments.filter((augment) => !state.activeAugmentIds.includes(augment.id));
  const choices: string[] = [];
  const pool = [...available];

  if (forceHighRoll) {
    const special = pool.find((augment) => augment.rarity !== "standard");
    if (special) {
      choices.push(special.id);
      pool.splice(pool.indexOf(special), 1);
    }
  }

  while (choices.length < Math.min(2, available.length) && pool.length > 0) {
    const picked = weightedPickAugment(pool);
    choices.push(picked.id);
    pool.splice(pool.indexOf(picked), 1);
  }

  return choices;
}

function syncAugmentHud() {
  briefingAugmentsEl.textContent =
    state.activeAugmentIds.length === 0
      ? "Noch keine Draft-Upgrades aktiv."
      : state.activeAugmentIds
      .map((augmentId) => getAugmentById(augmentId).title)
          .join(" // ");
}

function applyAugment(augmentId: string) {
  if (state.activeAugmentIds.includes(augmentId)) {
    return;
  }

  state.activeAugmentIds.push(augmentId);
  switch (augmentId) {
    case "flux-capacitors":
      state.bonusPulseCooldownMultiplier *= 0.82;
      break;
    case "phase-fins":
      state.bonusLaneResponse += 2.2;
      break;
    case "magnet-array":
      state.bonusMagnetDuration += 6;
      break;
    case "reactive-shielding":
      state.shieldCharges = Math.min(4, state.shieldCharges + 1);
      break;
    case "overdrive-chamber":
      state.bonusOverdriveDuration += 5;
      break;
    case "salvage-market":
      state.bonusScoreMultiplier *= 1.1;
      state.salvageEarnedThisRun += 8;
      break;
    case "event-horizon":
      state.bonusScoreMultiplier *= 1.18;
      state.bonusOverdriveDuration += 4;
      break;
    case "ghost-lattice":
      state.bonusPulseRegenMultiplier *= 1.22;
      state.bonusPulseCooldownMultiplier *= 0.8;
      break;
    case "salvage-singularity":
      state.bonusMagnetDuration += 10;
      state.salvageEarnedThisRun += 14;
      break;
  }
  syncAugmentHud();
}

function openDraftChoice() {
  state.pendingDraft = false;
  state.mode = "draft";
  clearEntities(obstacles);
  clearEntities(pickups);
  destroyBossEncounter();
  destroyEclipseEncounter();
  state.draftChoices = buildDraftChoices();
  if (state.draftChoices.length === 0) {
    advanceSector();
    resumeRun();
    return;
  }
  syncDraftCopy("default");
  renderDraftChoices();
  showCinematicBanner("Salvage Draft", "Upgrade waehlen", "Dieser Run bekommt jetzt einen klaren Build-Pfad.", 4.4);
  playAudioCue("sector");
  showOverlay(
    "Upgrade Draft",
    "Du hast den Sektor sauber abgeschlossen. Waehle jetzt ein starkes Mid-Run-Upgrade fuer den naechsten Abschnitt.",
    "Draft aktiv",
    "Der Run ist pausiert, bis du einen Boost auswaehlst.",
    () => undefined,
    "draft"
  );
}

function chooseDraftAugment(augmentId: string) {
  applyAugment(augmentId);
  state.draftChoices = [];
  showToast(`${getAugmentById(augmentId).title} aktiviert.`);
  playAudioCue("success");
  advanceSector();
  resumeRun();
}

function onLoadoutListClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>("[data-loadout-id]");
  if (!button) {
    return;
  }

  const loadoutId = button.dataset.loadoutId;
  const action = button.dataset.loadoutAction;
  if (!loadoutId || !action) {
    return;
  }

  if (action === "unlock") {
    if (!unlockLoadout(loadoutId)) {
      showToast("Nicht genug Salvage fuer dieses Rig.");
    }
    return;
  }

  selectLoadout(loadoutId);
}

function onDraftListClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>("[data-augment-id]");
  if (!button) {
    return;
  }

  const augmentId = button.dataset.augmentId;
  if (!augmentId) {
    return;
  }

  chooseDraftAugment(augmentId);
}

function rerollDraftChoices() {
  if (state.mode !== "draft" || state.draftRerolls <= 0) {
    return;
  }

  state.draftRerolls -= 1;
  state.draftChoices = buildDraftChoices(true);
  syncDraftCopy("rerolled");
  renderDraftChoices();
  showToast("Draft neu gerollt.");
  playAudioCue("sector");
}

function ensureAudioDirector() {
  if (audioDirector) {
    return audioDirector;
  }

  const context = new AudioContext();
  const master = context.createGain();
  const droneGain = context.createGain();
  const pulseGain = context.createGain();
  const droneOsc = context.createOscillator();
  const pulseOsc = context.createOscillator();
  const droneFilter = context.createBiquadFilter();
  const pulseFilter = context.createBiquadFilter();

  master.gain.value = 0.18;
  droneGain.gain.value = 0.0001;
  pulseGain.gain.value = 0.0001;
  droneFilter.type = "lowpass";
  droneFilter.frequency.value = 340;
  pulseFilter.type = "bandpass";
  pulseFilter.frequency.value = 720;
  pulseFilter.Q.value = 0.8;

  droneOsc.type = "sawtooth";
  droneOsc.frequency.value = 92;
  pulseOsc.type = "triangle";
  pulseOsc.frequency.value = 186;

  droneOsc.connect(droneFilter);
  droneFilter.connect(droneGain);
  droneGain.connect(master);
  pulseOsc.connect(pulseFilter);
  pulseFilter.connect(pulseGain);
  pulseGain.connect(master);
  master.connect(context.destination);

  droneOsc.start();
  pulseOsc.start();

  audioDirector = {
    context,
    master,
    droneGain,
    pulseGain,
    droneOsc,
    pulseOsc,
    ready: false,
    muted: true
  };

  return audioDirector;
}

function unlockAudio() {
  const director = ensureAudioDirector();
  if (!director.ready) {
    void director.context.resume();
    director.ready = true;
  }
  if (director.muted) {
    director.muted = false;
  }
  syncAudioHud();
}

function toggleAudioMute() {
  const director = ensureAudioDirector();
  if (!director.ready) {
    void director.context.resume();
    director.ready = true;
  }
  director.muted = !director.muted;
  syncAudioHud();
}

function syncAudioHud() {
  const active = audioDirector ? !audioDirector.muted : false;
  soundToggleEl.textContent = active ? "Audio // an" : "Audio // aus";
}

function updateAudioDirector(delta: number) {
  if (!audioDirector || !audioDirector.ready) {
    return;
  }

  const director = audioDirector;
  const currentSector = getCurrentSector();
  const targetMaster = director.muted ? 0.0001 : 0.18;
  const dangerLevel = state.mode === "running" ? (4 - state.integrity) / 3 : 0;
  const encounterBoost =
    currentSector.encounter === "boss" ? 0.16 : currentSector.encounter === "eclipse" ? 0.1 : 0;
  const droneTarget = state.mode === "running" ? 0.05 + dangerLevel * 0.08 + encounterBoost : 0.0001;
  const pulseTarget =
    state.mode === "running"
      ? 0.012 + (state.overdriveTimer > 0 ? 0.05 : 0) + (state.pulseTimer > 0 ? 0.08 : 0)
      : 0.0001;

  director.master.gain.linearRampToValueAtTime(
    targetMaster,
    director.context.currentTime + Math.max(0.05, delta)
  );
  director.droneGain.gain.linearRampToValueAtTime(
    droneTarget,
    director.context.currentTime + Math.max(0.05, delta)
  );
  director.pulseGain.gain.linearRampToValueAtTime(
    pulseTarget,
    director.context.currentTime + Math.max(0.05, delta)
  );
  director.droneOsc.frequency.linearRampToValueAtTime(
    88 + currentSector.speedMultiplier * 12 + encounterBoost * 180,
    director.context.currentTime + Math.max(0.08, delta)
  );
  director.pulseOsc.frequency.linearRampToValueAtTime(
    state.overdriveTimer > 0 ? 220 : currentSector.encounter === "eclipse" ? 172 : 186,
    director.context.currentTime + Math.max(0.08, delta)
  );
}

function playAudioCue(kind: "sector" | "warning" | "success" | "impact" | "boss") {
  if (!audioDirector || !audioDirector.ready || audioDirector.muted) {
    return;
  }

  const ctx = audioDirector.context;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioDirector.master);

  switch (kind) {
    case "sector":
      osc.type = "triangle";
      filter.type = "bandpass";
      filter.frequency.value = 720;
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.22);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      break;
    case "warning":
      osc.type = "square";
      filter.type = "lowpass";
      filter.frequency.value = 420;
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.24);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      break;
    case "success":
      osc.type = "sine";
      filter.type = "bandpass";
      filter.frequency.value = 900;
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.28);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      break;
    case "impact":
      osc.type = "sawtooth";
      filter.type = "lowpass";
      filter.frequency.value = 260;
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(62, now + 0.22);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      break;
    case "boss":
      osc.type = "sawtooth";
      filter.type = "bandpass";
      filter.frequency.value = 280;
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.exponentialRampToValueAtTime(188, now + 0.42);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      break;
  }

  osc.start(now);
  osc.stop(now + 0.55);
}

function showCinematicBanner(chip: string, title: string, body: string, duration = 3.6) {
  cinematicChipEl.textContent = chip;
  cinematicTitleEl.textContent = title;
  cinematicBodyEl.textContent = body;
  cinematicBannerEl.classList.remove("is-hidden");
  cinematicTimer = duration;
}

function spawnPickup(lane = THREE.MathUtils.randInt(0, lanePositions.length - 1), pickupTag?: "anchor") {
  const isAnchor = pickupTag === "anchor";
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(isAnchor ? 0.74 : 0.6, 0),
    new THREE.MeshStandardMaterial({
      color: isAnchor ? "#fff2b8" : "#76f1ff",
      emissive: isAnchor ? "#c8a93b" : "#2fbbd8",
      emissiveIntensity: isAnchor ? 0.96 : 0.75,
      metalness: 0.3,
      roughness: isAnchor ? 0.16 : 0.22
    })
  );

  const group = new THREE.Group();
  group.add(core);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(isAnchor ? 1.02 : 0.84, 0.05, 12, 24),
    new THREE.MeshBasicMaterial({
      color: isAnchor ? "#fff6d6" : "#f3fbff",
      transparent: true,
      opacity: isAnchor ? 0.94 : 0.82
    })
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  if (isAnchor) {
    const beacon = createTextPlate("ANCHOR SHARD", "Later: eclipse shard FX / crystal GLB");
    beacon.scale.setScalar(0.32);
    beacon.position.set(0, 1.55, 0);
    group.add(beacon);
  }

  const entity: Entity = {
    kind: "pickup",
    lane,
    x: lanePositions[lane],
    z: isAnchor ? -58 : -74,
    speed: (isAnchor ? 19 : 17) + Math.random() * 4,
    radius: isAnchor ? 1.05 : 0.9,
    rotationSpeed: THREE.MathUtils.randFloat(-2, 2),
    bobOffset: Math.random() * Math.PI * 2,
    ghosted: false,
    pickupTag,
    mesh: group,
    core
  };

  group.position.set(entity.x, isAnchor ? 1.75 : 1.4, entity.z);
  scene.add(group);
  pickups.push(entity);
}

function createEclipseEncounter() {
  destroyEclipseEncounter();

  const group = new THREE.Group();
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 28, 28),
    new THREE.MeshStandardMaterial({
      color: "#181410",
      emissive: "#e0bb52",
      emissiveIntensity: 0.38,
      metalness: 0.42,
      roughness: 0.24
    })
  );
  group.add(orb);

  const corona = new THREE.Mesh(
    new THREE.TorusGeometry(3.3, 0.16, 18, 64),
    new THREE.MeshBasicMaterial({ color: "#f6dd7a", transparent: true, opacity: 0.58 })
  );
  corona.rotation.x = Math.PI / 2;
  group.add(corona);

  const plate = createTextPlate("ECLIPSE VIDEO SLOT", "Later: eclipse rupture cinematic loop");
  plate.scale.setScalar(0.72);
  plate.position.set(0, 4, -1);
  group.add(plate);

  group.position.set(0, 5.2, -26);
  scene.add(group);

  const warningLanes = lanePositions.map((laneX) => {
    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 28),
      new THREE.MeshBasicMaterial({
        color: "#ff9d64",
        transparent: true,
        opacity: 0
      })
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(laneX, 0.03, -6);
    scene.add(lane);
    return lane;
  });

  eclipseEncounter = {
    group,
    core: orb,
    warningLanes,
    safeLane: THREE.MathUtils.randInt(0, lanePositions.length - 1),
    attackTimer: 3.1,
    introTimer: 2.1,
    pulseTimer: 0
  };
}

function destroyEclipseEncounter() {
  if (!eclipseEncounter) {
    return;
  }

  scene.remove(eclipseEncounter.group);
  for (const lane of eclipseEncounter.warningLanes) {
    scene.remove(lane);
  }
  eclipseEncounter = null;
}

function hasActiveAnchorShard() {
  return pickups.some((pickup) => pickup.pickupTag === "anchor");
}

function updateEclipseEncounter(delta: number) {
  if (!eclipseEncounter) {
    return;
  }

  const eclipse = eclipseEncounter;
  eclipse.introTimer = Math.max(0, eclipse.introTimer - delta);
  eclipse.pulseTimer = Math.max(0, eclipse.pulseTimer - delta);

  eclipse.group.rotation.y += delta * 0.42;
  eclipse.group.position.y = 5.2 + Math.sin(state.runTime * 1.8) * 0.32;
  eclipse.group.position.x = Math.sin(state.runTime * 0.54) * 1.8;

  const orbMaterial = eclipse.core.material;
  if (orbMaterial instanceof THREE.MeshStandardMaterial) {
    orbMaterial.emissiveIntensity = eclipse.pulseTimer > 0 ? 0.8 : 0.38;
    orbMaterial.color.set(eclipse.pulseTimer > 0 ? "#2f250f" : "#181410");
  }

  for (const [laneIndex, lane] of eclipse.warningLanes.entries()) {
    const material = lane.material;
    if (!(material instanceof THREE.MeshBasicMaterial)) {
      continue;
    }

    if (state.sectorCompleted) {
      material.opacity = THREE.MathUtils.damp(material.opacity, 0, 5, delta);
      continue;
    }

    if (eclipse.introTimer > 0) {
      material.opacity = THREE.MathUtils.damp(material.opacity, 0, 6, delta);
      continue;
    }

    const telegraphWindow = eclipse.attackTimer < 1.35;
    const charge = THREE.MathUtils.clamp((1.35 - eclipse.attackTimer) / 1.35, 0, 1);
    material.color.set(laneIndex === eclipse.safeLane ? "#8ff5ff" : "#ff9d64");
    const targetOpacity = telegraphWindow
      ? laneIndex === eclipse.safeLane
        ? 0.12 + charge * 0.18
        : 0.16 + charge * 0.34
      : eclipse.pulseTimer > 0 && laneIndex === eclipse.safeLane
        ? 0.08
        : 0;
    material.opacity = THREE.MathUtils.damp(material.opacity, targetOpacity, 8, delta);
  }

  if (state.sectorCompleted || eclipse.introTimer > 0) {
    return;
  }

  eclipse.attackTimer -= delta;
  if (eclipse.attackTimer > 0) {
    return;
  }

  const safeLaneMatch = Math.abs(state.shipX - lanePositions[eclipse.safeLane]) < 1.7;
  if (!safeLaneMatch) {
    if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      hintEl.textContent = "Eclipse-Welle vom Shield absorbiert.";
      showToast("Shield hat die Blackout-Welle abgefangen.");
      playAudioCue("warning");
    } else {
      state.integrity -= 1;
      state.pulseCharge = Math.max(0, state.pulseCharge - 0.1);
      hintEl.textContent = "Blackout-Welle erwischt. Lies frueher die sichere Spur.";
      showToast(state.integrity <= 1 ? "Eclipse-Welle bringt dich an den Rand." : "Blackout-Welle getroffen.");
      playAudioCue("impact");
      if (state.integrity <= 0) {
        endRun();
        return;
      }
    }
  } else {
    hintEl.textContent = "Sichere Spur gehalten. Anchor-Shard freigelegt.";
    showToast("Blackout geritten. Anchor-Shard liegt frei.");
    playAudioCue("warning");
  }

  if (!hasActiveAnchorShard()) {
    spawnPickup(eclipse.safeLane, "anchor");
  }

  eclipse.pulseTimer = 1.1;
  eclipse.attackTimer = 2.65;
  eclipse.safeLane = THREE.MathUtils.randInt(0, lanePositions.length - 1);
}

function createBossEncounter() {
  destroyBossEncounter();

  const group = new THREE.Group();

  const shell = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.8, 1),
    new THREE.MeshStandardMaterial({
      color: "#2a1431",
      emissive: "#7a1f54",
      emissiveIntensity: 0.6,
      metalness: 0.58,
      roughness: 0.28
    })
  );
  group.add(shell);

  const weakpoint = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 0),
    new THREE.MeshStandardMaterial({
      color: "#ffd4e2",
      emissive: "#ff5c8f",
      emissiveIntensity: 0.95,
      metalness: 0.3,
      roughness: 0.16
    })
  );
  group.add(weakpoint);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(4.6, 0.12, 18, 64),
    new THREE.MeshBasicMaterial({ color: "#ff7aa3", transparent: true, opacity: 0.58 })
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  for (const direction of [-1, 1]) {
    const claw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.34, 7.2, 10),
      new THREE.MeshStandardMaterial({
        color: "#f7f1ff",
        emissive: "#7f75ff",
        emissiveIntensity: 0.24,
        metalness: 0.62,
        roughness: 0.24
      })
    );
    claw.rotation.z = direction * 0.92;
    claw.rotation.x = Math.PI / 2;
    claw.position.set(direction * 3.4, 0.2, -0.4);
    group.add(claw);
  }

  const assetPlate = createTextPlate("BOSS GLB SLOT", "Later: Rift Leviathan cinematic asset");
  assetPlate.scale.setScalar(0.86);
  assetPlate.position.set(0, 4.8, -1.2);
  group.add(assetPlate);

  group.position.set(0, 4.8, -22);
  scene.add(group);

  const warningLanes = lanePositions.map((laneX) => {
    const warning = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 28),
      new THREE.MeshBasicMaterial({
        color: "#ff5c8f",
        transparent: true,
        opacity: 0
      })
    );
    warning.rotation.x = -Math.PI / 2;
    warning.position.set(laneX, 0.03, -6);
    scene.add(warning);
    return warning;
  });

  bossEncounter = {
    group,
    core: shell,
    weakpoint,
    warningLanes,
    attackLane: THREE.MathUtils.randInt(0, lanePositions.length - 1),
    attackTimer: 3.6,
    vulnerableTimer: 0,
    introTimer: 2.4,
    hitFlashTimer: 0,
    health: getCurrentSector().objectiveTarget
  };
}

function destroyBossEncounter() {
  if (!bossEncounter) {
    return;
  }

  scene.remove(bossEncounter.group);
  for (const lane of bossEncounter.warningLanes) {
    scene.remove(lane);
  }
  bossEncounter = null;
}

function updateBossEncounter(delta: number) {
  if (!bossEncounter) {
    return;
  }

  const boss = bossEncounter;
  boss.introTimer = Math.max(0, boss.introTimer - delta);
  boss.vulnerableTimer = Math.max(0, boss.vulnerableTimer - delta);
  boss.hitFlashTimer = Math.max(0, boss.hitFlashTimer - delta);

  const laneBias = lanePositions[boss.attackLane] * 0.7;
  boss.group.position.x = THREE.MathUtils.damp(
    boss.group.position.x,
    laneBias + Math.sin(state.runTime * 0.9) * 1.25,
    2.8,
    delta
  );
  boss.group.position.y = 4.8 + Math.sin(state.runTime * 2.1) * 0.45;
  boss.group.rotation.y += delta * 0.65;
  boss.group.rotation.z = Math.sin(state.runTime * 1.7) * 0.08;

  const weakMaterial = boss.weakpoint.material;
  if (weakMaterial instanceof THREE.MeshStandardMaterial) {
    weakMaterial.emissiveIntensity = boss.vulnerableTimer > 0 ? 1.7 : 0.95;
    weakMaterial.color.set(boss.hitFlashTimer > 0 ? "#ffffff" : "#ffd4e2");
  }

  const coreMaterial = boss.core.material;
  if (coreMaterial instanceof THREE.MeshStandardMaterial) {
    coreMaterial.emissiveIntensity = boss.hitFlashTimer > 0 ? 1.2 : 0.6;
    coreMaterial.color.set(boss.vulnerableTimer > 0 ? "#47253d" : "#2a1431");
  }

  for (const [laneIndex, lane] of boss.warningLanes.entries()) {
    const material = lane.material;
    if (!(material instanceof THREE.MeshBasicMaterial)) {
      continue;
    }

    if (state.sectorCompleted) {
      material.opacity = THREE.MathUtils.damp(material.opacity, 0, 5, delta);
      continue;
    }

    if (boss.introTimer > 0) {
      material.opacity = THREE.MathUtils.damp(material.opacity, 0, 6, delta);
      continue;
    }

    const telegraphWindow = boss.attackTimer < 1.4;
    const charge = THREE.MathUtils.clamp((1.4 - boss.attackTimer) / 1.4, 0, 1);
    const targetOpacity =
      telegraphWindow && laneIndex === boss.attackLane
        ? 0.16 + charge * 0.44
        : boss.vulnerableTimer > 0
          ? 0.06
          : 0;
    material.opacity = THREE.MathUtils.damp(material.opacity, targetOpacity, 7, delta);
  }

  if (state.sectorCompleted || boss.introTimer > 0) {
    return;
  }

  boss.attackTimer -= delta;
  if (boss.attackTimer > 0) {
    return;
  }

  const laneMatch = Math.abs(state.shipX - lanePositions[boss.attackLane]) < 1.7;
  if (laneMatch) {
    if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      hintEl.textContent = "Leviathan-Ladung vom Shield absorbiert.";
      showToast("Shield hat die Leviathan-Ladung geblockt.");
      playAudioCue("warning");
    } else {
      state.integrity -= 1;
      state.pulseCharge = Math.max(0, state.pulseCharge - 0.12);
      hintEl.textContent = "Leviathan-Ladung getroffen. Wechsle frueh die Spur und nutze das Pulse-Fenster.";
      showToast(state.integrity <= 1 ? "Leviathan setzt dich kritisch unter Druck." : "Leviathan-Ladung getroffen.");
      playAudioCue("impact");
      if (state.integrity <= 0) {
        endRun();
        return;
      }
    }
  } else {
    hintEl.textContent = "Leviathan-Schlag ausgewichen. Kernfenster kurz offen.";
    showToast("Ausgewichen. Leviathan-Kern ist exponiert.");
    playAudioCue("warning");
  }

  boss.vulnerableTimer = 1.65;
  boss.attackTimer = Math.max(1.95, 3.2 - state.sectorProgress * 0.28);
  boss.attackLane = THREE.MathUtils.randInt(0, lanePositions.length - 1);
}

function hitBossWithPulse() {
  if (!bossEncounter || state.sectorCompleted) {
    return false;
  }

  if (bossEncounter.introTimer > 0 || bossEncounter.vulnerableTimer <= 0) {
    return false;
  }

  if (Math.abs(bossEncounter.group.position.x - state.shipX) > 4.4) {
    return false;
  }

  bossEncounter.vulnerableTimer = 0;
  bossEncounter.hitFlashTimer = 0.42;
  bossEncounter.health -= 1;
  state.sectorProgress += 1;
  state.score += Math.round((220 + state.combo * 12) * getActiveLoadout().scoreMultiplier);
  state.combo = state.comboTimer > 0 ? state.combo + 2 : 2;
  state.comboTimer = 4.8;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  hintEl.textContent = `Leviathan-Kern getroffen. Noch ${Math.max(0, bossEncounter.health)} Pulse-Hits.`;
  showToast(`Leviathan getroffen // ${Math.max(0, bossEncounter.health)} Kernfenster verbleiben.`);
  playAudioCue("boss");

  if (state.sectorProgress >= getCurrentSector().objectiveTarget || bossEncounter.health <= 0) {
    completeSectorObjective();
    destroyBossEncounter();
  }

  return true;
}

function spawnObstacle() {
  const sector = getCurrentSector();
  const lane = THREE.MathUtils.randInt(0, lanePositions.length - 1);
  const group = new THREE.Group();
  const spawnSweeper =
    (sector.objectiveKind === "survive" && Math.random() < 0.58) ||
    (sector.objectiveKind === "clear" && Math.random() < 0.24);
  const variant: ObstacleVariant = spawnSweeper ? "sweeper" : "mine";
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(variant === "sweeper" ? 0.78 : 0.92, 0),
    new THREE.MeshStandardMaterial({
      color: variant === "sweeper" ? "#b6abff" : "#ff8f64",
      emissive: variant === "sweeper" ? "#4939a9" : "#9c3316",
      emissiveIntensity: 0.42,
      metalness: 0.25,
      roughness: 0.65
    })
  );
  group.add(core);

  if (variant === "mine") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.08, 12, 28),
      new THREE.MeshBasicMaterial({ color: "#ffe1ca", transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  } else {
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: "#f4f8ff",
      emissive: "#7be4ff",
      emissiveIntensity: 0.24,
      metalness: 0.56,
      roughness: 0.32
    });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 0.28), bladeMaterial);
    blade.position.y = 0.08;
    group.add(blade);

    const warningHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.05, 12, 36),
      new THREE.MeshBasicMaterial({ color: "#c1b8ff", transparent: true, opacity: 0.7 })
    );
    warningHalo.rotation.x = Math.PI / 2;
    group.add(warningHalo);
  }

  const entity: Entity = {
    kind: "obstacle",
    lane,
    x: lanePositions[lane],
    z: -68,
    speed: (variant === "sweeper" ? 20 : 18) + Math.random() * 6,
    radius: variant === "sweeper" ? 1.28 : 1.05,
    rotationSpeed: THREE.MathUtils.randFloat(-1.6, 1.6),
    bobOffset: Math.random() * Math.PI * 2,
    ghosted: false,
    variant,
    laneDrift: variant === "sweeper" ? THREE.MathUtils.randFloat(2.6, 4.4) : 0,
    mesh: group,
    core
  };

  group.position.set(entity.x, 1.2, entity.z);
  scene.add(group);
  obstacles.push(entity);
}

function resetGame(startImmediately: boolean) {
  clearEntities(obstacles);
  clearEntities(pickups);
  destroyBossEncounter();
  destroyEclipseEncounter();
  const activeLoadout = getActiveLoadout();

  state.mode = startImmediately ? "running" : "idle";
  state.score = 0;
  state.integrity = activeLoadout.startingIntegrity;
  state.shieldCharges = activeLoadout.startingShield;
  state.pulseCharge = 1;
  state.pulseCooldown = 0;
  state.pulseTimer = 0;
  state.laneIndex = 1;
  state.shipX = 0;
  state.distance = 0;
  state.runTime = 0;
  state.magnetTimer = 0;
  state.overdriveTimer = 0;
  state.obstacleTimer = 1.05;
  state.pickupTimer = 0.6;
  state.combo = 0;
  state.comboTimer = 0;
  state.maxCombo = 0;
  state.sectorsCleared = 0;
  state.bossDefeated = false;
  state.salvageEarnedThisRun = 0;
  state.pendingDraft = false;
  state.draftChoices = [];
  state.activeAugmentIds = [];
  state.bonusPulseRegenMultiplier = 1;
  state.bonusPulseCooldownMultiplier = 1;
  state.bonusLaneResponse = 0;
  state.bonusScoreMultiplier = 1;
  state.bonusMagnetDuration = 0;
  state.bonusOverdriveDuration = 0;
  state.draftRerolls = 1;
  state.tutorialActive = !profile.tutorialCompleted;
  state.tutorialDismissed = false;
  state.tutorialMoved = false;
  state.tutorialCollected = false;
  state.tutorialPulsed = false;
  state.tutorialCompletionTimer = 0;
  toastTimer = 0;
  cinematicTimer = 0;
  toastEl.classList.add("is-hidden");
  cinematicBannerEl.classList.add("is-hidden");
  toggleBriefing(!startImmediately);
  syncProfileHud();
  syncAugmentHud();
  renderLoadoutDock();

  setSector(0, startImmediately);
  syncHud();
  syncSectorHud();
  syncTutorialHud();

  if (startImmediately) {
    unlockAudio();
    hintEl.textContent =
      state.tutorialActive
        ? "Flight Check live: erst Spur wechseln, dann einen Kern bergen und danach den Pulse testen."
        : "Halte die Linie sauber. B oeffnet das Briefing, Esc pausiert den Run.";
    resumeRun();
    return;
  }

  hintEl.textContent =
    "A / D oder Pfeile bewegen, Leertaste aktiviert den Signal-Pulse, B zeigt das Briefing, Esc pausiert.";
  showOverlay(
    profile.tutorialCompleted ? "Salvage Run Initialisieren" : "Flight Check vorbereiten",
    profile.tutorialCompleted
      ? `Orbit Salvager ist jetzt klar als Desktop-Arcade-App mit persistentem Hangar-Deck aufgezogen. Aktives Rig: ${activeLoadout.title}.`
      : `Aktives Rig: ${activeLoadout.title}. Wir gehen im ersten Run nur drei Dinge sauber durch: Spurwechsel, Bergung und Pulse.`,
    profile.tutorialCompleted ? "Run starten" : "Tutorial-Run starten",
    profile.tutorialCompleted
      ? "Waehle unten dein Loadout, investiere Salvage in neue Frames und nimm das beste Rig in den naechsten Run mit."
      : "Der Flight Check bleibt waehrend des ersten Runs als kleine Guide-Karte sichtbar und verschwindet nach den ersten Kernaktionen wieder.",
    () => resetGame(true),
    "hangar"
  );
}

function setSector(index: number, announce: boolean) {
  state.sectorIndex = index;
  state.sectorTimer = sectorDuration;
  state.sectorProgress = 0;
  state.sectorCompleted = false;
  destroyBossEncounter();
  destroyEclipseEncounter();
  if (getCurrentSector().encounter === "boss") {
    createBossEncounter();
  } else if (getCurrentSector().encounter === "eclipse") {
    createEclipseEncounter();
  }
  syncSectorHud();

  if (announce) {
    const sector = getCurrentSector();
    hintEl.textContent = `${sector.title}: ${sector.subtitle} ${sector.reward}`;
    showToast(`${sector.title} online // ${sector.reward}`);
    showCinematicBanner(
      sector.encounter === "boss" ? "Boss Encounter" : sector.encounter === "eclipse" ? "Event Sector" : "Sector Online",
      sector.title,
      sector.subtitle
    );
    playAudioCue(sector.encounter === "boss" ? "boss" : "sector");
  }
}

function advanceSector() {
  const nextIndex = (state.sectorIndex + 1) % sectors.length;
  setSector(nextIndex, true);
}

function getCurrentSector() {
  return sectors[state.sectorIndex];
}

function endRun() {
  state.mode = "over";
  if (state.score > state.best) {
    state.best = state.score;
    saveBestScore(state.best);
  }
  const salvageEarned = Math.max(
    18,
    Math.round(state.score / 26) +
      state.sectorsCleared * 10 +
      (state.bossDefeated ? 34 : 0) +
      state.salvageEarnedThisRun
  );
  state.salvageEarnedThisRun = salvageEarned;
  profile.salvage += salvageEarned;
  profile.lastRunReport = `+${salvageEarned} Salvage aus ${state.score} Score, ${state.sectorsCleared} Sektor(en).`;
  saveProfile(profile);
  renderLoadoutDock();
  syncProfileHud();
  syncHud();
  showCinematicBanner("Run Debrief", "Salvage gesichert", `+${salvageEarned} Credits in den Hangar uebertragen.`, 4.2);
  playAudioCue("success");
  showOverlay(
    "Bergungslinie verloren",
    `Score ${state.score}. Bestwert ${state.best}. Max Combo x${state.maxCombo}. Aus diesem Run wurden ${salvageEarned} neue Salvage-Credits geborgen.`,
    "Noch ein Run",
    "Hangar-Deck ist wieder offen: neues Rig freischalten oder ein anderes Frame fuer den naechsten Run waehlen.",
    () => resetGame(true),
    "hangar"
  );
}

function clearEntities(collection: Entity[]) {
  while (collection.length > 0) {
    const entity = collection.pop();
    if (entity) {
      scene.remove(entity.mesh);
    }
  }
}

function pauseRun() {
  if (state.mode !== "running") {
    return;
  }

  keys.clear();
  state.mode = "paused";
  syncHud();
  showOverlay(
    "Run pausiert",
    `Score ${state.score}. Sector ${String(state.sectorIndex + 1).padStart(2, "0")} laeuft noch offen, sobald du weitermachst.`,
    "Weiter",
    "Esc oder der Button setzen den Desktop-Run genau an dieser Stelle fort.",
    () => resumeRun(),
    "none"
  );
}

function resumeRun() {
  keys.clear();
  state.mode = "running";
  syncHud();
  syncTutorialHud();
  hideOverlay();
  clock.getDelta();
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  if (state.mode === "running") {
    updateGame(delta);
  } else {
    playerGroup.rotation.z = THREE.MathUtils.lerp(playerGroup.rotation.z, 0, 0.08);
    pulseMaterial.opacity = THREE.MathUtils.lerp(pulseMaterial.opacity, 0, 0.12);
    if (toastTimer > 0) {
      toastTimer = Math.max(0, toastTimer - delta);
      if (toastTimer === 0) {
        toastEl.classList.add("is-hidden");
      }
    }
  }

  updateAudioDirector(delta);

  if (cinematicTimer > 0) {
    cinematicTimer = Math.max(0, cinematicTimer - delta);
    if (cinematicTimer === 0) {
      cinematicBannerEl.classList.add("is-hidden");
    }
  }

  renderer.render(scene, camera);
}

function updateGame(delta: number) {
  const activeLoadout = getActiveLoadout();
  const previousLaneIndex = state.laneIndex;
  if (keys.has("arrowleft") || keys.has("a")) {
    state.laneIndex = Math.max(0, state.laneIndex - 1);
    keys.delete("arrowleft");
    keys.delete("a");
  }
  if (keys.has("arrowright") || keys.has("d")) {
    state.laneIndex = Math.min(lanePositions.length - 1, state.laneIndex + 1);
    keys.delete("arrowright");
    keys.delete("d");
  }
  if (state.laneIndex !== previousLaneIndex) {
    markTutorialProgress("move");
  }

  const sector = getCurrentSector();
  const specialEncounter = sector.encounter;
  const travelSpeed = 24 * sector.speedMultiplier;
  const scoreMultiplier =
    (state.overdriveTimer > 0 ? 1.7 : 1) *
    activeLoadout.scoreMultiplier *
    state.bonusScoreMultiplier;

  state.shipX = THREE.MathUtils.damp(
    state.shipX,
    lanePositions[state.laneIndex],
    activeLoadout.laneResponse + state.bonusLaneResponse,
    delta
  );
  playerGroup.position.x = state.shipX;
  playerGroup.rotation.z = THREE.MathUtils.damp(
    playerGroup.rotation.z,
    (lanePositions[state.laneIndex] - state.shipX) * -0.06,
    8,
    delta
  );
  playerGroup.position.y = 0.45 + Math.sin(state.distance * 0.08) * 0.08;

  state.distance += delta * travelSpeed;
  state.runTime += delta;
  state.score += Math.floor(delta * 8 * sector.speedMultiplier * scoreMultiplier);
  state.pulseCharge = Math.min(
    1,
    state.pulseCharge +
      delta *
        (state.overdriveTimer > 0 ? 0.14 : 0.09) *
        activeLoadout.pulseRegenMultiplier *
        state.bonusPulseRegenMultiplier
  );
  state.pulseCooldown = Math.max(
    0,
    state.pulseCooldown -
      delta *
        (state.overdriveTimer > 0 ? 1.35 : 1) *
        (1 / (activeLoadout.pulseCooldownMultiplier * state.bonusPulseCooldownMultiplier))
  );
  state.pulseTimer = Math.max(0, state.pulseTimer - delta);
  state.magnetTimer = Math.max(0, state.magnetTimer - delta);
  state.overdriveTimer = Math.max(0, state.overdriveTimer - delta);
  state.comboTimer = Math.max(0, state.comboTimer - delta);
  state.sectorTimer -= delta;
  toastTimer = Math.max(0, toastTimer - delta);
  state.tutorialCompletionTimer = Math.max(0, state.tutorialCompletionTimer - delta);

  if (toastTimer === 0) {
    toastEl.classList.add("is-hidden");
  }

  if (state.tutorialActive && isTutorialComplete() && state.tutorialCompletionTimer === 0) {
    state.tutorialActive = false;
    state.tutorialDismissed = true;
    syncTutorialHud();
  }

  if (state.comboTimer <= 0 && state.combo > 0) {
    state.combo = 0;
  }

  if (sector.objectiveKind === "survive" && !state.sectorCompleted) {
    state.sectorProgress = Math.min(sector.objectiveTarget, state.sectorProgress + delta);
    if (state.sectorProgress >= sector.objectiveTarget) {
      completeSectorObjective();
    }
  }

  if (specialEncounter === "boss") {
    updateBossEncounter(delta);
  } else if (specialEncounter === "eclipse") {
    updateEclipseEncounter(delta);
  }

  pulseRing.scale.setScalar(1 + (1 - state.pulseTimer) * 2.4);
  pulseMaterial.opacity = state.pulseTimer > 0 ? state.pulseTimer * 0.45 : 0;

  state.obstacleTimer -= delta;
  state.pickupTimer -= delta;

  if (!specialEncounter) {
    if (state.obstacleTimer <= 0) {
      spawnObstacle();
      const baseRate = Math.max(0.34, 1.04 - state.score * 0.0018);
      state.obstacleTimer = baseRate * sector.obstacleRate;
    }

    if (state.pickupTimer <= 0) {
      spawnPickup();
      const baseRate = 1 + Math.random() * 0.8;
      state.pickupTimer = baseRate * sector.pickupRate;
    }
  } else {
    state.obstacleTimer = 1.2;
    state.pickupTimer = 0.9;
  }

  updateEntities(obstacles, delta, travelSpeed);
  updateEntities(pickups, delta, travelSpeed);

  if (state.pendingDraft) {
    openDraftChoice();
    syncHud();
    syncSectorHud();
    return;
  }

  if (specialEncounter && !state.sectorCompleted) {
    state.sectorTimer = Math.max(0.6, state.sectorTimer);
  }

  if (state.sectorCompleted && specialEncounter) {
    state.sectorTimer = Math.min(state.sectorTimer, 4);
  }

  if (state.sectorTimer <= 0) {
    advanceSector();
  }

  syncHud();
  syncSectorHud();
}

function updateEntities(collection: Entity[], delta: number, travelSpeed: number) {
  for (let index = collection.length - 1; index >= 0; index -= 1) {
    const entity = collection[index];
    entity.z += (entity.speed + travelSpeed * 0.45 + state.score * 0.012) * delta;
    if (entity.kind === "obstacle" && entity.variant === "sweeper") {
      entity.x =
        lanePositions[entity.lane] +
        Math.sin(state.distance * 0.08 + entity.bobOffset) * (entity.laneDrift ?? 0);
    } else if (
      entity.kind === "pickup" &&
      state.magnetTimer > 0 &&
      entity.z > -26 &&
      entity.z < playerZ + 6
    ) {
      entity.x = THREE.MathUtils.damp(entity.x, state.shipX, 5.4, delta);
    } else {
      entity.x = lanePositions[entity.lane];
    }
    entity.mesh.position.z = entity.z;
    entity.mesh.position.x = entity.x;
    entity.mesh.position.y = 1.1 + Math.sin(state.distance * 0.12 + entity.bobOffset) * 0.25;
    entity.mesh.rotation.y += entity.rotationSpeed * delta;
    entity.mesh.rotation.x += entity.rotationSpeed * 0.45 * delta;

    if (entity.kind === "obstacle") {
      const material = entity.core.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        const activeColor = entity.variant === "sweeper" ? "#b6abff" : "#ff8f64";
        const activeEmissive = entity.variant === "sweeper" ? "#4939a9" : "#9c3316";
        material.color.set(entity.ghosted ? "#8ff5ff" : activeColor);
        material.emissive.set(entity.ghosted ? "#1d8ca0" : activeEmissive);
        material.opacity = entity.ghosted ? 0.42 : 1;
        material.transparent = entity.ghosted;
      }
    } else if (entity.pickupTag === "anchor") {
      const material = entity.core.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissiveIntensity = 1.05 + Math.sin(state.runTime * 5 + entity.bobOffset) * 0.16;
      }
    }

    const collided =
      Math.abs(entity.z - playerZ) < entity.radius &&
      Math.abs(entity.x - state.shipX) < (entity.variant === "sweeper" ? 3 : 1.7);

    if (collided) {
      if (entity.kind === "pickup") {
        handlePickupCollision(entity);
      } else if (!entity.ghosted) {
        handleObstacleHit(index, collection);
        if (state.mode === "over") {
          return;
        }
      } else {
        handleGhostedClear();
      }

      removeEntity(collection, index);
      continue;
    }

    if (entity.z > 18) {
      removeEntity(collection, index);
    }
  }
}

function handlePickupCollision(entity: Entity) {
  const scoreMultiplier = getActiveLoadout().scoreMultiplier;
  markTutorialProgress("collect");
  state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
  state.comboTimer = 4;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const pickupScore = (entity.pickupTag === "anchor" ? 42 : 18) + state.combo * 8;
  state.score += state.overdriveTimer > 0
    ? Math.round(pickupScore * 1.5 * scoreMultiplier)
    : Math.round(pickupScore * scoreMultiplier);
  state.pulseCharge = Math.min(1, state.pulseCharge + 0.24);

  if (entity.pickupTag === "anchor") {
    hintEl.textContent = "Anchor-Shard gesichert. Eclipse-Fenster stabilisiert.";
    showToast(`Anchor-Shard geborgen // ${Math.floor(state.sectorProgress) + 1} von ${getCurrentSector().objectiveTarget}.`);
    playAudioCue("success");
  }

  if (getCurrentSector().objectiveKind === "collect" && !state.sectorCompleted) {
    state.sectorProgress += 1;
    if (state.sectorProgress >= getCurrentSector().objectiveTarget) {
      completeSectorObjective();
    }
  }
}

function handleGhostedClear() {
  const scoreMultiplier = getActiveLoadout().scoreMultiplier;
  state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
  state.comboTimer = 3.2;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const clearScore = 14 + state.combo * 6;
  state.score += state.overdriveTimer > 0
    ? Math.round(clearScore * 1.5 * scoreMultiplier)
    : Math.round(clearScore * scoreMultiplier);

  if (getCurrentSector().objectiveKind === "clear" && !state.sectorCompleted) {
    state.sectorProgress += 1;
    if (state.sectorProgress >= getCurrentSector().objectiveTarget) {
      completeSectorObjective();
    }
  }
}

function handleObstacleHit(index: number, collection: Entity[]) {
  state.combo = 0;
  state.comboTimer = 0;
  const entity = collection[index];
  if (state.shieldCharges > 0) {
    state.shieldCharges -= 1;
    hintEl.textContent =
      entity?.variant === "sweeper"
        ? "Shield absorbiert einen Sweeper-Treffer. Reserve reduziert."
        : "Shield absorbiert den Einschlag. Reserve reduziert.";
    showToast("Shield-Reserve hat den Treffer aufgefangen.");
    playAudioCue("warning");
    return;
  }

  state.integrity -= 1;
  state.pulseCharge = Math.max(0, state.pulseCharge - 0.15);
  hintEl.textContent =
    entity?.variant === "sweeper"
      ? "Sweeper getroffen. Diese Querschneider muessen frueh gelesen oder gepulst werden."
      : "Treffer kassiert. Combo weggebrochen, Integritaet reduziert.";
  showToast(state.integrity <= 1 ? "Kritische Integritaet." : "Treffer kassiert. Linie neu stabilisieren.");
  playAudioCue("impact");

  if (state.integrity <= 0) {
    removeEntity(collection, index);
    endRun();
  }
}

function completeSectorObjective() {
  if (state.sectorCompleted) {
    return;
  }

  state.sectorCompleted = true;
  state.sectorsCleared += 1;
  const sector = getCurrentSector();
  const scoreMultiplier = getActiveLoadout().scoreMultiplier;

  if (sector.encounter === "eclipse") {
    state.score += Math.round(240 * scoreMultiplier);
    state.magnetTimer = Math.max(state.magnetTimer, 12 + state.bonusMagnetDuration);
    state.pulseCharge = 1;
    state.salvageEarnedThisRun += 24;
    state.draftRerolls += 1;
    hintEl.textContent = `${sector.title} abgeschlossen. ${sector.reward}`;
    showToast(`Objective complete // ${sector.reward}`);
    showCinematicBanner("Objective Complete", sector.title, sector.reward, 4.2);
    playAudioCue("success");
    state.pendingDraft = true;
    return;
  }

  switch (sector.objectiveKind) {
    case "collect":
      state.score += Math.round(120 * scoreMultiplier);
      state.pulseCharge = 1;
      state.magnetTimer = Math.max(state.magnetTimer, 10 + state.bonusMagnetDuration);
      break;
    case "clear":
      state.score += Math.round(140 * scoreMultiplier);
      state.shieldCharges = Math.min(3, state.shieldCharges + 1);
      break;
    case "survive":
      state.score += Math.round(160 * scoreMultiplier);
      state.pulseCharge = Math.min(1, state.pulseCharge + 0.45);
      state.overdriveTimer = Math.max(state.overdriveTimer, 8 + state.bonusOverdriveDuration);
      break;
    case "boss":
      state.score += Math.round(420 * scoreMultiplier);
      state.shieldCharges = Math.min(3, state.shieldCharges + 1);
      state.pulseCharge = 1;
      state.overdriveTimer = Math.max(state.overdriveTimer, 12 + state.bonusOverdriveDuration);
      state.bossDefeated = true;
      state.draftRerolls += 1;
      break;
  }

  hintEl.textContent = `${sector.title} abgeschlossen. ${sector.reward}`;
  showToast(`Objective complete // ${sector.reward}`);
  showCinematicBanner("Objective Complete", sector.title, sector.reward, 4.2);
  playAudioCue(sector.encounter === "boss" ? "boss" : "success");
  state.pendingDraft = true;
}

function removeEntity(collection: Entity[], index: number) {
  const [entity] = collection.splice(index, 1);
  if (entity) {
    scene.remove(entity.mesh);
  }
}

function triggerPulse() {
  if (state.mode !== "running" || state.pulseCharge < 1 || state.pulseCooldown > 0) {
    return;
  }

  markTutorialProgress("pulse");
  state.pulseCharge = 0;
  state.pulseCooldown =
    4 * getActiveLoadout().pulseCooldownMultiplier * state.bonusPulseCooldownMultiplier;
  state.pulseTimer = 1;
  playAudioCue("sector");
  hitBossWithPulse();

  for (const obstacle of obstacles) {
    const closeToShip =
      Math.abs(obstacle.x - state.shipX) < 5.2 &&
      obstacle.z > -16 &&
      obstacle.z < playerZ + 10;
    if (closeToShip) {
      obstacle.ghosted = true;
    }
  }
}

function syncHud() {
  const sector = getCurrentSector();
  const activeLoadout = getActiveLoadout();
  scoreEl.textContent = String(state.score);
  integrityEl.textContent = String(state.integrity);
  pulseEl.textContent =
    state.pulseCharge >= 1
      ? "Ready"
      : state.pulseCooldown > 0
        ? `${state.pulseCooldown.toFixed(1)}s`
        : `${Math.round(state.pulseCharge * 100)}%`;
  bestEl.textContent = String(state.best);
  comboEl.textContent = `Combo x${state.combo}`;
  boostEl.textContent = formatActiveBoost();
  shieldEl.textContent = `Shield x${state.shieldCharges}`;
  activeLoadoutEl.textContent = `Rig // ${activeLoadout.title}`;
  appShell.style.setProperty("--accent", sector.accent);
  appShell.dataset.threat =
    state.integrity <= 1 ? "critical" : state.integrity === 2 ? "warning" : "stable";
  appShell.dataset.mode = state.mode;
  syncTutorialHud();
}

function syncSectorHud() {
  const sector = getCurrentSector();
  sectorChipEl.textContent = `Sector ${String(state.sectorIndex + 1).padStart(2, "0")}`;
  sectorChipEl.style.color = sector.accent;
  sectorNameEl.textContent = sector.title;
  sectorObjectiveEl.textContent = `${sector.subtitle} ${sector.reward}`;
  sectorProgressEl.textContent = state.sectorCompleted
    ? "Objective complete"
    : formatSectorProgress(sector);
  briefingSectorEl.textContent = `${sector.subtitle} ${sector.reward}`;
  briefingRewardEl.textContent = formatBriefingReward(sector);
  syncAugmentHud();
  briefingAssetsEl.textContent =
    sector.encounter === "eclipse"
      ? "Platzhalter: Eclipse-Rupture-Video, Anchor-Shard-GLB und sichere-Spur-FX spaeter einsetzen."
      : sector.objectiveKind === "boss"
      ? "Platzhalter: Rift-Leviathan-GLB, Boss-Intro-Video und laneweite Charge-FX spaeter einsetzen."
      : sector.objectiveKind === "survive"
      ? "Platzhalter: Slipstream-Tunnel-Video und Overdrive-FX als spaetere Assets."
      : sector.objectiveKind === "clear"
        ? "Platzhalter: Sweeper-GLB und zerstobene Impact-Partikel spaeter einsetzen."
        : "Platzhalter: Hangar-Intro-Video, Salvage-Drone-GLB und Beacon-FX spaeter einsetzen.";
}

function formatSectorProgress(sector: SectorConfig) {
  if (sector.encounter === "eclipse") {
    return `Anchor ${Math.floor(state.sectorProgress)} / ${sector.objectiveTarget}`;
  }

  switch (sector.objectiveKind) {
    case "collect":
    case "clear":
      return `${Math.floor(state.sectorProgress)} / ${sector.objectiveTarget}`;
    case "survive":
      return `${Math.floor(state.sectorProgress)}s / ${sector.objectiveTarget}s`;
    case "boss":
      return `${Math.floor(state.sectorProgress)} / ${sector.objectiveTarget} pulse hits`;
  }
}

function formatActiveBoost() {
  if (state.overdriveTimer > 0) {
    return `Overdrive ${state.overdriveTimer.toFixed(1)}s`;
  }

  if (state.magnetTimer > 0) {
    return `Magnet ${state.magnetTimer.toFixed(1)}s`;
  }

  return "Boost idle";
}

function formatBriefingReward(sector: SectorConfig) {
  if (sector.encounter === "eclipse") {
    return state.sectorCompleted
      ? state.magnetTimer > 0
        ? `Eclipse Cache live // Magnet ${state.magnetTimer.toFixed(1)}s`
        : "Eclipse Cache gesichert"
      : sector.reward;
  }

  if (!state.sectorCompleted) {
    return sector.reward;
  }

  switch (sector.objectiveKind) {
    case "collect":
      return state.magnetTimer > 0 ? `Magnet live ${state.magnetTimer.toFixed(1)}s` : "Pulse voll";
    case "clear":
      return `Shield-Reserve x${state.shieldCharges}`;
    case "survive":
      return state.overdriveTimer > 0
        ? `Overdrive live ${state.overdriveTimer.toFixed(1)}s`
        : "Boost im Auslauf";
    case "boss":
      return state.overdriveTimer > 0
        ? `Leviathan-Kern aktiv // Overdrive ${state.overdriveTimer.toFixed(1)}s`
        : `Shield-Reserve x${state.shieldCharges}`;
  }
}

function toggleBriefing(force?: boolean) {
  state.briefingOpen = force ?? !state.briefingOpen;
  appShell.classList.toggle("is-briefing-open", state.briefingOpen);
  briefingToggle.textContent = state.briefingOpen
    ? "Briefing ausblenden"
    : "Briefing einblenden";
}

function showToast(message: string) {
  toastEl.textContent = message;
  toastTimer = 3.2;
  toastEl.classList.remove("is-hidden");
}

function showOverlay(
  title: string,
  body: string,
  buttonLabel: string,
  meta: string,
  action: () => void,
  panelMode: "none" | "hangar" | "draft"
) {
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlayMeta.textContent = meta;
  overlayButton.textContent = buttonLabel;
  overlayAction = action;
  hangarPanelEl.classList.toggle("is-hidden", panelMode !== "hangar");
  draftPanelEl.classList.toggle("is-hidden", panelMode !== "draft");
  overlayButton.disabled = panelMode === "draft";
  overlay.classList.remove("is-hidden");
}

function hideOverlay() {
  overlayAction = null;
  overlayButton.disabled = false;
  overlay.classList.add("is-hidden");
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function onKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  if (["a", "d", "arrowleft", "arrowright", " ", "enter"].includes(key)) {
    unlockAudio();
  }

  if (key === "tab" || key === "b") {
    event.preventDefault();
    toggleBriefing();
    return;
  }

  if (key === "escape") {
    event.preventDefault();
    if (state.mode === "running") {
      pauseRun();
    } else if (state.mode === "paused") {
      resumeRun();
    }
    return;
  }

  if (key === " ") {
    event.preventDefault();
    triggerPulse();
    return;
  }

  if (key === "enter") {
    event.preventDefault();
    if (state.mode === "paused") {
      resumeRun();
      return;
    }

    if (state.mode === "idle" || state.mode === "over") {
      if (overlayAction && !overlayButton.disabled) {
        overlayAction();
      } else {
        resetGame(true);
      }
    }
    return;
  }

  keys.add(key);
}

function onKeyUp(event: KeyboardEvent) {
  keys.delete(event.key.toLowerCase());
}

function readProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(profileStorageKey);
    if (!raw) {
      return {
        salvage: 0,
        unlockedLoadoutIds: [loadouts[0].id],
        selectedLoadoutId: loadouts[0].id,
        lastRunReport: "Noch keine Bergung.",
        tutorialCompleted: false
      };
    }

    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const unlockedLoadoutIds = Array.isArray(parsed.unlockedLoadoutIds)
      ? Array.from(new Set([loadouts[0].id, ...parsed.unlockedLoadoutIds]))
      : [loadouts[0].id];
    const selectedLoadoutId =
      typeof parsed.selectedLoadoutId === "string" &&
      unlockedLoadoutIds.includes(parsed.selectedLoadoutId)
        ? parsed.selectedLoadoutId
        : loadouts[0].id;

    return {
      salvage: typeof parsed.salvage === "number" ? Math.max(0, Math.floor(parsed.salvage)) : 0,
      unlockedLoadoutIds,
      selectedLoadoutId,
      lastRunReport:
        typeof parsed.lastRunReport === "string" && parsed.lastRunReport.length > 0
          ? parsed.lastRunReport
          : "Noch keine Bergung.",
      tutorialCompleted: parsed.tutorialCompleted === true
    };
  } catch {
    return {
      salvage: 0,
      unlockedLoadoutIds: [loadouts[0].id],
      selectedLoadoutId: loadouts[0].id,
      lastRunReport: "Noch keine Bergung.",
      tutorialCompleted: false
    };
  }
}

function saveProfile(nextProfile: PlayerProfile) {
  profile = nextProfile;
  try {
    localStorage.setItem(profileStorageKey, JSON.stringify(nextProfile));
  } catch {
    // Ignore browsers that restrict storage in local preview contexts.
  }
}

function readBestScore() {
  try {
    return Number(localStorage.getItem(storageKey) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number) {
  try {
    localStorage.setItem(storageKey, String(score));
  } catch {
    // Ignore browsers that restrict storage in local preview contexts.
  }
}
