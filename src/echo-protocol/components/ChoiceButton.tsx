import type { SceneChoice } from "../types/game";

export function ChoiceButton({
  choice,
  index,
  summary,
  tone,
  onPick,
  disabled
}: {
  choice: SceneChoice;
  index: number;
  summary: string;
  tone: "stable" | "tense" | "danger";
  onPick: (choice: SceneChoice) => void;
  disabled: boolean;
}) {
  return (
    <button
      className={`echo-choice echo-choice--${tone}`}
      disabled={disabled}
      onClick={() => onPick(choice)}
      type="button"
    >
      <span className="echo-choice__index">{String(index + 1).padStart(2, "0")}</span>
      <span className="echo-choice__content">
        <strong>{choice.label}</strong>
        <small>{summary}</small>
      </span>
    </button>
  );
}
