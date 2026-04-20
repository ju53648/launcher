import { Download, HardDrive, Library, RefreshCw, ShieldCheck } from "lucide-react";

import { formatBytes, formatDate } from "../domain/format";
import type { AppRoute } from "../components/AppShell";
import { ProgressBar } from "../components/ProgressBar";
import { LauncherUpdatePanel } from "../components/LauncherUpdatePanel";
import { useLauncher } from "../store/LauncherStore";

export function HomeView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { snapshot, checkLauncherUpdates, busyAction, updateProgress } = useLauncher();
  if (!snapshot) return null;

  const libraryGames = snapshot.games.filter((game) => game.ownershipStatus !== "notAdded");
  const installedGames = libraryGames
    .filter((game) => game.installed)
    .sort((a, b) => {
      const aTime = new Date(a.installed?.installedAt ?? 0).getTime();
      const bTime = new Date(b.installed?.installedAt ?? 0).getTime();
      return bTime - aTime;
    });
  const recentlyAdded = libraryGames
    .filter((game) => game.libraryEntry && !game.installed)
    .sort((a, b) => {
      const aTime = new Date(a.libraryEntry?.addedAt ?? 0).getTime();
      const bTime = new Date(b.libraryEntry?.addedAt ?? 0).getTime();
      return bTime - aTime;
    });
  const activeJobs = snapshot.jobs.filter((job) => job.status === "running" || job.status === "queued");
  const updateCount = libraryGames.filter((game) => game.ownershipStatus === "updateAvailable").length;
  const installedSize = installedGames.reduce(
    (total, game) => total + (game.installed?.sizeOnDiskBytes ?? game.manifest.installSizeBytes),
    0
  );
  const recentItems = [...installedGames, ...recentlyAdded].slice(0, 4);

  return (
    <div className="view-stack">
      <section className="home-dashboard">
        <div className="home-dashboard__copy">
          <p className="eyebrow">Dashboard</p>
          <h2>Welcome back to Lumorix</h2>
          <p>
            Your launcher is ready. Check updates, continue installs, or jump back into your
            collection.
          </p>
          <div className="hero-actions">
            <button className="button button--primary" onClick={() => setRoute("library")} type="button">
              Open Library
            </button>
            <button className="button button--ghost" onClick={() => setRoute("downloads")} type="button">
              View Downloads
            </button>
          </div>
        </div>
        <div className="home-dashboard__update">
          <RefreshCw size={20} />
          <span>Launcher</span>
          <strong>
            {snapshot.launcherUpdate.updateAvailable
              ? `v${snapshot.launcherUpdate.latestVersion} available`
              : `v${snapshot.appVersion}`}
          </strong>
          <p>Last checked {formatDate(snapshot.launcherUpdate.checkedAt)}</p>
          <button
            className="text-button"
            disabled={busyAction === "check-launcher-update" || busyAction === "install-launcher-update"}
            onClick={checkLauncherUpdates}
            type="button"
          >
            {busyAction === "check-launcher-update" ? "Checking..." : "Check updates"}
          </button>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="metric-panel">
          <Library size={22} />
          <span>Library</span>
          <strong>{libraryGames.length}</strong>
          <p>{installedGames.length} installed</p>
        </article>
        <article className="metric-panel">
          <Download size={22} />
          <span>Downloads</span>
          <strong>{activeJobs.length}</strong>
          <p>{activeJobs.length === 1 ? "active job" : "active jobs"}</p>
        </article>
        <article className="metric-panel">
          <HardDrive size={22} />
          <span>Disk usage</span>
          <strong>{formatBytes(installedSize)}</strong>
          <p>{snapshot.config.libraries.filter((library) => library.status === "available").length} libraries available</p>
        </article>
        <article className="metric-panel">
          <ShieldCheck size={22} />
          <span>Updates</span>
          <strong>{updateCount}</strong>
          <p>{updateCount === 1 ? "game update" : "game updates"}</p>
        </article>
      </section>

      <LauncherUpdatePanel progress={updateProgress} />

      {activeJobs.length > 0 && (
        <section className="queue-strip">
          <div>
            <p className="eyebrow">Downloads</p>
            <h2>Active work</h2>
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

      <section className="activity-panel">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">Activity</p>
            <h2>Recent library changes</h2>
          </div>
          <button className="button button--ghost" onClick={() => setRoute("shop")} type="button">
            Browse Shop
          </button>
        </div>
        {recentItems.length === 0 ? (
          <p className="muted">No library activity yet. Add a game from the Shop to get started.</p>
        ) : (
          <div className="activity-list">
            {recentItems.map((game) => (
              <button
                className="activity-row"
                key={game.manifest.id}
                onClick={() => setRoute(`game:${game.manifest.id}`)}
                type="button"
              >
                <img src={game.manifest.iconImage} alt="" />
                <span>
                  <strong>{game.manifest.name}</strong>
                  <small>
                    {game.installed
                      ? `Installed ${formatDate(game.installed.installedAt)}`
                      : `Added ${formatDate(game.libraryEntry?.addedAt ?? null)}`}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
