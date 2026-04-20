import type { GameStatus, JobStatus, LibraryStatus } from "../domain/types";
import { gameStatusLabel, libraryStatusLabel } from "../domain/format";

type BadgeTone = "neutral" | "good" | "warn" | "danger" | "active";

export function StatusBadge({
  status,
  type = "game"
}: {
  status: GameStatus | LibraryStatus | JobStatus;
  type?: "game" | "library" | "job";
}) {
  const tone = getTone(status);
  const label =
    type === "library"
      ? libraryStatusLabel(status as LibraryStatus)
      : type === "job"
        ? status
        : gameStatusLabel(status as GameStatus);

  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}

function getTone(status: string): BadgeTone {
  if (status === "installed" || status === "available" || status === "completed") return "good";
  if (status === "updateAvailable" || status === "queued") return "warn";
  if (status === "installing" || status === "running") return "active";
  if (status === "error" || status === "missing" || status === "inaccessible" || status === "failed") {
    return "danger";
  }
  return "neutral";
}
