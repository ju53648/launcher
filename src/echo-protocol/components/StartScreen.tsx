import { useEffect } from "react";

import { TOTAL_ENDING_COUNT, TOTAL_SCENE_COUNT } from "../data/scenes";
import { GlitchText } from "./GlitchText";

export function StartScreen({
  hasSave,
  saveSummary,
  onExit,
  onNewGame,
  onContinue,
  onReset
}: {
  hasSave: boolean;
  saveSummary: {
    sceneTitle: string;
    updatedAt: string;
    decisions: number;
    realityShiftLevel: number;
  } | null;
  onExit?: () => void;
  onNewGame: () => void;
  onContinue: () => void;
  onReset: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (hasSave) {
          onContinue();
          return;
        }
        onNewGame();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasSave, onContinue, onNewGame]);

  return (
    <section className="echo-start-screen">
      <div className="echo-start-screen__backdrop" />
      <div className="echo-start-screen__panel">
        <p className="echo-kicker">Psychological Mystery Experience</p>
        <h2>
          <GlitchText text="Echo Protocol" intensity={2} />
        </h2>
        <p>
          Ermittler Elias Voss sucht die verschwundene Mira. Je tiefer du graebst, desto mehr
          veraendern sich Erinnerungen, Akten und Fakten.
        </p>
        <div className="echo-start-screen__facts">
          <span>{TOTAL_SCENE_COUNT} Szenen</span>
          <span>{TOTAL_ENDING_COUNT} Enden</span>
          <span>Lokaler Spielstand</span>
        </div>
        {saveSummary ? (
          <div className="echo-save-panel">
            <div className="echo-save-panel__header">
              <strong>Letzter Fallstand</strong>
              <span>{new Date(saveSummary.updatedAt).toLocaleString("de-DE")}</span>
            </div>
            <div className="echo-save-panel__grid">
              <div>
                <small>Szene</small>
                <strong>{saveSummary.sceneTitle}</strong>
              </div>
              <div>
                <small>Entscheidungen</small>
                <strong>{saveSummary.decisions}</strong>
              </div>
              <div>
                <small>Reality Shift</small>
                <strong>{saveSummary.realityShiftLevel}/7</strong>
              </div>
            </div>
          </div>
        ) : null}
        <div className="echo-actions">
          <button className="echo-button echo-button--primary" onClick={onNewGame} type="button">
            Neues Spiel
          </button>
          <button
            className="echo-button"
            disabled={!hasSave}
            onClick={onContinue}
            type="button"
          >
            Fortsetzen
          </button>
          <button className="echo-button echo-button--danger" onClick={onReset} type="button">
            Reset Spielstand
          </button>
          {onExit ? (
            <button className="echo-button" onClick={onExit} type="button">
              Zum Launcher
            </button>
          ) : null}
        </div>
        <p className="echo-start-screen__hint">
          Schnellstart: <kbd>Enter</kbd> fuer Fortsetzen oder neues Spiel
        </p>
      </div>
    </section>
  );
}
