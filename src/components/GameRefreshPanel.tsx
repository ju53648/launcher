import { AlertTriangle, CheckCircle2, Radar } from "lucide-react";

import { formatDate } from "../domain/format";
import { useI18n } from "../i18n";
import type { GameRefreshFeedback } from "../store/LauncherStore";

export function GameRefreshPanel({
  feedback
}: {
  feedback: GameRefreshFeedback;
}) {
  const { locale, t } = useI18n();

  if (feedback.phase === "idle") {
    return null;
  }

  const isError = feedback.phase === "error";
  const isChecking = feedback.phase === "checking";

  return (
    <div
      className={`install-panel install-panel--catalog${isError ? " install-panel--error" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="install-panel__header">
        <p className="eyebrow">{t("settings.maintenance.gameRefresh.eyebrow")}</p>
        <h2>
          {isChecking
            ? t("settings.maintenance.gameRefresh.checkingTitle")
            : isError
              ? t("settings.maintenance.gameRefresh.errorTitle")
              : t("settings.maintenance.gameRefresh.completedTitle")}
        </h2>
      </div>

      {isChecking && (
        <div className="game-refresh-status game-refresh-status--checking">
          <Radar size={18} />
          <span>{t("settings.maintenance.gameRefresh.checkingBody")}</span>
        </div>
      )}

      {isError && (
        <div className="game-refresh-status game-refresh-status--error">
          <AlertTriangle size={18} />
          <span>
            {t("settings.maintenance.gameRefresh.errorBody", {
              message: feedback.errorMessage ?? t("common.notAvailable")
            })}
          </span>
        </div>
      )}

      {feedback.phase === "completed" && feedback.summary && (
        <>
          <div className="game-refresh-status game-refresh-status--ok">
            <CheckCircle2 size={18} />
            <span>
              {t("settings.maintenance.gameRefresh.summaryCheckedAt", {
                date: formatDate(feedback.checkedAt, locale, t)
              })}
            </span>
          </div>
          <dl className="game-refresh-summary">
            <div>
              <dt>{t("settings.maintenance.gameRefresh.metrics.gamesChecked")}</dt>
              <dd>{feedback.summary.gamesChecked}</dd>
            </div>
            <div>
              <dt>{t("settings.maintenance.gameRefresh.metrics.updatesFound")}</dt>
              <dd>{feedback.summary.updatesFound}</dd>
            </div>
            <div>
              <dt>{t("settings.maintenance.gameRefresh.metrics.brokenInstallsDetected")}</dt>
              <dd>{feedback.summary.brokenInstallsDetected}</dd>
            </div>
            <div>
              <dt>{t("settings.maintenance.gameRefresh.metrics.newContentFound")}</dt>
              <dd>{feedback.summary.newContentFound}</dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}
