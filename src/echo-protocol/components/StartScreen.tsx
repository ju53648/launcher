import { GlitchText } from "./GlitchText";

export function StartScreen({
  hasSave,
  onNewGame,
  onContinue,
  onReset
}: {
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onReset: () => void;
}) {
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
        </div>
      </div>
    </section>
  );
}
