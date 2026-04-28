import { useMemo, useState } from "react";

import { INITIAL_SCENE_ID, getSceneById } from "./data/scenes";
import { CaseFile } from "./components/CaseFile";
import { GameScreen } from "./components/GameScreen";
import { StartScreen } from "./components/StartScreen";
import type { EchoGameState, SceneChoice, SceneEffect } from "./types/game";
import { clearEchoSave, hasEchoSave, loadEchoSave, saveEchoState } from "./utils/storage";
import "./styles.css";

function makeInitialState(): EchoGameState {
  const now = new Date().toISOString();
  return {
    currentSceneId: INITIAL_SCENE_ID,
    flags: {},
    realityShiftLevel: 0,
    caseLog: [],
    decisions: [],
    startedAt: now,
    updatedAt: now
  };
}

function applyEffects(state: EchoGameState, sceneId: string, effects: SceneEffect[]): EchoGameState {
  const next: EchoGameState = {
    ...state,
    flags: { ...state.flags },
    caseLog: [...state.caseLog],
    decisions: [...state.decisions],
    updatedAt: new Date().toISOString()
  };

  for (const effect of effects) {
    if (effect.type === "setFlag") {
      next.flags[effect.flag] = effect.value;
    }
    if (effect.type === "shift") {
      next.realityShiftLevel = Math.max(0, Math.min(7, next.realityShiftLevel + effect.amount));
    }
    if (effect.type === "addLog") {
      next.caseLog.push({
        id: `${sceneId}-${effect.entryType}-${next.caseLog.length + 1}`,
        type: effect.entryType,
        text: effect.text,
        sceneId
      });
    }
  }

  return next;
}

function seedSceneEntries(state: EchoGameState): EchoGameState {
  const scene = getSceneById(state.currentSceneId);
  if (!scene.defaultCaseEntries || scene.defaultCaseEntries.length === 0) return state;

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

export function EchoProtocolApp() {
  const [phase, setPhase] = useState<"start" | "game">("start");
  const [state, setState] = useState<EchoGameState>(() => seedSceneEntries(makeInitialState()));
  const [warningPulse, setWarningPulse] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const canContinue = useMemo(() => hasEchoSave(), [phase, state.updatedAt]);

  function persist(nextState: EchoGameState) {
    saveEchoState(nextState);
    setState(nextState);
  }

  function startNewGame() {
    const fresh = seedSceneEntries(makeInitialState());
    persist(fresh);
    setPhase("game");
  }

  function continueGame() {
    const loaded = loadEchoSave();
    if (!loaded) return;
    const hydrated = seedSceneEntries(loaded);
    setState(hydrated);
    setPhase("game");
  }

  function resetGame() {
    clearEchoSave();
    setState(seedSceneEntries(makeInitialState()));
    setPhase("start");
  }

  function handlePick(choice: SceneChoice) {
    setTransitioning(true);

    const currentScene = getSceneById(state.currentSceneId);
    let next = applyEffects(state, currentScene.id, choice.effects);
    next = {
      ...next,
      currentSceneId: choice.nextSceneId,
      decisions: [...next.decisions, `${currentScene.id}:${choice.id}`],
      updatedAt: new Date().toISOString()
    };
    next = seedSceneEntries(next);

    persist(next);

    const nextScene = getSceneById(next.currentSceneId);
    const warning = nextScene.warning?.(next) ?? null;
    setWarningPulse(warning);
    window.setTimeout(() => setWarningPulse(null), 900);
    window.setTimeout(() => setTransitioning(false), 220);
  }

  return (
    <div className="view-stack">
      {phase === "start" ? (
        <StartScreen
          hasSave={canContinue}
          onContinue={continueGame}
          onNewGame={startNewGame}
          onReset={resetGame}
        />
      ) : (
        <div className="echo-app">
          <GameScreen
            onBackToMenu={() => setPhase("start")}
            onPick={handlePick}
            state={state}
            transitioning={transitioning}
            warningPulse={warningPulse}
          />
          <CaseFile state={state} />
        </div>
      )}
    </div>
  );
}
