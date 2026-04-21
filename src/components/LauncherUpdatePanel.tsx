import { useI18n } from "../i18n";
import { describeLauncherUpdateProgress } from "../services/appUpdater";
import { ProgressBar } from "./ProgressBar";
import type { LauncherUpdateProgress } from "../services/appUpdater";

export function LauncherUpdatePanel({
  progress
}: {
  progress: LauncherUpdateProgress;
}) {
  const { t } = useI18n();

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
        <p className="eyebrow">{t("updater.title")}</p>
        <h2>{describeLauncherUpdateProgress(progress, t)}</h2>
      </div>
      {!isError && <ProgressBar value={progress.progress} />}
    </div>
  );
}
