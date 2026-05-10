import { useEffect, useMemo, useRef, useState } from "react";

import {
  ECHO_ACHIEVEMENTS,
  ECHO_COMBOS,
  ECHO_MODE_CONFIG,
  getEchoChoiceTimeCost
} from "./data/meta";
import { getCutsceneById, getCutsceneForScene } from "./data/cutscenes";
import { INITIAL_SCENE_ID, getSceneById } from "./data/scenes";
import { CaseFile } from "./components/CaseFile";
import { CutsceneOverlay } from "./components/CutsceneOverlay";
import { GameScreen } from "./components/GameScreen";
import { StartScreen } from "./components/StartScreen";
import type {
  EchoActionReport,
  EchoGameState,
  EchoMode,
  EchoRunSummary,
  EchoStatKey,
  IncomingMessage,
  SceneChoice,
  SceneEffect
} from "./types/game";
import { echoAudio } from "./utils/audio";
import { clearEchoSave, loadEchoSave, saveEchoState } from "./utils/storage";
import "./styles.css";

function makeInitialState(
  mode: EchoMode = "normal",
  runCount = 1,
  completedRuns: EchoRunSummary[] = []
): EchoGameState {
  const now = new Date().toISOString();
  const config = ECHO_MODE_CONFIG[mode];
  return {
    currentSceneId: INITIAL_SCENE_ID,
    mode,
    runCount,
    flags: {},
    realityShiftLevel: 0,
    stress: 1,
    trust: 0,
    insight: 0,
    access: 0,
    integrity: 8,
    score: 0,
    maxTime: config.maxTime,
    timeRemaining: config.maxTime,
    caseLog: [],
    messages: [],
    unlockedCombos: [],
    unlockedAchievements: [],
    completedRuns,
    lastActionReport: null,
    shiftLog: [],
    seenCutscenes: [],
    sceneVisits: { [INITIAL_SCENE_ID]: 1 },
    decisions: [],
    startedAt: now,
    updatedAt: now
  };
}

function clampStateValue(stat: EchoStatKey, value: number) {
  if (stat === "trust") {
    return Math.max(-3, Math.min(3, value));
  }
  if (stat === "stress") {
    return Math.max(0, Math.min(7, value));
  }
  return Math.max(0, Math.min(10, value));
}

function appendMessage(
  state: EchoGameState,
  payload: Omit<IncomingMessage, "id" | "createdAt">
): EchoGameState {
  const duplicate = state.messages.some(
    (message) =>
      message.sceneId === payload.sceneId &&
      message.from === payload.from &&
      message.text === payload.text
  );
  if (duplicate) {
    return state;
  }

  return {
    ...state,
    messages: [
      {
        ...payload,
        id: `${payload.sceneId}-${payload.from}-${state.messages.length + 1}`,
        createdAt: new Date().toISOString()
      },
      ...state.messages
    ].slice(0, 12)
  };
}

function applyEffects(state: EchoGameState, sceneId: string, effects: SceneEffect[]): EchoGameState {
  let next: EchoGameState = {
    ...state,
    flags: { ...state.flags },
    caseLog: [...state.caseLog],
    messages: [...state.messages]
  };

  for (const effect of effects) {
    if (effect.type === "setFlag") {
      next.flags[effect.flag] = effect.value;
    }

    if (effect.type === "shift") {
      next.realityShiftLevel = Math.max(0, Math.min(7, next.realityShiftLevel + effect.amount));
    }

    if (effect.type === "stat") {
      next[effect.stat] = clampStateValue(effect.stat, next[effect.stat] + effect.amount) as never;
    }

    if (effect.type === "score") {
      next.score = Math.max(0, next.score + effect.amount);
    }

    if (effect.type === "addLog") {
      next.caseLog.push({
        id: `${sceneId}-${effect.entryType}-${next.caseLog.length + 1}`,
        type: effect.entryType,
        text: effect.text,
        sceneId
      });
    }

    if (effect.type === "addMessage") {
      next = appendMessage(next, {
        type: effect.messageType,
        from: effect.from,
        text: effect.text,
        sceneId
      });
    }
  }

  return next;
}

