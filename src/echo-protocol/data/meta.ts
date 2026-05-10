import type { EchoGameState, EchoMode, SceneEffect } from "../types/game";

interface EchoModeConfig {
  id: EchoMode;
  label: string;
  title: string;
  description: string;
  maxTime: number;
  baselineCost: number;
}

interface RankDefinition {
  id: string;
  title: string;
  minScore: number;
  summary: string;
}

interface ComboDefinition {
  id: string;
  title: string;
  description: string;
  rewardLabel: string;
  qualifies: (state: EchoGameState) => boolean;
  effects: SceneEffect[];
}

interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  qualifies: (state: EchoGameState) => boolean;
}

export const ECHO_MODE_CONFIG: Record<EchoMode, EchoModeConfig> = {
  normal: {
    id: "normal",
    label: "Normal",
    title: "Ermittlungsnacht",
    description: "Solide Zeitreserve, volle Story und genug Luft fuer Kombos.",
    maxTime: 420,
    baselineCost: 16
  },
  hard: {
    id: "hard",
    label: "Hard",
    title: "Nacht ohne Netz",
    description: "Weniger Zeit, mehr Druck und schmerzhaftere Fehlentscheidungen.",
    maxTime: 300,
    baselineCost: 18
  },
  speedrun: {
    id: "speedrun",
    label: "Speedrun",
    title: "Loop im Sprint",
    description: "Kurze, aggressive Route fuer mutige perfekte Durchlaeufe.",
    maxTime: 240,
    baselineCost: 14
  }
};

export const ECHO_RANKS: RankDefinition[] = [
  { id: "cadet", title: "Cadet", minScore: 0, summary: "liest Akten und folgt Befehlen" },
  { id: "officer", title: "Officer", minScore: 40, summary: "stabilisiert erste Widersprueche" },
  { id: "detective", title: "Detective", minScore: 90, summary: "findet Muster zwischen Tatort und Archiv" },
  { id: "senior", title: "Senior", minScore: 140, summary: "ertraegt Echo-Rauschen ohne zu brechen" },
  { id: "expert", title: "Expert", minScore: 200, summary: "liest das System gegen sich selbst" },
  { id: "master", title: "Master", minScore: 270, summary: "beraubt die Schleife ihrer Tarnung" },
  { id: "architect", title: "Architect", minScore: 360, summary: "sieht, wer das Protokoll zuerst gebaut hat" }
];

export function getRank(score: number): RankDefinition {
  return [...ECHO_RANKS].reverse().find((rank) => score >= rank.minScore) ?? ECHO_RANKS[0];
}

export function getNextRank(score: number): RankDefinition | null {
  return ECHO_RANKS.find((rank) => score < rank.minScore) ?? null;
}

function hasEntry(state: EchoGameState, fragment: string) {
  return state.caseLog.some((entry) => entry.text.includes(fragment));
}

function visited(state: EchoGameState, sceneId: string) {
  return (state.sceneVisits[sceneId] ?? 0) > 0 || state.currentSceneId === sceneId;
}

