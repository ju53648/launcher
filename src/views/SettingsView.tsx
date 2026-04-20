import { FolderPlus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { LauncherUpdatePanel } from "../components/LauncherUpdatePanel";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../domain/format";
import { chooseDirectory } from "../services/tauri";
import { useLauncher } from "../store/LauncherStore";

export function SettingsView() {
  const {
    snapshot,
    addLibrary,
    renameLibrary,
    removeLibrary,
    setDefaultLibrary,
    updatePreferences,
    checkLauncherUpdates,
    installLauncherUpdate,
    checkGameUpdates,
    busyAction,
    updateProgress
  } = useLauncher();
  const [newLibraryName, setNewLibraryName] = useState("Games");
  const [newLibraryPath, setNewLibraryPath] = useState("");
  const [libraryNames, setLibraryNames] = useState<Record<string, string>>({});

  const preferences = useMemo(() => {
    if (!snapshot) return null;
    return {
      checkLauncherUpdatesOnStart: snapshot.config.checkLauncherUpdatesOnStart,
      checkGameUpdatesOnStart: snapshot.config.checkGameUpdatesOnStart,
      askForLibraryEachInstall: snapshot.config.installBehavior.askForLibraryEachInstall,
      createDesktopShortcuts: snapshot.config.installBehavior.createDesktopShortcuts,
      keepDownloadCache: snapshot.config.installBehavior.keepDownloadCache
    };
  }, [snapshot]);
  const [draftPreferences, setDraftPreferences] = useState(preferences);

  if (!snapshot) return null;

  const prefs = draftPreferences ?? preferences!;

  return (
    <div className="settings-layout">
      <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">Storage</p>
            <h2>Libraries</h2>
          </div>
          <button
            className="button button--secondary"
            onClick={async () => {
              const path = await chooseDirectory();
              if (path) setNewLibraryPath(path);
            }}
            type="button"
          >
            <FolderPlus size={16} />
            Choose folder
          </button>
        </div>

        <div className="add-library">
          <label>
            <span>Name</span>
            <input
              value={newLibraryName}
              onChange={(event) => setNewLibraryName(event.target.value)}
              placeholder="Games"
            />
          </label>
          <label>
            <span>Path</span>
            <input
              value={newLibraryPath}
              onChange={(event) => setNewLibraryPath(event.target.value)}
              placeholder={snapshot.recommendedLibraryPath}
            />
          </label>
          <button
            className="button button--primary"
            disabled={!newLibraryPath.trim()}
            onClick={async () => {
              await addLibrary(newLibraryName, newLibraryPath);
              setNewLibraryPath("");
            }}
            type="button"
          >
            Add library
          </button>
        </div>

        <div className="library-list">
          {snapshot.config.libraries.map((library) => (
            <article key={library.id} className="library-row">
              <div className="library-row__main">
                <div className="library-row__name">
                  <input
                    value={libraryNames[library.id] ?? library.name}
                    onChange={(event) =>
                      setLibraryNames((current) => ({
                        ...current,
                        [library.id]: event.target.value
                      }))
                    }
                  />
                  {library.isDefault && <span className="default-chip">Default</span>}
                  <StatusBadge status={library.status} type="library" />
                </div>
                <small>{library.path}</small>
                <small>Last seen: {formatDate(library.lastSeenAt)}</small>
              </div>
              <div className="library-row__actions">
                <button
                  className="button button--ghost"
                  onClick={() => renameLibrary(library.id, libraryNames[library.id] ?? library.name)}
                  type="button"
                >
                  Save
                </button>
                {!library.isDefault && (
                  <button className="button button--ghost" onClick={() => setDefaultLibrary(library.id)} type="button">
                    Make default
                  </button>
                )}
                <button className="icon-button" onClick={() => removeLibrary(library.id)} type="button" aria-label="Remove library">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">Maintenance</p>
            <h2>Updates and installs</h2>
          </div>
          <button
            className="button button--primary"
            onClick={() =>
              updatePreferences(
                prefs.checkLauncherUpdatesOnStart,
                prefs.checkGameUpdatesOnStart,
                prefs.askForLibraryEachInstall,
                prefs.createDesktopShortcuts,
                prefs.keepDownloadCache
              )
            }
            type="button"
          >
            <Save size={16} />
            Save
          </button>
        </div>

        <div className="toggle-grid">
          {[
            ["checkLauncherUpdatesOnStart", "Check launcher updates on start"],
            ["checkGameUpdatesOnStart", "Check game updates on start"],
            ["askForLibraryEachInstall", "Ask for library on every install"],
            ["createDesktopShortcuts", "Create desktop shortcuts"],
            ["keepDownloadCache", "Keep download cache"]
          ].map(([key, label]) => (
            <label key={key} className="toggle-row">
              <input
                type="checkbox"
                checked={Boolean(prefs[key as keyof typeof prefs])}
                onChange={(event) =>
                  setDraftPreferences((current) => ({
                    ...(current ?? preferences!),
                    [key]: event.target.checked
                  }))
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="action-row">
          <button
            className="button button--secondary"
            disabled={busyAction === "check-launcher-update" || busyAction === "install-launcher-update"}
            onClick={checkLauncherUpdates}
            type="button"
          >
            <RefreshCw size={16} />
            {busyAction === "check-launcher-update" ? "Checking launcher..." : "Check launcher"}
          </button>
          <button
            className="button button--primary"
            disabled={busyAction === "check-launcher-update" || busyAction === "install-launcher-update"}
            onClick={installLauncherUpdate}
            type="button"
          >
            <RefreshCw size={16} />
            {busyAction === "install-launcher-update" ? "Updating launcher..." : "Update launcher"}
          </button>
          <button className="button button--secondary" onClick={checkGameUpdates} type="button">
            <RefreshCw size={16} />
            Check games
          </button>
        </div>
        <LauncherUpdatePanel progress={updateProgress} />
      </section>

      <section className="settings-section">
        <div>
          <p className="eyebrow">Privacy</p>
          <h2>No telemetry</h2>
        </div>
        <div className="privacy-panel">
          <ShieldCheck size={24} />
          <div>
            <strong>Accounts, analytics and crash uploads are disabled.</strong>
            <p>{snapshot.config.privacy.networkAccessNote}</p>
          </div>
        </div>
        <dl className="spec-list spec-list--stacked">
          <div>
            <dt>Data</dt>
            <dd>{snapshot.dataDir}</dd>
          </div>
          <div>
            <dt>Cache</dt>
            <dd>{snapshot.cacheDir}</dd>
          </div>
          <div>
            <dt>Logs</dt>
            <dd>{snapshot.logsDir}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