function seedSceneEntries(state: EchoGameState): EchoGameState {
  const scene = getSceneById(state.currentSceneId);
  if (!scene.defaultCaseEntries?.length) return state;

  const next = { ...state, caseLog: [...state.caseLog] };
  for (const entry of scene.defaultCaseEntries) {
    const exists = next.caseLog.some(
      (item) => item.sceneId === scene.id && item.type === entry.type && item.text === entry.text
    );
    if (exists) continue;
    next.caseLog.push({
      id: `${scene.id}-${entry.type}-seed-${next.caseLog.length + 1}`,
      type: entry.type,
      text: entry.text,
      sceneId: scene.id
    });
  }
  return next;
}

function applySceneMessage(state: EchoGameState): EchoGameState {
  const scene = getSceneById(state.currentSceneId);
  if ((state.sceneVisits[scene.id] ?? 0) !== 1 || !scene.entryMessage) {
    return state;
  }

  const message = scene.entryMessage(state);
  if (!message) {
    return state;
  }

  return appendMessage(state, {
    ...message,
    sceneId: scene.id
  });
}

function applyStateAlerts(state: EchoGameState): EchoGameState {
  let next = state;

  if (next.timeRemaining <= 90 && !getSceneById(next.currentSceneId).isEnding) {
    next = appendMessage(next, {
      type: "dispatch",
      from: "Dispatch",
      text: "Schicht kippt. Noch wenig Zeit, bevor der Fall offiziell geschlossen wird.",
      sceneId: next.currentSceneId
    });
  }

  if (next.stress >= 5) {
    next = appendMessage(next, {
      type: "mira",
      from: "Mira?",
      text: "Du atmest wieder so wie kurz vor dem ersten Bruch. Langsamer, Elias.",
      sceneId: next.currentSceneId
    });
  }

  if (next.integrity <= 3) {
    next = appendMessage(next, {
      type: "system",
      from: "CASE SPIRAL",
      text: "Identitaetskoharenz bricht weg. Widersprueche haengen nicht mehr nur an der Akte.",
      sceneId: next.currentSceneId
    });
  }

  return next;
}

function unlockCombos(state: EchoGameState): EchoGameState {
  let next = {
    ...state,
    unlockedCombos: [...state.unlockedCombos]
  };
  let changed = false;

  do {
    changed = false;
    for (const combo of ECHO_COMBOS) {
      if (next.unlockedCombos.includes(combo.id) || !combo.qualifies(next)) {
        continue;
      }

      next.unlockedCombos.push(combo.id);
      next = applyEffects(next, `combo:${combo.id}`, combo.effects);
      next = appendMessage(next, {
        type: "system",
        from: "COMBO",
        text: `${combo.title} freigeschaltet. ${combo.rewardLabel}.`,
        sceneId: next.currentSceneId
      });
      changed = true;
    }
  } while (changed);

  return next;
}

function unlockAchievements(state: EchoGameState): EchoGameState {
  let next = {
    ...state,
    unlockedAchievements: [...state.unlockedAchievements]
  };

  for (const achievement of ECHO_ACHIEVEMENTS) {
    if (next.unlockedAchievements.includes(achievement.id) || !achievement.qualifies(next)) {
      continue;
    }

    next.unlockedAchievements.push(achievement.id);
    next = appendMessage(next, {
      type: "system",
      from: "ACHIEVEMENT",
      text: `${achievement.title}: ${achievement.description}`,
      sceneId: next.currentSceneId
    });
  }

  return next;
}

function decorateState(state: EchoGameState): EchoGameState {
  let next = seedSceneEntries(state);
  next = applyLoopMemory(next);
  next = applySceneMessage(next);
  next = unlockCombos(next);
  next = unlockAchievements(next);
  next = recordCompletedRun(next);
  next = applyStateAlerts(next);
  return next;
}