export const ECHO_COMBOS: ComboDefinition[] = [
  {
    id: "harbor-link",
    title: "Harbor Link",
    description: "Das Foto, die Tagebuchseite und der Tatort sprechen ueber dieselbe Route.",
    rewardLabel: "+2 Insight / +1 Access / neuer Spiegelpfad",
    qualifies: (state) =>
      hasEntry(state, "Tatort im Hafen") &&
      (hasEntry(state, "verschwommene Silhouette") || hasEntry(state, "Elias Voss im Hintergrund")),
    effects: [
      {
        type: "addLog",
        entryType: "clue",
        text: "Kombi: Hafenroute bestaetigt. Mira wurde nicht nur versteckt, sondern umgeleitet."
      },
      { type: "stat", stat: "insight", amount: 2 },
      { type: "stat", stat: "access", amount: 1 },
      { type: "score", amount: 35 }
    ]
  },
  {
    id: "jonas-dossier",
    title: "Jonas Dossier",
    description: "Der anonyme Anruf und Jonas' Dienstmarke passen nicht zur offiziellen Chronik.",
    rewardLabel: "+1 Insight / +1 Access / Konfrontationsroute",
    qualifies: (state) => hasEntry(state, "Anrufer kennt den Tatort") && Boolean(state.flags.sawBadgeMismatch),
    effects: [
      {
        type: "addLog",
        entryType: "clue",
        text: "Kombi: Jonas war vor dir im Nullarchiv und hat Spuren nachcodiert."
      },
      { type: "stat", stat: "insight", amount: 1 },
      { type: "stat", stat: "access", amount: 1 },
      { type: "score", amount: 30 }
    ]
  },
  {
    id: "mirror-handshake",
    title: "Mirror Handshake",
    description: "Vernichtete Aktenreste und zugelassene Erinnerung oeffnen dieselbe Frequenz.",
    rewardLabel: "+1 Integrity / +1 Shift / Mira-Signal klarer",
    qualifies: (state) => Boolean(state.flags.burnedFile && state.flags.followedMemory),
    effects: [
      {
        type: "addLog",
        entryType: "diary",
        text: "Kombi: Das verbrannte Papier antwortet im Spiegel. Jemand hat fuer mich ein Rueckkehrprotokoll gebaut."
      },
      { type: "stat", stat: "integrity", amount: 1 },
      { type: "shift", amount: 1 },
      { type: "score", amount: 30 }
    ]
  },
  {
    id: "architect-trace",
    title: "Architect Trace",
    description: "Alle Muster fuehren zu einem Autor im System: Elias Voss.",
    rewardLabel: "+2 Insight / +45 Score / Architektenpfad",
    qualifies: (state) =>
      state.unlockedCombos.includes("harbor-link") &&
      state.unlockedCombos.includes("mirror-handshake") &&
      state.access >= 3 &&
      state.insight >= 4,
    effects: [
      {
        type: "addLog",
        entryType: "clue",
        text: "Kombi: Das Nullarchiv fuehrt Elias Voss als den ersten Architekten des Echo-Protokolls."
      },
      { type: "setFlag", flag: "architectSignal", value: true },
      { type: "stat", stat: "insight", amount: 2 },
      { type: "score", amount: 45 }
    ]
  }
];

export function getComboById(comboId: string) {
  return ECHO_COMBOS.find((combo) => combo.id === comboId) ?? null;
}

export const ECHO_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-step",
    title: "First Step",
    description: "Triff die erste Entscheidung und oeffne den Fall aktiv.",
    qualifies: (state) => state.decisions.length >= 1
  },
  {
    id: "pattern-seeker",
    title: "Pattern Seeker",
    description: "Entdecke mindestens eine echte Hinweis-Kombination.",
    qualifies: (state) => state.unlockedCombos.length >= 1
  },
  {
    id: "deep-listener",
    title: "Deep Listener",
    description: "Sammle mindestens sechs Live-Nachrichten waehrend eines Durchlaufs.",
    qualifies: (state) => state.messages.length >= 6
  },
  {
    id: "steady-hand",
    title: "Steady Hand",
    description: "Bleibe nach vier Entscheidungen bei maximal zwei Stress.",
    qualifies: (state) => state.decisions.length >= 4 && state.stress <= 2
  },
  {
    id: "night-operator",
    title: "Night Operator",
    description: "Erreiche Funkturm und Nullarchiv im selben Durchlauf.",
    qualifies: (state) => visited(state, "archive-terminal") && visited(state, "relay-tower")
  },
  {
    id: "truth-faced",
    title: "Truth Faced",
    description: "Erreiche das Ende 'Originalprotokoll'.",
    qualifies: (state) => visited(state, "ending-truth")
  },
  {
    id: "redemption-line",
    title: "Redemption Line",
    description: "Fuehre Mira durch die rote Kammer nach draussen.",
    qualifies: (state) => visited(state, "ending-redemption")
  },
  {
    id: "architect-signal",
    title: "Architect Signal",
    description: "Nimm den Architektenpfad bewusst an.",
    qualifies: (state) => visited(state, "ending-architect")
  }
];

export function getAchievementById(achievementId: string) {
  return ECHO_ACHIEVEMENTS.find((achievement) => achievement.id === achievementId) ?? null;
}

export function formatEchoClock(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getEchoChoiceTimeCost(mode: EchoMode, configuredCost?: number) {
  const baseCost = configuredCost ?? ECHO_MODE_CONFIG[mode].baselineCost;
  if (mode === "hard") {
    return baseCost + 2;
  }
  if (mode === "speedrun") {
    return Math.max(6, baseCost - 2);
  }
  return baseCost;
}
