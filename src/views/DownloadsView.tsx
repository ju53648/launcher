import { Ban, Clock3, Download, RefreshCw, Trash2 } from "lucide-react";

import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import { getActiveJobs, getFinishedJobs, getQueuedJobs } from "../domain/selectors";
import { formatBytes, operationLabel, phaseLabel } from "../domain/format";
import { useLauncher } from "../store/LauncherStore";

export function DownloadsView() {
  const { snapshot, cancelJob, clearCompletedJobs } = useLauncher();
  if (!snapshot) return null;

  const activeJobs = getActiveJobs(snapshot);
  const queuedJobs = getQueuedJobs(snapshot);
  const finishedJobs = getFinishedJobs(snapshot);

  if (snapshot.jobs.length === 0) {
    return (
      <EmptyState
        title="Downloads are quiet"
        body="Installs, updates, repairs, and moves will appear here with live progress and history."
      />
    );
  }

  return (
    <div className="view-stack">
      <section className="dashboard-grid downloads-summary">
        <article className="metric-panel">
          <Download size={22} />
          <span>Active</span>
          <strong>{activeJobs.length}</strong>
          <p>{activeJobs.length === 1 ? "job in progress" : "jobs in progress"}</p>
        </article>
        <article className="metric-panel">
          <Clock3 size={22} />
          <span>Queued</span>
          <strong>{queuedJobs.length}</strong>
          <p>Waiting for a turn</p>
        </article>
        <article className="metric-panel">
          <RefreshCw size={22} />
          <span>History</span>
          <strong>{finishedJobs.length}</strong>
          <p>Completed, cancelled, or failed</p>
        </article>
      </section>

      <div className="section-toolbar">
        <div>
          <p className="eyebrow">Transfers and installs</p>
          <h2>{snapshot.jobs.length} total jobs</h2>
        </div>
        <button className="button button--ghost" onClick={clearCompletedJobs} type="button">
          <Trash2 size={16} />
          Clear finished
        </button>
      </div>

      {activeJobs.length > 0 && (
        <section className="downloads-section">
          <div>
            <p className="eyebrow">Active now</p>
            <h2>Work in progress</h2>
          </div>
          <div className="downloads-list">
            {activeJobs.map((job) => (
              <DownloadRow key={job.id} job={job} onCancel={() => cancelJob(job.id)} />
            ))}
          </div>
        </section>
      )}

      {finishedJobs.length > 0 && (
        <section className="downloads-section">
          <div>
            <p className="eyebrow">Recent history</p>
            <h2>Finished jobs</h2>
          </div>
          <div className="downloads-list">
            {finishedJobs.map((job) => (
              <DownloadRow key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DownloadRow({
  job,
  onCancel
}: {
  job: ReturnType<typeof getActiveJobs>[number];
  onCancel?: () => void;
}) {
  return (
    <article className="download-row">
      <div className="download-row__main">
        <div className="download-row__title">
          <strong>{job.itemName}</strong>
          <StatusBadge status={job.status} type="job" />
        </div>
        <span>
          {operationLabel(job.operation)} · {phaseLabel(job.phase)} · {job.message}
        </span>
        <ProgressBar value={job.progress} />
        <small>
          {formatBytes(job.bytesDownloaded)} / {formatBytes(job.bytesTotal)}
        </small>
        {job.error && <p className="field-error">{job.error}</p>}
      </div>
      {onCancel && (job.status === "running" || job.status === "queued") && (
        <button className="button button--secondary" onClick={onCancel} type="button">
          <Ban size={16} />
          Cancel
        </button>
      )}
    </article>
  );
}
