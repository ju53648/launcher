import { ProgressBar } from "./ProgressBar";
import type { LauncherUpdateProgress } from "../services/appUpdater";

export function LauncherUpdatePanel({
  progress
}: {
  progress: LauncherUpdateProgress;
}) {
  if (progress.status === "idle") {
    return null;
  }

  const isError = progress.status === "error";

  return (
    <div
      className={`install-panel install-panel--updater${isError ? " install-panel--error" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="install-panel__header">
        <p className="eyebrow">Launcher update</p>
        <h2>{progress.message}</h2>
      </div>
      {!isError && <ProgressBar value={progress.progress} />}
    </div>
  );
}