function applyLoopMemory(state: EchoGameState): EchoGameState {
  if (!state.completedRuns.length) {
    return state;
  }

  let next = {
    ...state,
    caseLog: [...state.caseLog],
    messages: [...state.messages]
  };
  const discoveredEndings = new Set(state.completedRuns.map((run) => run.endingSceneId));
  const memorySceneId = "loop-memory";

  const memoryEntries: Array<{ type: "clue" | "diary"; text: string }> = [];
  if (discoveredEndings.has("ending-truth")) {
    memoryEntries.push({
      type: "clue",
      text: "Loop memory: Irgendwo existiert ein Originalprotokoll mit Elias' eigener Stimme."
    });
  }
  if (discoveredEndings.has("ending-redemption")) {
    memoryEntries.push({
      type: "diary",
      text: "Loop memory: Es gab bereits einen Durchlauf, in dem Mira den Ausgang gesehen hat."
    });
  }
  if (discoveredEndings.has("ending-erasure")) {
    memoryEntries.push({
      type: "diary",
      text: "Loop memory: Auch Abwesenheit laesst sich sauber archivieren. Genau das macht sie gefaehrlich."
    });
  }
  if (discoveredEndings.has("ending-architect")) {
    memoryEntries.push({
      type: "clue",
      text: "Loop memory: Das System hat Elias schon einmal als Autor und nicht nur als Ermittler gefuehrt."
    });
  }

  for (const entry of memoryEntries) {
    const exists = next.caseLog.some(
      (caseEntry) =>
        caseEntry.sceneId === memorySceneId &&
        caseEntry.type === entry.type &&
        caseEntry.text === entry.text
    );
    if (exists) {
      continue;
    }
    next.caseLog.push({
      id: `${memorySceneId}-${entry.type}-${next.caseLog.length + 1}`,
      type: entry.type,
      text: entry.text,
      sceneId: memorySceneId
    });
  }

  if (discoveredEndings.has("ending-loop")) {
    next = appendMessage(next, {
      type: "system",
      from: "LOOP MEMORY",
      text: "Der Anfang fuehlt sich bekannt an, weil er dich bereits ueberlebt hat.",
      sceneId: memorySceneId
    });
  }

  return next;
}

function recordCompletedRun(state: EchoGameState): EchoGameState {
  const scene = getSceneById(state.currentSceneId);
  if (!scene.isEnding) {
    return state;
  }

  const summaryId = `${state.runCount}:${scene.id}`;
  if (state.completedRuns.some((summary) => summary.id === summaryId)) {
    return state;
  }

  const summary: EchoRunSummary = {
    id: summaryId,
    runCount: state.runCount,
    endingSceneId: scene.id,
    endingTitle: scene.title,
    mode: state.mode,
    score: state.score,
    timeRemaining: state.timeRemaining,
    combosUnlocked: state.unlockedCombos.length,
    achievementsUnlocked: state.unlockedAchievements.length,
    recordedAt: new Date().toISOString()
  };

  return {
    ...state,
    completedRuns: [summary, ...state.completedRuns].slice(0, 8)
  };
}

function deriveSceneVisits(
  currentSceneId: string,
  decisions: string[],
  existing?: Record<string, number>
): Record<string, number> {
  const visits: Record<string, number> = { ...(existing ?? {}) };

  for (const decision of decisions) {
    const sceneId = decision.split(":")[0];
    visits[sceneId] = Math.max(visits[sceneId] ?? 0, 1);
  }

  visits[currentSceneId] = Math.max(1, visits[currentSceneId] ?? 0);
  return visits;
}

