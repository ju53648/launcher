import type { GameOwnershipStatus, GameStatus, JobStatus, LibraryStatus } from "../domain/types";
import { gameStatusLabel, libraryStatusLabel, ownershipStatusLabel } from "../domain/format";

type BadgeTone = "neutral" | "good" | "warn" | "danger" | "active";

export function StatusBadge({
  status,
  type = "game"
}: {
  status: GameStatus | GameOwnershipStatus | LibraryStatus | JobStatus;
  type?: "game" | "ownership" | "library" | "job";
}) {
  const tone = getTone(status);
  const label =
    type === "library"
      ? libraryStatusLabel(status as LibraryStatus)
      : type === "ownership"
        ? ownershipStatusLabel(status as GameOwnershipStatus)
      : type === "job"
        ? status
        : gameStatusLabel(status as GameStatus);

  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}

function getTone(status: string): BadgeTone {
  if (status === "installed" || status === "added" || status === "available" || status === "completed") return "good";
  if (status === "updateAvailable" || status === "queued") return "warn";
  if (status === "installing" || status === "running") return "active";
  if (status === "error" || status === "missing" || status === "inaccessible" || status === "failed") {
    return "danger";
  }
  return "neutral";
}
