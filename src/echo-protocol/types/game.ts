export type EchoMode = "normal" | "hard" | "speedrun";

export type EchoFlag =
  | "trustedJonas"
  | "openedFile"
  | "ignoredCall"
  | "followedMemory"
  | "burnedFile"
  | "acceptedMira"
  | "usedRelay"
  | "openedNullArchive"
  | "sawBadgeMismatch"
  | "promisedRescue"
  | "architectSignal";

export type EchoStatKey = "stress" | "trust" | "insight" | "access" | "integrity";

export type CaseEntryType = "clue" | "diary" | "photo";

export interface CaseEntry {
  id: string;
  type: CaseEntryType;
  text: string;
  sceneId: string;
}

export interface IncomingMessage {
  id: string;
  type: "dispatch" | "jonas" | "system" | "mira";
  from: string;
  text: string;
  sceneId: string;
  createdAt: string;
}

export interface EchoRunSummary {
  id: string;
  runCount: number;
  endingSceneId: string;
  endingTitle: string;
  mode: EchoMode;
  score: number;
  timeRemaining: number;
  combosUnlocked: number;
  achievementsUnlocked: number;
  recordedAt: string;
}

export interface EchoActionReport {
  sceneTitle: string;
  nextSceneTitle: string;
  choiceLabel: string;
  summary: string;
  evidenceNote: string;
  timeCost: number;
  createdAt: string;
}

export interface EchoGameState {
  currentSceneId: string;
  mode: EchoMode;
  runCount: number;
  flags: Partial<Record<EchoFlag, boolean>>;
  realityShiftLevel: number;
  stress: number;
  trust: number;
  insight: number;
  access: number;
  integrity: number;
  score: number;
  maxTime: number;
  timeRemaining: number;
  caseLog: CaseEntry[];
  messages: IncomingMessage[];
  unlockedCombos: string[];
  unlockedAchievements: string[];
  completedRuns: EchoRunSummary[];
  lastActionReport: EchoActionReport | null;
  shiftLog: EchoActionReport[];
  seenCutscenes: string[];
  sceneVisits: Record<string, number>;
  decisions: string[];
  startedAt: string;
  updatedAt: string;
}

export type SceneEffect =
  | { type: "setFlag"; flag: EchoFlag; value: boolean }
  | { type: "shift"; amount: number }
  | { type: "stat"; stat: EchoStatKey; amount: number }
  | { type: "score"; amount: number }
  | { type: "addLog"; entryType: CaseEntryType; text: string }
  | {
      type: "addMessage";
      messageType: IncomingMessage["type"];
      from: string;
      text: string;
    };

export type ChoiceRequirement =
  | { type: "flag"; flag: EchoFlag; value: boolean; label: string }
  | {
      type: "stat";
      stat: EchoStatKey | "realityShiftLevel";
      min?: number;
      max?: number;
      label: string;
    }
  | { type: "combo"; comboId: string; label: string };

export interface SceneChoice {
  id: string;
  label: string;
  nextSceneId: string;
  effects: SceneEffect[];
  timeCost?: number;
  preview?: string;
  requirements?: ChoiceRequirement[];
}

export interface EchoScene {
  id: string;
  title: string;
  location: string;
  objective: string;
  ambience: string;
  visualTheme: "office" | "archive" | "harbor" | "signal" | "red";
  text: (state: EchoGameState) => string;
  npcLine?: (state: EchoGameState) => string;
  warning?: (state: EchoGameState) => string | null;
  entryMessage?: (state: EchoGameState) => Omit<IncomingMessage, "id" | "createdAt" | "sceneId"> | null;
  defaultCaseEntries?: Array<{ type: CaseEntryType; text: string }>;
  choices: SceneChoice[];
  isEnding?: boolean;
}
