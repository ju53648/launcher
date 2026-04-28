export type EchoFlag =
  | "trustedJonas"
  | "openedFile"
  | "ignoredCall"
  | "followedMemory"
  | "burnedFile"
  | "acceptedMira";

export type CaseEntryType = "clue" | "diary" | "photo";

export interface CaseEntry {
  id: string;
  type: CaseEntryType;
  text: string;
  sceneId: string;
}

export interface EchoGameState {
  currentSceneId: string;
  flags: Partial<Record<EchoFlag, boolean>>;
  realityShiftLevel: number;
  caseLog: CaseEntry[];
  decisions: string[];
  startedAt: string;
  updatedAt: string;
}

export type SceneEffect =
  | { type: "setFlag"; flag: EchoFlag; value: boolean }
  | { type: "shift"; amount: number }
  | { type: "addLog"; entryType: CaseEntryType; text: string };

export interface SceneChoice {
  id: string;
  label: string;
  nextSceneId: string;
  effects: SceneEffect[];
}

export interface EchoScene {
  id: string;
  title: string;
  location: string;
  text: (state: EchoGameState) => string;
  npcLine?: (state: EchoGameState) => string;
  warning?: (state: EchoGameState) => string | null;
  defaultCaseEntries?: Array<{ type: CaseEntryType; text: string }>;
  choices: SceneChoice[];
  isEnding?: boolean;
}
