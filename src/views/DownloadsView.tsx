import { Ban, Clock3, Download, RefreshCw, Trash2 } from "lucide-react";

import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, jobProgressLabel } from "../domain/format";
import { getActiveJobs, getFinishedJobs, getQueuedJobs } from "../domain/selectors";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

export function DownloadsView() {
  const { locale, t } = useI18n();
  const { snapshot, cancelJob, clearCompletedJobs } = useLauncher();
  if (!snapshot) return null;

  const activeJobs = getActiveJobs(snapshot);
  const queuedJobs = getQueuedJobs(snapshot);
  const finishedJobs = getFinishedJobs(snapshot);

  if (snapshot.jobs.length === 0) {
    return (
      <EmptyState
        title={t("downloads.emptyState.title")}
        body={t("downloads.emptyState.body")}
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
      </section>

      <div className="section-toolbar">
        <div>
          <p className="eyebrow">{t("downloads.toolbar.eyebrow")}</p>
          <h2>{t("downloads.toolbar.title", { count: snapshot.jobs.length })}</h2>
        </div>
        <button className="button button--ghost" onClick={clearCompletedJobs} type="button">
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
              <DownloadRow key={job.id} job={job} locale={locale} />
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
  onCancel
}: {
  job: ReturnType<typeof getActiveJobs>[number];
  locale: string;
  onCancel?: () => void;
}) {
  const { t } = useI18n();

  return (
    <article className="download-row">
      <div className="download-row__main">
        <div className="download-row__title">
          <strong>{job.itemName}</strong>
          <StatusBadge status={job.status} type="job" />
        </div>
        <span>{jobProgressLabel(job, t)}</span>
        <ProgressBar value={job.progress} />
        <small>
          {formatBytes(job.bytesDownloaded, locale)} / {formatBytes(job.bytesTotal, locale)}
        </small>
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
