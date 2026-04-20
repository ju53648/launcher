import { Download, ExternalLink, ShieldCheck } from "lucide-react";

import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../domain/format";
import { useLauncher } from "../store/LauncherStore";

export function AboutView() {
  const { snapshot, busyAction, checkLauncherUpdates, installLauncherUpdate, updateProgress } = useLauncher();
  if (!snapshot) return null;

  return (
    <div className="about-layout">
      <section className="about-hero">
        <div className="brand about-hero__brand">
          <span className="brand__mark">LX</span>
          <span>
            <strong>Lumorix</strong>
            <small>Launcher v{snapshot.appVersion}</small>
          </span>
        </div>
        <p>
          A local-first Windows game launcher foundation built for private installs, explicit
          updates and clean library ownership.
        </p>
        <div className="action-row">
          <button className="button button--secondary" onClick={checkLauncherUpdates} type="button">
            Check for updates
          </button>
          <button
            className="button button--primary"
            disabled={busyAction === "install-launcher-update"}
            onClick={installLauncherUpdate}
            type="button"
          >
            <Download size={16} />
            Download and install
          </button>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">Launcher update state</p>
            <h2>Version</h2>
          </div>
          <StatusBadge
            status={snapshot.launcherUpdate.updateAvailable ? "updateAvailable" : "installed"}
          />
        </div>
        <dl className="spec-list">
          <div>
            <dt>Current</dt>
            <dd>v{snapshot.launcherUpdate.currentVersion}</dd>
          </div>
          <div>
            <dt>Latest</dt>
            <dd>{snapshot.launcherUpdate.latestVersion ?? "No remote source"}</dd>
          </div>
          <div>
            <dt>Checked</dt>
            <dd>{formatDate(snapshot.launcherUpdate.checkedAt)}</dd>
          </div>
        </dl>
        {snapshot.launcherUpdate.releaseUrl && (
          <a className="button button--secondary" href={snapshot.launcherUpdate.releaseUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Release notes
          </a>
        )}
        {snapshot.launcherUpdate.error && <p className="field-error">{snapshot.launcherUpdate.error}</p>}
        {updateProgress.status !== "idle" && (
          <div className="install-panel">
            <div>
              <p className="eyebrow">In-app updater</p>
              <h2>{updateProgress.message}</h2>
            </div>
            <ProgressBar value={updateProgress.progress} />
          </div>
        )}
      </section>

      <section className="settings-section">
        <div>
          <p className="eyebrow">Product changelog</p>
          <h2>v0.1.0</h2>
        </div>
        <div className="changelog-entry">
          <strong>Foundation build</strong>
          <span>2026-04-20</span>
          <ul>
            <li>Tauri/Rust desktop shell with React and TypeScript UI.</li>
            <li>Local config, multiple libraries, manifest catalog and install queue.</li>
            <li>Launcher and per-game update checks prepared without telemetry.</li>
          </ul>
        </div>
      </section>

      <section className="settings-section">
        <div className="privacy-panel">
          <ShieldCheck size={24} />
          <div>
            <strong>Privacy baseline</strong>
            <p>No login system, no analytics package and no automatic data upload path.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
