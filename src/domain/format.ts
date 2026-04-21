import type {
  CatalogItemType,
  InstallOperation,
  InstallPhase,
  ItemCollectionStatus,
  ItemInstallState,
  LibraryStatus
} from "./types";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "Never";
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

export function installStateLabel(status: ItemInstallState): string {
  const labels: Record<ItemInstallState, string> = {
    notInstalled: "Not installed",
    installing: "Installing",
    installed: "Installed",
    updateAvailable: "Update available",
    error: "Needs repair"
  };
  return labels[status];
}

export function collectionStatusLabel(status: ItemCollectionStatus): string {
  const labels: Record<ItemCollectionStatus, string> = {
    notAdded: "Not in library",
    added: "In library",
    installed: "Installed",
    updateAvailable: "Update available",
    error: "Needs repair"
  };
  return labels[status];
}

export function libraryStatusLabel(status: LibraryStatus): string {
  const labels: Record<LibraryStatus, string> = {
    available: "Available",
    missing: "Missing drive",
    inaccessible: "Inaccessible"
  };
  return labels[status];
}

export function phaseLabel(phase: InstallPhase): string {
  const labels: Record<InstallPhase, string> = {
    queued: "Queued",
    preparing: "Preparing",
    downloading: "Downloading",
    verifying: "Verifying",
    installing: "Installing",
    finalizing: "Finalizing",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Failed"
  };
  return labels[phase];
}

export function operationLabel(operation: InstallOperation): string {
  const labels: Record<InstallOperation, string> = {
    install: "Install",
    update: "Update",
    repair: "Repair",
    move: "Move"
  };
  return labels[operation];
}

export function itemTypeLabel(itemType: CatalogItemType): string {
  const labels: Record<CatalogItemType, string> = {
    game: "Game",
    tool: "Tool",
    project: "Project"
  };
  return labels[itemType];
}
