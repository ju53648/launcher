import { Download, HardDrive, RefreshCw, ShieldCheck } from "lucide-react";

import { formatBytes } from "../domain/format";
import type { AppRoute } from "../components/AppShell";
import { ProgressBar } from "../components/ProgressBar";
import { useLauncher } from "../store/LauncherStore";

export function HomeView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { snapshot, checkLauncherUpdates } = useLauncher();
  if (!snapshot) return null;

  const featured = snapshot.games[0];
  const installedCount = snapshot.games.filter((game) => game.installed).length;
  const activeJobs = snapshot.jobs.filter((job) => job.status === "running" || job.status === "queued");
  const totalSize = snapshot.games.reduce((total, game) => total + game.manifest.installSizeBytes, 0);

  return (
    <div className="view-stack">
      {featured && (
        <section className="home-hero">
          <img src={featured.manifest.bannerImage} alt="" />
          <div className="home-hero__content">
            <p className="eyebrow">Featured package</p>
            <h2>{featured.manifest.name}</h2>
            <p>{featured.manifest.description}</p>
            <div className="hero-actions">
              <button
                className="button button--primary"
                onClick={() => setRoute(`game:${featured.manifest.id}`)}
                type="button"
              >
                Open details
              </button>
              <button className="button button--ghost" onClick={() => setRoute("library")} type="button">
                View library
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="dashboard-grid">
        <article className="metric-panel">
          <HardDrive size={22} />
          <span>Libraries</span>
          <strong>{snapshot.config.libraries.length}</strong>
          <p>{snapshot.config.libraries.filter((library) => library.status === "available").length} available</p>
        </article>
        <article className="metric-panel">
          <Download size={22} />
          <span>Install size</span>
          <strong>{formatBytes(totalSize)}</strong>
          <p>{installedCount} installed</p>
        </article>
        <article className="metric-panel">
          <ShieldCheck size={22} />
          <span>Privacy</span>
          <strong>Local-first</strong>
          <p>Telemetry disabled</p>
        </article>
        <article className="metric-panel">
          <RefreshCw size={22} />
          <span>Launcher</span>
          <strong>v{snapshot.appVersion}</strong>
          <button className="text-button" onClick={checkLauncherUpdates} type="button">
            Check updates
          </button>
        </article>
      </section>

      {activeJobs.length > 0 && (
        <section className="queue-strip">
          <div>
            <p className="eyebrow">Active queue</p>
            <h2>Installing now</h2>
          </div>
          {activeJobs.map((job) => (
            <button
              className="queue-strip__job"
              key={job.id}
              onClick={() => setRoute("downloads")}
              type="button"
            >
              <strong>{job.gameName}</strong>
              <span>{job.message}</span>
              <ProgressBar value={job.progress} compact />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
