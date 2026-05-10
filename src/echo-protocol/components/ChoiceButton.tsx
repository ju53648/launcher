import type { SceneChoice } from "../types/game";

export function ChoiceButton({
  choice,
  index,
  summary,
  vector,
  pathTag,
  crossCheckLabel,
  crossCheckTone,
  tone,
  badges,
  timeCost,
  lockedReason,
  recommendation,
  onPick,
  disabled
}: {
  choice: SceneChoice;
  index: number;
  summary: string;
  vector: string;
  pathTag: string;
  crossCheckLabel: string;
  crossCheckTone: "stable" | "warning" | "critical";
  tone: "stable" | "tense" | "danger";
  badges: string[];
  timeCost: number;
  lockedReason: string | null;
  recommendation: string | null;
  onPick: (choice: SceneChoice) => void;
  disabled: boolean;
}) {
  return (
    <button
      className={`echo-choice echo-choice--${tone} ${lockedReason ? "is-locked" : ""} ${
        recommendation ? "is-recommended" : ""
      }`}
      disabled={disabled}
      onClick={() => onPick(choice)}
      type="button"
    >
      <span className="echo-choice__index">{String(index + 1).padStart(2, "0")}</span>
      <span className="echo-choice__content">
        <span className="echo-choice__line">
          <strong>{choice.label}</strong>
          <span className="echo-choice__time">-{timeCost} min</span>
        </span>
        {!lockedReason ? (
          <span className="echo-choice__meta">
            <span className="echo-choice__path">{pathTag}</span>
            <span className={`echo-choice__cross echo-choice__cross--${crossCheckTone}`}>{crossCheckLabel}</span>
          </span>
        ) : null}
        <small>{lockedReason ?? summary}</small>
        {!lockedReason ? <span className="echo-choice__vector">{vector}</span> : null}
        {recommendation ? <em className="echo-choice__recommendation">Operator-Hinweis: {recommendation}</em> : null}
        <span className="echo-choice__badges">
          {badges.map((badge) => (
            <span className="echo-choice__badge" key={badge}>
              {badge}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