function hydrateState(rawState: EchoGameState | null): EchoGameState | null {
  if (!rawState?.currentSceneId || !rawState.startedAt) {
    return null;
  }

  const base = makeInitialState(rawState.mode ?? "normal", rawState.runCount ?? 1);
  const hydrated: EchoGameState = {
    ...base,
    ...rawState,
    mode: rawState.mode ?? base.mode,
    runCount: rawState.runCount ?? base.runCount,
    flags: { ...base.flags, ...(rawState.flags ?? {}) },
    caseLog: rawState.caseLog ?? [],
    messages: rawState.messages ?? [],
    unlockedCombos: rawState.unlockedCombos ?? [],
    unlockedAchievements: rawState.unlockedAchievements ?? [],
    completedRuns: rawState.completedRuns ?? [],
    lastActionReport: rawState.lastActionReport ?? null,
    shiftLog: rawState.shiftLog ?? [],
    seenCutscenes: rawState.seenCutscenes ?? [],
    decisions: rawState.decisions ?? [],
    sceneVisits: deriveSceneVisits(
      rawState.currentSceneId,
      rawState.decisions ?? [],
      rawState.sceneVisits
    ),
    timeRemaining:
      typeof rawState.timeRemaining === "number"
        ? Math.max(0, rawState.timeRemaining)
        : base.maxTime,
    maxTime:
      typeof rawState.maxTime === "number"
        ? rawState.maxTime
        : ECHO_MODE_CONFIG[rawState.mode ?? base.mode].maxTime,
    stress: clampStateValue("stress", rawState.stress ?? base.stress),
    trust: clampStateValue("trust", rawState.trust ?? base.trust),
    insight: clampStateValue("insight", rawState.insight ?? base.insight),
    access: clampStateValue("access", rawState.access ?? base.access),
    integrity: clampStateValue("integrity", rawState.integrity ?? base.integrity),
    score: Math.max(0, rawState.score ?? base.score)
  };

  return decorateState(hydrated);
}

function forceTimeEnding(state: EchoGameState): EchoGameState {
  if (state.timeRemaining > 0 || getSceneById(state.currentSceneId).isEnding) {
    return state;
  }

  let next: EchoGameState = {
    ...state,
    currentSceneId: "ending-loop",
    sceneVisits: {
      ...state.sceneVisits,
      "ending-loop": (state.sceneVisits["ending-loop"] ?? 0) + 1
    }
  };

  next = appendMessage(next, {
    type: "dispatch",
    from: "Dispatch",
    text: "Schichtende erreicht. Das Protokoll setzt den Fall auf Anfang, bevor du ihn sauber schliessen kannst.",
    sceneId: "ending-loop"
  });

  return decorateState(next);
}

function computeWarning(state: EchoGameState) {
  const scene = getSceneById(state.currentSceneId);
  if (state.timeRemaining <= 45 && !scene.isEnding) {
    return "SCHICHTFAST ENDE";
  }
  if (state.stress >= 6 && !scene.isEnding) {
    return "STRESSKRITISCH";
  }
  return scene.warning?.(state) ?? null;
}

function buildActionReport(
  previousState: EchoGameState,
  nextState: EchoGameState,
  currentSceneTitle: string,
  choice: SceneChoice,
  timeCost: number
): EchoActionReport {
  const nextScene = getSceneById(choice.nextSceneId);
  const clueDelta =
    nextState.caseLog.filter((entry) => entry.type === "clue").length -
    previousState.caseLog.filter((entry) => entry.type === "clue").length;
  const shiftDelta = nextState.realityShiftLevel - previousState.realityShiftLevel;
  const integrityDelta = nextState.integrity - previousState.integrity;
  const accessDelta = nextState.access - previousState.access;
  const trustDelta = nextState.trust - previousState.trust;
  const stressDelta = nextState.stress - previousState.stress;

  let summary = "Die Spur wurde ohne klaren Bruch weitergeschoben.";
  if (clueDelta > 0 || accessDelta > 0) {
    summary = "Die Wahl hat belastbare Substanz geliefert und den Fall greifbarer gemacht.";
  } else if (trustDelta > 0) {
    summary = "Die Akte wurde menschlicher, aber damit auch persoenlicher und weniger neutral.";
  } else if (integrityDelta > 0 && stressDelta <= 0) {
    summary = "Elias hat sich stabilisiert und damit die Lesbarkeit des Falls geschuetzt.";
  } else if (shiftDelta > 0 || stressDelta > 0) {
    summary = "Der Fall wurde weiter geoeffnet, aber Kontrolle und Distanz haben sichtbar gelitten.";
  }

  let evidenceNote = "Beweislage bleibt brauchbar.";
  if (shiftDelta >= 2 || stressDelta >= 2) {
    evidenceNote = "Beweislage wird fragiler: Muster und Innenraum greifen staerker ineinander.";
  } else if (clueDelta > 0 || accessDelta > 0) {
    evidenceNote = "Beweislage gewinnt an Rueckhalt durch neue Spur- oder Zugriffssubstanz.";
  } else if (trustDelta > 0) {
    evidenceNote = "Beweislage kippt leicht in Beziehung und Motivation statt nur in harte Aktenlogik.";
  }

  return {
    sceneTitle: currentSceneTitle,
    nextSceneTitle: nextScene.title,
    choiceLabel: choice.label,
    summary,
    evidenceNote,
    timeCost,
    createdAt: new Date().toISOString()
  };
}

