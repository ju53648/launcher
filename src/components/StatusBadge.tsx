import type {
  ItemCollectionStatus,
  ItemInstallState,
  JobStatus,
  LibraryStatus
} from "../domain/types";
import {
  collectionStatusLabel,
  gameStatusLabel,
  installStateLabel,
  jobStatusLabel,
  libraryStatusLabel
} from "../domain/format";
import type { GameStatus } from "../domain/selectors";
import { useI18n } from "../i18n";

type BadgeTone = "neutral" | "good" | "warn" | "danger" | "active";

export function StatusBadge({
  status,
  type = "install"
}: {
  status: ItemInstallState | ItemCollectionStatus | LibraryStatus | JobStatus | GameStatus;
  type?: "install" | "collection" | "library" | "job" | "game";
}) {
  const { t } = useI18n();
  const tone = getTone(status, type);
  const label =
    type === "game"
      ? gameStatusLabel(status as GameStatus, t)
      : type === "library"
      ? libraryStatusLabel(status as LibraryStatus, t)
      : type === "collection"
        ? collectionStatusLabel(status as ItemCollectionStatus, t)
      : type === "job"
        ? jobStatusLabel(status as JobStatus, t)
        : installStateLabel(status as ItemInstallState, t);

  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}

function getTone(
  status: string,
  type: "install" | "collection" | "library" | "job" | "game"
): BadgeTone {
  if (type === "game") {
    if (status === "installed") return "good";
    if (status === "updateAvailable") return "warn";
    if (status === "broken") return "danger";
    return "neutral";
  }

  if (status === "installed" || status === "added" || status === "available" || status === "completed") return "good";
  if (status === "updateAvailable" || status === "queued") return "warn";
  if (status === "installing" || status === "running") return "active";
  if (status === "error" || status === "missing" || status === "inaccessible" || status === "failed") {
    return "danger";
  }
  return "neutral";
}
