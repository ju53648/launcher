import { useEffect, useMemo } from "react";

import { SCENES, TOTAL_ENDING_COUNT, TOTAL_SCENE_COUNT, getSceneById } from "../data/scenes";
import type { EchoGameState, SceneChoice } from "../types/game";
import { ChoiceButton } from "./ChoiceButton";
import { GlitchText } from "./GlitchText";

export function GameScreen({
  state,
  onPick,
  warningPulse,
  transitioning,
  onBackToMenu,
  onExit
}: {
  state: EchoGameState;
  onPick: (choice: SceneChoice) => void;
  warningPulse: string | null;
  transitioning: boolean;
  onBackToMenu: () => void;
  onExit?: () => void;
}) {
  const scene = useMemo(() => getSceneById(state.currentSceneId), [state.currentSceneId]);
  const warning = warningPulse ?? scene.warning?.(state) ?? null;
  const visitedScenes = useMemo(() => {
    const ids = new Set<string>([state.currentSceneId]);
    for (const decision of state.decisions) {
      ids.add(decision.split(":")[0]);
    }
    return ids;
  }, [state.currentSceneId, state.decisions]);
  const progressPercent = Math.round((visitedScenes.size / TOTAL_SCENE_COUNT) * 100);
  const evidenceCount = state.caseLog.length;
  const shiftPercent = Math.round((state.realityShiftLevel / 7) * 100);
  const sceneSignal = scene.isEnding
    ? "Endsequenz erkannt"
    : state.realityShiftLevel >= 5
      ? "Erinnerung instabil"
      : state.realityShiftLevel >= 3
        ? "Spur kompromittiert"
        : "Spur lesbar";
  const discoveredEndings = useMemo(
    () => SCENES.filter((entry) => entry.isEnding && visitedScenes.has(entry.id)).length,
    [visitedScenes]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (transitioning) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (event.shiftKey && onExit) {
          onExit();
          return;
        }
        onBackToMenu();
        return;
      }

      const index = Number.parseInt(event.key, 10) - 1;
      if (Number.isNaN(index)) {
        return;
      }

      const choice = scene.choices[index];
      if (!choice) {
        return;
      }

      event.preventDefault();
      onPick(choice);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBackToMenu, onExit, onPick, scene.choices, transitioning]);

  return (
    <section
      className={`echo-game-screen ${transitioning ? "is-transitioning" : ""} ${
        state.realityShiftLevel >= 4 ? "is-distorted" : ""
      }`}
    >
      {warning ? <div className="echo-warning">{warning}</div> : null}

      <div className="echo-status-bar">
        <div className="echo-status-chip">
          <span>Fortschritt</span>
          <strong>{progressPercent}%</strong>
        </div>
        <div className="echo-status-chip">
          <span>Hinweise</span>
          <strong>{evidenceCount}</strong>
        </div>
        <div className="echo-status-chip">
          <span>Aktive Szenen</span>
          <strong>{visitedScenes.size}/{TOTAL_SCENE_COUNT}</strong>
        </div>
        <div className="echo-status-chip">
          <span>Status</span>
          <strong>{scene.isEnding ? "Endzustand" : "Im Fall"}</strong>
        </div>
        <div className="echo-status-chip">
          <span>Enden entdeckt</span>
          <strong>{discoveredEndings}/{TOTAL_ENDING_COUNT}</strong>
        </div>
      </div>

      <header className="echo-scene-head">
        <p>{scene.location}</p>
        <h2>
          <GlitchText text={scene.title} intensity={Math.min(3, Math.max(1, state.realityShiftLevel - 1))} />
        </h2>
        <div className="echo-shift-meter" aria-label="Reality Shift">
          <div className="echo-shift-meter__label">
            <span>Reality Shift</span>
            <strong>{state.realityShiftLevel}/7</strong>
          </div>
          <div className="echo-shift-meter__track">
            <div className="echo-shift-meter__fill" style={{ width: `${shiftPercent}%` }} />
          </div>
        </div>
        <div className={`echo-scene-signal ${scene.isEnding ? "echo-scene-signal--ending" : ""}`}>
          <span>Signalspur</span>
          <strong>{sceneSignal}</strong>
        </div>
      </header>

      <article className="echo-scene-body">
        <p>{scene.text(state)}</p>
        {scene.npcLine ? <blockquote>{scene.npcLine(state)}</blockquote> : null}
      </article>

      <footer className="echo-choice-grid">
        {scene.choices.map((choice, index) => (
          <ChoiceButton
            choice={choice}
            disabled={transitioning}
            index={index}
            key={choice.id}
            onPick={onPick}
            summary={describeChoice(choice)}
            tone={getChoiceTone(choice)}
          />
        ))}
      </footer>

      <div className="echo-toolbar">
        <small>
          Entscheidungen: {state.decisions.length} / Szene: {state.currentSceneId} / Enden im Fall:
          {" "}{discoveredEndings}
        </small>
        <small>
          Tasten 1-9 waehlen Optionen, <kbd>Esc</kbd> oeffnet den Startscreen,
          {onExit ? " Shift+Esc kehrt zum Launcher zurueck." : " Entere den Fall konzentriert."}
        </small>
        <div className="echo-toolbar__actions">
          <button className="echo-button" onClick={onBackToMenu} type="button">
            Zurueck zum Startscreen
          </button>
          {onExit ? (
            <button className="echo-button" onClick={onExit} type="button">
              Zum Launcher
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function describeChoice(choice: SceneChoice) {
  const shiftAmount = choice.effects
    .filter((effect): effect is Extract<typeof effect, { type: "shift" }> => effect.type === "shift")
    .reduce((total, effect) => total + effect.amount, 0);
  const addsClue = choice.effects.some(
    (effect) => effect.type === "addLog" && effect.entryType === "clue"
  );
  const addsDiary = choice.effects.some(
    (effect) => effect.type === "addLog" && effect.entryType === "diary"
  );
  const addsPhoto = choice.effects.some(
    (effect) => effect.type === "addLog" && effect.entryType === "photo"
  );

  if (shiftAmount >= 2) return "erhoeht den Realitaetsdruck stark";
  if (addsClue || addsPhoto) return "sichert neue Beweise fuer die Fallakte";
  if (addsDiary) return "veraendert Erinnerung und Selbstbild";
  if (shiftAmount === 1) return "oeffnet eine unsichere neue Spur";
  return "haelt den Fall vorerst unter Kontrolle";
}

function getChoiceTone(choice: SceneChoice): "stable" | "tense" | "danger" {
  const shiftAmount = choice.effects
    .filter((effect): effect is Extract<typeof effect, { type: "shift" }> => effect.type === "shift")
    .reduce((total, effect) => total + effect.amount, 0);

  if (shiftAmount >= 2) return "danger";
  if (shiftAmount === 1) return "tense";
  return "stable";
}
