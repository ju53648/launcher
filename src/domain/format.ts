import type { GameStatus, InstallPhase, LibraryStatus } from "./types";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

export function gameStatusLabel(status: GameStatus): string {
  const labels: Record<GameStatus, string> = {
    notInstalled: "Not installed",
    installing: "Installing",
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
