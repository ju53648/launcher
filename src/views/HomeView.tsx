import { ArrowRight, Download, HardDrive, Library, RefreshCw, Sparkles } from "lucide-react";

import type { AppRoute } from "../components/AppShell";
import {
  buildRecentActivity,
  getActiveJobs,
  getInstalledItems,
  getLibraryItems,
  getRecentlyInstalledItems,
  getRecentlyUsedItems
} from "../domain/selectors";
import { formatBytes, formatDate } from "../domain/format";
import { LauncherUpdatePanel } from "../components/LauncherUpdatePanel";
import { ProgressBar } from "../components/ProgressBar";
import type { ContentView } from "../domain/types";
import { useLauncher } from "../store/LauncherStore";

export function HomeView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const {
    snapshot,
    checkLauncherUpdates,
    installLauncherUpdate,
    busyAction,
    updateProgress
  } = useLauncher();
  if (!snapshot) return null;

  const libraryItems = getLibraryItems(snapshot);
  const installedItems = getInstalledItems(snapshot);
  const activeJobs = getActiveJobs(snapshot);
  const recentActivity = buildRecentActivity(snapshot, 6);
  const recentInstalls = getRecentlyInstalledItems(snapshot, 4);
  const recentlyUsed = getRecentlyUsedItems(snapshot, 4);
  const updateCount = libraryItems.filter((item) => item.state.updateAvailable).length;
  const installedSize = installedItems.reduce(
    (total, item) => total + (item.installed?.sizeOnDiskBytes ?? item.manifest?.installSizeBytes ?? 0),
    0
  );

  const updateMessage =
    updateProgress.status === "available"
      ? `Update ${updateProgress.version ?? ""} is ready`
      : updateProgress.status === "downloading" ||
          updateProgress.status === "installing" ||
          updateProgress.status === "relaunching"
        ? updateProgress.message
        : snapshot.launcherUpdate.updateAvailable
          ? `Version ${snapshot.launcherUpdate.latestVersion} is available`
          : `Running v${snapshot.appVersion}`;
  const showInstallAction =
    updateProgress.status === "available" ||
    updateProgress.status === "restartRequired" ||
    snapshot.launcherUpdate.updateAvailable;

  return (
    <div className="view-stack">
      <section className="home-dashboard">
        <div className="home-dashboard__copy">
          <p className="eyebrow">Home</p>
          <h2>Your local Lumorix control center</h2>
          <p>
            Track your collection, pick up where you left off, and keep installs and launcher
            updates under control without accounts, ads, or friction.
          </p>
          <div className="hero-actions">
            <button className="button button--primary" onClick={() => setRoute("library")} type="button">
              Open Library
            </button>
            <button className="button button--ghost" onClick={() => setRoute("shop")} type="button">
              Browse Shop
            </button>
            <button className="button button--ghost" onClick={() => setRoute("downloads")} type="button">
              View Downloads
            </button>
          </div>
        </div>

        <div className="home-dashboard__update">
          <RefreshCw size={20} />
          <span>Launcher state</span>
          <strong>{updateMessage}</strong>
          <p>Last checked {formatDate(snapshot.launcherUpdate.checkedAt)}</p>
          <div className="home-dashboard__actions">
            <button
              className="text-button"
              disabled={busyAction === "check-launcher-update" || busyAction === "install-launcher-update"}
              onClick={checkLauncherUpdates}
              type="button"
            >
              {busyAction === "check-launcher-update" ? "Checking..." : "Check updates"}
            </button>
            {showInstallAction && (
              <button
                className="text-button"
                disabled={busyAction === "check-launcher-update" || busyAction === "install-launcher-update"}
                onClick={installLauncherUpdate}
                type="button"
              >
                {busyAction === "install-launcher-update" ? "Installing..." : "Install update"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="metric-panel">
          <Library size={22} />
          <span>Collection</span>
          <strong>{libraryItems.length}</strong>
          <p>{installedItems.length} installed locally</p>
        </article>
        <article className="metric-panel">
          <Download size={22} />
          <span>Downloads</span>
          <strong>{activeJobs.length}</strong>
          <p>{activeJobs.length === 1 ? "active transfer" : "active transfers"}</p>
        </article>
        <article className="metric-panel">
          <HardDrive size={22} />
          <span>Disk usage</span>
          <strong>{formatBytes(installedSize)}</strong>
          <p>{snapshot.config.libraries.length} registered libraries</p>
        </article>
        <article className="metric-panel">
          <Sparkles size={22} />
          <span>Updates</span>
          <strong>{updateCount}</strong>
          <p>{updateCount === 1 ? "item needs updating" : "items need updating"}</p>
        </article>
      </section>

      <LauncherUpdatePanel progress={updateProgress} />

      {activeJobs.length > 0 && (
        <section className="queue-strip">
          <div>
            <p className="eyebrow">Downloads</p>
            <h2>Active transfers</h2>
          </div>
          <div className="queue-strip__stack">
            {activeJobs.slice(0, 3).map((job) => (
              <button
                className="queue-strip__job"
                key={job.id}
                onClick={() => setRoute("downloads")}
                type="button"
              >
                <strong>{job.itemName}</strong>
                <span>{job.message}</span>
                <ProgressBar value={job.progress} compact />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="home-columns">
        <article className="activity-panel">
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2>What changed lately</h2>
            </div>
            <button className="button button--ghost" onClick={() => setRoute("library")} type="button">
              Open collection
            </button>
          </div>
          {recentActivity.length === 0 ? (
            <p className="muted">No recent activity yet. Add something from the Shop to get started.</p>
          ) : (
            <div className="activity-list">
              {recentActivity.map((event) => (
                <button
                  className="activity-row"
                  key={event.id}
                  onClick={() => setRoute(`item:${event.item.catalog.id}`)}
                  type="button"
                >
                  <ItemThumb item={event.item} compact />
                  <span>
                    <strong>{event.item.catalog.name}</strong>
                    <small>
                      {event.label} · {formatDate(event.at)}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="activity-panel">
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">Recently used</p>
              <h2>Jump back in</h2>
            </div>
            <button className="button button--ghost" onClick={() => setRoute("library")} type="button">
              View library
            </button>
          </div>
          {recentlyUsed.length === 0 ? (
            <p className="muted">Launch an installed item and it will appear here for quick access.</p>
          ) : (
            <div className="item-list">
              {recentlyUsed.map((item) => (
                <button
                  className="item-list__row"
                  key={item.catalog.id}
                  onClick={() => setRoute(`item:${item.catalog.id}`)}
                  type="button"
                >
                  <ItemThumb item={item} />
                  <span>
                    <strong>{item.catalog.name}</strong>
                    <small>Used {formatDate(item.collectionEntry?.lastUsedAt ?? item.installed?.lastLaunchedAt ?? null)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="home-columns">
        <article className="activity-panel">
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">Recent installs</p>
              <h2>Ready on this machine</h2>
            </div>
            <button className="button button--ghost" onClick={() => setRoute("downloads")} type="button">
              Open downloads
            </button>
          </div>
          {recentInstalls.length === 0 ? (
            <p className="muted">Installed items will show up here once a download or setup finishes.</p>
          ) : (
            <div className="item-list">
              {recentInstalls.map((item) => (
                <button
                  className="item-list__row"
                  key={item.catalog.id}
                  onClick={() => setRoute(`item:${item.catalog.id}`)}
                  type="button"
                >
                  <ItemThumb item={item} />
                  <span>
                    <strong>{item.catalog.name}</strong>
                    <small>Installed {formatDate(item.installed?.installedAt ?? null)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="activity-panel">
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">Collection status</p>
              <h2>Next steps</h2>
            </div>
          </div>
          <div className="home-action-list">
            <button className="home-action-card" onClick={() => setRoute("shop")} type="button">
              <strong>Discover more items</strong>
              <span>Browse new content and add it to your Library.</span>
            </button>
            <button className="home-action-card" onClick={() => setRoute("library")} type="button">
              <strong>Manage installs</strong>
              <span>Launch, update, repair, or uninstall from your collection.</span>
            </button>
            <button className="home-action-card" onClick={() => setRoute("settings")} type="button">
              <strong>Adjust local preferences</strong>
              <span>Review library folders, privacy defaults, and update behavior.</span>
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

function ItemThumb({ item, compact = false }: { item: ContentView; compact?: boolean }) {
  if (item.catalog.iconImage) {
    return <img className={compact ? "item-thumb item-thumb--compact" : "item-thumb"} src={item.catalog.iconImage} alt="" />;
  }

  return (
    <div className={compact ? "item-thumb item-thumb--compact item-thumb--fallback" : "item-thumb item-thumb--fallback"}>
      <span>{item.catalog.name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}
