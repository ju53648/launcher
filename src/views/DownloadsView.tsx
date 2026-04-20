import { Ban, Trash2 } from "lucide-react";

import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, phaseLabel } from "../domain/format";
import { useLauncher } from "../store/LauncherStore";

export function DownloadsView() {
  const { snapshot, cancelJob, clearCompletedJobs } = useLauncher();
  if (!snapshot) return null;

  if (snapshot.jobs.length === 0) {
    return (
      <EmptyState
        title="Queue is clear"
        body="Install and update jobs appear here with live progress and failure states."
      />
    );
  }

  return (
    <div className="view-stack">
      <div className="section-toolbar">
        <div>
          <p className="eyebrow">Install queue</p>
          <h2>{snapshot.jobs.length} jobs</h2>
        </div>
        <button className="button button--ghost" onClick={clearCompletedJobs} type="button">
          <Trash2 size={16} />
          Clear finished
        </button>
      </div>

      <section className="downloads-list">
        {snapshot.jobs.map((job) => (
          <article key={job.id} className="download-row">
            <div className="download-row__main">
              <div className="download-row__title">
                <strong>{job.gameName}</strong>
                <StatusBadge status={job.status} type="job" />
              </div>
              <span>
                {phaseLabel(job.phase)} · {job.message}
              </span>
              <ProgressBar value={job.progress} />
              <small>
                {formatBytes(job.bytesDownloaded)} / {formatBytes(job.bytesTotal)}
              </small>
              {job.error && <p className="field-error">{job.error}</p>}
            </div>
            {(job.status === "running" || job.status === "queued") && (
              <button className="button button--secondary" onClick={() => cancelJob(job.id)} type="button">
                <Ban size={16} />
                Cancel
              </button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
