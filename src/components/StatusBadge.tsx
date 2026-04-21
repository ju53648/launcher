import type {
  ItemCollectionStatus,
  ItemInstallState,
  JobStatus,
  LibraryStatus
} from "../domain/types";
import {
  collectionStatusLabel,
  installStateLabel,
  jobStatusLabel,
  libraryStatusLabel
} from "../domain/format";
import { useI18n } from "../i18n";

type BadgeTone = "neutral" | "good" | "warn" | "danger" | "active";

export function StatusBadge({
  status,
  type = "install"
}: {
  status: ItemInstallState | ItemCollectionStatus | LibraryStatus | JobStatus;
  type?: "install" | "collection" | "library" | "job";
}) {
  const { t } = useI18n();
  const tone = getTone(status);
  const label =
    type === "library"
      ? libraryStatusLabel(status as LibraryStatus, t)
      : type === "collection"
        ? collectionStatusLabel(status as ItemCollectionStatus, t)
      : type === "job"
        ? jobStatusLabel(status as JobStatus, t)
        : installStateLabel(status as ItemInstallState, t);

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
