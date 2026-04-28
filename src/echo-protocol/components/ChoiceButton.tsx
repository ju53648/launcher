import type { SceneChoice } from "../types/game";

export function ChoiceButton({
  choice,
  index,
  onPick,
  disabled
}: {
  choice: SceneChoice;
  index: number;
  onPick: (choice: SceneChoice) => void;
  disabled: boolean;
}) {
  return (
    <button
      className="echo-choice"
      disabled={disabled}
      onClick={() => onPick(choice)}
      type="button"
    >
      <span className="echo-choice__index">{String(index + 1).padStart(2, "0")}</span>
      <span>{choice.label}</span>
    </button>
  );
}
