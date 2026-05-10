import { Ban, Clock3, Download, RefreshCw, Trash2 } from "lucide-react";

import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, formatDateTime, jobProgressLabel } from "../domain/format";
import { getActiveJobs, getFinishedJobs, getQueuedJobs } from "../domain/selectors";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";
import type { AppRoute } from "../components/AppShell";

export function DownloadsView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { locale, t } = useI18n();
  const { snapshot, cancelJob, clearCompletedJobs } = useLauncher();
  if (!snapshot) return null;

  const activeJobs = getActiveJobs(snapshot).filter((job) => job.status === "running");
  const queuedJobs = getQueuedJobs(snapshot);
  const finishedJobs = getFinishedJobs(snapshot);
  const totalQueuedBytes = queuedJobs.reduce((total, job) => total + job.bytesTotal, 0);
  const totalActiveBytesRemaining = activeJobs.reduce(
    (total, job) => total + Math.max(0, job.bytesTotal - job.bytesDownloaded),
    0
  );
  const totalPendingBytes = totalQueuedBytes + totalActiveBytesRemaining;

  if (snapshot.jobs.length === 0) {
    return (
      <EmptyState
        title={t("downloads.emptyState.title")}
        body={t("downloads.emptyState.body")}
        action={
          <div className="empty-state__actions">
            <button className="button button--primary" onClick={() => setRoute("shop")} type="button">
              {t("common.actions.browseShop")}
            </button>
            <button className="button button--ghost" onClick={() => setRoute("library")} type="button">
              {t("common.actions.openLibrary")}
            </button>
          </div>
        }
      />
    );
  }

  return (
    <div className="view-stack">
      <section className="dashboard-grid downloads-summary">
        <article className="metric-panel">
          <Download size={22} />
          <span>{t("downloads.summary.active")}</span>
          <strong>{activeJobs.length}</strong>
          <p>{t("downloads.summary.activeDescription", { count: activeJobs.length })}</p>
        </article>
        <article className="metric-panel">
          <Clock3 size={22} />
          <span>{t("downloads.summary.queued")}</span>
          <strong>{queuedJobs.length}</strong>
          <p>{t("downloads.summary.queuedDescription")}</p>
        </article>
        <article className="metric-panel">
          <RefreshCw size={22} />
          <span>{t("downloads.summary.history")}</span>
          <strong>{finishedJobs.length}</strong>
          <p>{t("downloads.summary.historyDescription")}</p>
        </article>
        <article className="metric-panel">
          <Clock3 size={22} />
          <span>{t("downloads.summary.pendingPayload")}</span>
          <strong>{formatBytes(totalPendingBytes, locale)}</strong>
          <p>{t("downloads.summary.pendingPayloadDescription")}</p>
        </article>
      </section>

      <div className="section-toolbar">
        <div>
          <p className="eyebrow">{t("downloads.toolbar.eyebrow")}</p>
          <h2>{t("downloads.toolbar.title", { count: snapshot.jobs.length })}</h2>
        </div>
        <button
          className="button button--ghost"
          disabled={finishedJobs.length === 0}
          onClick={clearCompletedJobs}
          type="button"
        >
          <Trash2 size={16} />
          {t("common.actions.clearFinished")}
        </button>
      </div>

      {activeJobs.length > 0 && (
        <section className="downloads-section">
          <div>
            <p className="eyebrow">{t("downloads.sections.activeEyebrow")}</p>
            <h2>{t("downloads.sections.activeTitle")}</h2>
          </div>
          <div className="downloads-list">
            {activeJobs.map((job) => (
              <DownloadRow
                key={job.id}
                job={job}
                locale={locale}
                queuePosition={null}
                onCancel={() => cancelJob(job.id)}
              />
            ))}
          </div>
        </section>
      )}

      {queuedJobs.length > 0 && (
        <section className="downloads-section">
          <div>
            <p className="eyebrow">{t("downloads.sections.queuedEyebrow")}</p>
            <h2>{t("downloads.sections.queuedTitle")}</h2>
          </div>
          <div className="downloads-list">
            {queuedJobs.map((job, index) => (
              <DownloadRow
                key={job.id}
                job={job}
                locale={locale}
                queuePosition={index + 1}
                onCancel={() => cancelJob(job.id)}
              />
            ))}
          </div>
        </section>
      )}

      {finishedJobs.length > 0 && (
        <section className="downloads-section">
          <div>
            <p className="eyebrow">{t("downloads.sections.historyEyebrow")}</p>
            <h2>{t("downloads.sections.historyTitle")}</h2>
          </div>
          <div className="downloads-list">
            {finishedJobs.map((job) => (
              <DownloadRow key={job.id} job={job} locale={locale} queuePosition={null} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DownloadRow({
  job,
  locale,
  queuePosition,
  onCancel
}: {
  job: ReturnType<typeof getActiveJobs>[number];
  locale: string;
  queuePosition: number | null;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const statusMeta =
    queuePosition && job.status === "queued"
      ? t("downloads.row.queuePosition", { position: queuePosition })
      : job.status === "running"
        ? t("downloads.row.startedAt", {
            date: formatDateTime(job.startedAt, locale, t)
          })
        : t("downloads.row.updatedAt", {
            date: formatDateTime(job.updatedAt, locale, t)
          });

  return (
    <article className="download-row">
      <div className="download-row__main">
        <div className="download-row__title">
          <strong>{job.itemName}</strong>
          <StatusBadge status={job.status} type="job" />
        </div>
        <span>{jobProgressLabel(job, t)}</span>
        <p className="download-row__message">{job.message}</p>
        {(job.status === "running" || job.status === "completed") && <ProgressBar value={job.progress} />}
        {job.status === "queued" ? (
          <div className="progress-bar progress-bar--compact" aria-hidden="true">
            <div className="progress-bar__value" style={{ width: "12%" }} />
          </div>
        ) : null}
        <small>
          {formatBytes(job.bytesDownloaded, locale)} / {formatBytes(job.bytesTotal, locale)}
        </small>
        <small>{statusMeta}</small>
        {job.error && <p className="field-error">{job.error}</p>}
      </div>
      {onCancel && (job.status === "running" || job.status === "queued") && (
        <button className="button button--secondary" onClick={onCancel} type="button">
          <Ban size={16} />
          {t("common.actions.cancel")}
        </button>
      )}
    </article>
  );
}
