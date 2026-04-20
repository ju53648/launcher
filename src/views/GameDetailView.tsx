import { Download, FolderOpen, Play, RefreshCw, Trash2, Wrench } from "lucide-react";
import { useState } from "react";

import { InstallDialog } from "../components/InstallDialog";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, formatDate } from "../domain/format";
import type { GameView } from "../domain/types";
import { useLauncher } from "../store/LauncherStore";

export function GameDetailView({ game }: { game: GameView }) {
  const {
    snapshot,
    installGame,
    launchGame,
    updateGame,
    repairGame,
    uninstallGame,
    openInstallFolder
  } = useLauncher();
  const [installOpen, setInstallOpen] = useState(false);

  if (!snapshot) return null;

  return (
    <div className="view-stack">
      <section className="detail-hero">
        <img src={game.manifest.bannerImage} alt="" />
        <div className="detail-hero__content">
          <div className="detail-hero__title">
            <img src={game.manifest.iconImage} alt="" />
            <div>
              <p className="eyebrow">{game.manifest.developer}</p>
              <h2>{game.manifest.name}</h2>
              <div className="tag-row">
                {game.manifest.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <StatusBadge status={game.status} />
        </div>
      </section>

      <section className="detail-actions">
        {game.status === "notInstalled" && (
          <button className="button button--primary" onClick={() => setInstallOpen(true)} type="button">
            <Download size={16} />
            Install
          </button>
        )}
        {game.status === "installed" && (
          <button className="button button--primary" onClick={() => launchGame(game.manifest.id)} type="button">
            <Play size={16} />
            Play
          </button>
        )}
        {game.status === "updateAvailable" && (
          <button className="button button--primary" onClick={() => updateGame(game.manifest.id)} type="button">
            <RefreshCw size={16} />
            Update
          </button>
        )}
        {game.status === "error" && (
          <button className="button button--primary" onClick={() => repairGame(game.manifest.id)} type="button">
            <Wrench size={16} />
            Repair
          </button>
        )}
        {game.installed && (
          <>
            <button className="button button--secondary" onClick={() => repairGame(game.manifest.id)} type="button">
              <Wrench size={16} />
              Verify / Repair
            </button>
            <button className="button button--secondary" onClick={() => openInstallFolder(game.manifest.id)} type="button">
              <FolderOpen size={16} />
              Show files
            </button>
            <button className="button button--danger" onClick={() => uninstallGame(game.manifest.id)} type="button">
              <Trash2 size={16} />
              Uninstall
            </button>
          </>
        )}
      </section>

      {game.activeJob && (
        <section className="install-panel">
          <div>
            <p className="eyebrow">{game.activeJob.phase}</p>
            <h2>{game.activeJob.message}</h2>
          </div>
          <ProgressBar value={game.activeJob.progress} />
        </section>
      )}

      <section className="detail-grid">
        <article className="detail-panel detail-panel--wide">
          <h2>Overview</h2>
          <p>{game.manifest.description}</p>
          <dl className="spec-list">
            <div>
              <dt>Version</dt>
              <dd>v{game.manifest.version}</dd>
            </div>
            <div>
              <dt>Install size</dt>
              <dd>{formatBytes(game.manifest.installSizeBytes)}</dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>{game.manifest.releaseDate}</dd>
            </div>
            <div>
              <dt>Executable</dt>
              <dd>{game.manifest.executable}</dd>
            </div>
          </dl>
        </article>

        <article className="detail-panel">
          <h2>Installed</h2>
          {game.installed ? (
            <dl className="spec-list spec-list--stacked">
              <div>
                <dt>Location</dt>
                <dd>{game.installed.installPath}</dd>
              </div>
              <div>
                <dt>Installed</dt>
                <dd>{formatDate(game.installed.installedAt)}</dd>
              </div>
              <div>
                <dt>Verified</dt>
                <dd>{formatDate(game.installed.lastVerifiedAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">Not installed yet.</p>
          )}
        </article>
      </section>

      <section className="changelog">
        <div>
          <p className="eyebrow">Release notes</p>
          <h2>Changelog</h2>
        </div>
        {game.manifest.changelog.map((entry) => (
          <article key={`${entry.version}-${entry.date}`} className="changelog-entry">
            <strong>v{entry.version}</strong>
            <span>{entry.date}</span>
            <ul>
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      {installOpen && (
        <InstallDialog
          game={game}
          libraries={snapshot.config.libraries}
          defaultLibraryId={snapshot.config.defaultLibraryId}
          onClose={() => setInstallOpen(false)}
          onInstall={async (libraryId) => {
            await installGame(game.manifest.id, libraryId);
          }}
        />
      )}
    </div>
  );
}
