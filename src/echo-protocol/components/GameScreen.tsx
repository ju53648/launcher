import { useMemo } from "react";

import { getSceneById } from "../data/scenes";
import type { EchoGameState, SceneChoice } from "../types/game";
import { ChoiceButton } from "./ChoiceButton";
import { GlitchText } from "./GlitchText";

export function GameScreen({
  state,
  onPick,
  warningPulse,
  transitioning,
  onBackToMenu
}: {
  state: EchoGameState;
  onPick: (choice: SceneChoice) => void;
  warningPulse: string | null;
  transitioning: boolean;
  onBackToMenu: () => void;
}) {
  const scene = useMemo(() => getSceneById(state.currentSceneId), [state.currentSceneId]);
  const warning = warningPulse ?? scene.warning?.(state) ?? null;

  return (
    <section
      className={`echo-game-screen ${transitioning ? "is-transitioning" : ""} ${
        state.realityShiftLevel >= 4 ? "is-distorted" : ""
      }`}
    >
      {warning ? <div className="echo-warning">{warning}</div> : null}

      <header className="echo-scene-head">
        <p>{scene.location}</p>
        <h2>
          <GlitchText text={scene.title} intensity={Math.min(3, Math.max(1, state.realityShiftLevel - 1))} />
        </h2>
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
          />
        ))}
      </footer>

      <div className="echo-toolbar">
        <small>
          Entscheidungen: {state.decisions.length} / Aktuelle Szene: {state.currentSceneId}
        </small>
        <button className="echo-button" onClick={onBackToMenu} type="button">
          Zurueck zum Startscreen
        </button>
      </div>
    </section>
  );
}