export function EchoProtocolApp() {
  return <EchoProtocolGameShell />;
}

export function EchoProtocolGameShell({
  onExit
}: {
  onExit?: () => void;
}) {
  const [phase, setPhase] = useState<"start" | "game">("start");
  const [state, setState] = useState<EchoGameState>(() => decorateState(makeInitialState()));
  const [warningPulse, setWarningPulse] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [activeCutsceneId, setActiveCutsceneId] = useState<string | null>(null);
  const [activeCutsceneSlideIndex, setActiveCutsceneSlideIndex] = useState(0);
  const previousSceneId = useRef<string | null>(null);
  const savePreview = useMemo(() => hydrateState(loadEchoSave()), [phase, state.updatedAt]);
  const canContinue = Boolean(savePreview);
  const activeCutscene = activeCutsceneId ? getCutsceneById(activeCutsceneId) : null;

  useEffect(() => {
    if (phase !== "game") {
      previousSceneId.current = null;
      return;
    }

    if (previousSceneId.current === state.currentSceneId) {
      return;
    }

    const scene = getSceneById(state.currentSceneId);
    if (scene.isEnding) {
      echoAudio.play("ending");
    } else if (previousSceneId.current) {
      echoAudio.play(state.realityShiftLevel >= 4 ? "choice-danger" : "choice-stable");
    }

    previousSceneId.current = state.currentSceneId;
  }, [phase, state.currentSceneId, state.realityShiftLevel]);

  useEffect(() => {
    if (!warningPulse) {
      return;
    }
    echoAudio.play("warning");
  }, [warningPulse]);

  useEffect(() => {
    if (phase !== "game" || transitioning || activeCutsceneId) {
      return;
    }

    const cutscene = getCutsceneForScene(state.currentSceneId, state);
    if (!cutscene) {
      return;
    }

    setActiveCutsceneId(cutscene.id);
    setActiveCutsceneSlideIndex(0);
  }, [activeCutsceneId, phase, state, transitioning]);

  useEffect(() => {
    if (!activeCutsceneId) {
      return;
    }

    function handleCutsceneKeydown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      handleAdvanceCutscene();
    }

    window.addEventListener("keydown", handleCutsceneKeydown);
    return () => window.removeEventListener("keydown", handleCutsceneKeydown);
  }, [activeCutsceneId, activeCutsceneSlideIndex, state]);

  function persist(nextState: EchoGameState) {
    const withTimestamp = { ...nextState, updatedAt: new Date().toISOString() };
    saveEchoState(withTimestamp);
    setState(withTimestamp);
  }

  function startNewGame(mode: EchoMode) {
    echoAudio.play("menu");
    const nextRunCount = Math.max(state.runCount, savePreview?.runCount ?? 0) + 1;
    const runHistory = savePreview?.completedRuns ?? state.completedRuns;
    const fresh = decorateState(makeInitialState(mode, nextRunCount, runHistory));
    persist(fresh);
    setPhase("game");
  }

  function continueGame() {
    echoAudio.play("menu");
    if (!savePreview) return;
    setState(savePreview);
    setPhase("game");
  }

  function resetGame() {
    echoAudio.play("warning");
    clearEchoSave();
    setState(decorateState(makeInitialState()));
    setPhase("start");
  }

  function handlePick(choice: SceneChoice) {
    setTransitioning(true);
    echoAudio.play(choiceTone(choice));

    const currentScene = getSceneById(state.currentSceneId);
    const timeCost = getEchoChoiceTimeCost(state.mode, choice.timeCost);
    let next = applyEffects(state, currentScene.id, choice.effects);
    next = {
      ...next,
      currentSceneId: choice.nextSceneId,
      timeRemaining: Math.max(0, next.timeRemaining - timeCost),
      decisions: [...next.decisions, `${currentScene.id}:${choice.id}`],
      sceneVisits: {
        ...next.sceneVisits,
        [choice.nextSceneId]: (next.sceneVisits[choice.nextSceneId] ?? 0) + 1
      }
    };

    if (state.mode === "hard" && next.stress < 7) {
      next.stress = clampStateValue("stress", next.stress + 1);
    }

    next = decorateState(next);
    next = forceTimeEnding(next);
    const actionReport = buildActionReport(state, next, currentScene.title, choice, timeCost);
    next = {
      ...next,
      lastActionReport: actionReport,
      shiftLog: [actionReport, ...(next.shiftLog ?? state.shiftLog)].slice(0, 8)
    };
    persist(next);

    const warning = computeWarning(next);
    setWarningPulse(warning);
    window.setTimeout(() => setWarningPulse(null), 1100);
    window.setTimeout(() => setTransitioning(false), 240);
  }

  function handleAdvanceCutscene() {
    if (!activeCutsceneId) {
      return;
    }

    const cutscene = getCutsceneForScene(state.currentSceneId, state);
    if (!cutscene) {
      setActiveCutsceneId(null);
      return;
    }

    if (activeCutsceneSlideIndex < cutscene.slides.length - 1) {
      setActiveCutsceneSlideIndex((current) => current + 1);
      return;
    }

    persist({
      ...state,
      seenCutscenes: [...state.seenCutscenes, activeCutsceneId]
    });
    setActiveCutsceneId(null);
    setActiveCutsceneSlideIndex(0);
  }

  return (
    <div className="view-stack">
      {phase === "start" ? (
        <StartScreen
          hasSave={canContinue}
          onExit={onExit}
          onContinue={continueGame}
          onNewGame={startNewGame}
          onReset={resetGame}
          saveSummary={
            savePreview
              ? {
                  sceneTitle: getSceneById(savePreview.currentSceneId).title,
                  updatedAt: savePreview.updatedAt,
                  decisions: savePreview.decisions.length,
                  realityShiftLevel: savePreview.realityShiftLevel,
                  mode: savePreview.mode,
                  score: savePreview.score,
                  timeRemaining: savePreview.timeRemaining,
                  runCount: savePreview.runCount,
                  completedRuns: savePreview.completedRuns
                }
              : null
          }
        />
      ) : (
        <div className="echo-app">
          <GameScreen
            onExit={onExit}
            onBackToMenu={() => setPhase("start")}
            onPick={handlePick}
            state={state}
            transitioning={transitioning || Boolean(activeCutsceneId)}
            warningPulse={warningPulse}
          />
          <CaseFile state={state} />
          {activeCutsceneId && activeCutscene ? (
            <CutsceneOverlay
              cutscene={activeCutscene}
              onAdvance={handleAdvanceCutscene}
              slideIndex={activeCutsceneSlideIndex}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function choiceTone(choice: SceneChoice) {
  const shiftAmount = choice.effects
    .filter((effect): effect is Extract<SceneEffect, { type: "shift" }> => effect.type === "shift")
    .reduce((total, effect) => total + effect.amount, 0);
  const stressAmount = choice.effects
    .filter(
      (effect): effect is Extract<SceneEffect, { type: "stat" }> =>
        effect.type === "stat" && effect.stat === "stress"
    )
    .reduce((total, effect) => total + effect.amount, 0);

  if (shiftAmount >= 2 || stressAmount >= 2) {
    return "choice-danger" as const;
  }
  if (shiftAmount === 1 || stressAmount === 1) {
    return "choice-tense" as const;
  }
  return "choice-stable" as const;
}
