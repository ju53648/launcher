import type {
  ItemCollectionStatus,
  ItemInstallState,
  JobStatus,
  LibraryStatus
} from "../domain/types";
import {
  collectionStatusLabel,
  installStateLabel,
  libraryStatusLabel
} from "../domain/format";

type BadgeTone = "neutral" | "good" | "warn" | "danger" | "active";

export function StatusBadge({
  status,
  type = "install"
}: {
  status: ItemInstallState | ItemCollectionStatus | LibraryStatus | JobStatus;
  type?: "install" | "collection" | "library" | "job";
}) {
  const tone = getTone(status);
  const label =
    type === "library"
      ? libraryStatusLabel(status as LibraryStatus)
      : type === "collection"
        ? collectionStatusLabel(status as ItemCollectionStatus)
      : type === "job"
        ? status
        : installStateLabel(status as ItemInstallState);

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
