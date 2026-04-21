import { Download, FolderOpen, Play, Plus, RefreshCw, Trash2, Wrench } from "lucide-react";
import { useState } from "react";

import { InstallDialog } from "../components/InstallDialog";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, formatDate, itemTypeLabel } from "../domain/format";
import type { ContentView } from "../domain/types";
import { useLauncher } from "../store/LauncherStore";

export function GameDetailView({ item }: { item: ContentView }) {
  const {
    snapshot,
    addItemToLibrary,
    installItem,
    launchItem,
    updateItem,
    repairItem,
    uninstallItem,
    openInstallFolder
  } = useLauncher();
  const [installOpen, setInstallOpen] = useState(false);

  if (!snapshot) return null;

  const manifest = item.manifest;

  return (
    <div className="view-stack">
      <section className="detail-hero">
        {item.catalog.bannerImage ? (
          <img src={item.catalog.bannerImage} alt="" />
        ) : (
          <div className="media-placeholder media-placeholder--hero" />
        )}
        <div className="detail-hero__content">
          <div className="detail-hero__title">
            {item.catalog.iconImage ? (
              <img src={item.catalog.iconImage} alt="" />
            ) : (
              <div className="item-thumb item-thumb--hero item-thumb--fallback">
                <span>{item.catalog.name.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div>
              <p className="eyebrow">
                {item.catalog.developer} · {itemTypeLabel(item.catalog.itemType)}
              </p>
              <h2>{item.catalog.name}</h2>
              <div className="tag-row">
                {[...item.catalog.categories, ...item.catalog.tags].map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <StatusBadge status={item.collectionStatus} type="collection" />
        </div>
      </section>

      <section className="detail-actions">
        {item.collectionStatus === "notAdded" && manifest && (
          <button className="button button--primary" onClick={() => addItemToLibrary(item.catalog.id)} type="button">
            <Plus size={16} />
            Add to Library
          </button>
        )}
        {item.collectionStatus !== "notAdded" && item.installState === "notInstalled" && manifest && (
          <button className="button button--primary" onClick={() => setInstallOpen(true)} type="button">
            <Download size={16} />
            Install
          </button>
        )}
        {item.installState === "installed" && (
          <button className="button button--primary" onClick={() => launchItem(item.catalog.id)} type="button">
            <Play size={16} />
            Launch
          </button>
        )}
        {item.installState === "updateAvailable" && (
          <button className="button button--primary" onClick={() => updateItem(item.catalog.id)} type="button">
            <RefreshCw size={16} />
            Update
          </button>
        )}
        {item.installState === "error" && (
          <button className="button button--primary" onClick={() => repairItem(item.catalog.id)} type="button">
            <Wrench size={16} />
            Repair
          </button>
        )}
        {item.installed && (
          <>
            <button className="button button--secondary" onClick={() => repairItem(item.catalog.id)} type="button">
              <Wrench size={16} />
              Verify / Repair
            </button>
            <button className="button button--secondary" onClick={() => openInstallFolder(item.catalog.id)} type="button">
              <FolderOpen size={16} />
              Show files
            </button>
            <button className="button button--danger" onClick={() => uninstallItem(item.catalog.id)} type="button">
              <Trash2 size={16} />
              Uninstall
            </button>
          </>
        )}
      </section>

      {item.activeJob && (
        <section className="install-panel">
          <div>
            <p className="eyebrow">{item.activeJob.phase}</p>
            <h2>{item.activeJob.message}</h2>
          </div>
          <ProgressBar value={item.activeJob.progress} />
        </section>
      )}

      <section className="detail-grid">
        <article className="detail-panel detail-panel--wide">
          <h2>Overview</h2>
          <p>{item.catalog.description}</p>
          <dl className="spec-list">
            <div>
              <dt>Type</dt>
              <dd>{itemTypeLabel(item.catalog.itemType)}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{manifest ? `v${manifest.version}` : item.installed?.installedVersion ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Install size</dt>
              <dd>{formatBytes(manifest?.installSizeBytes ?? item.installed?.sizeOnDiskBytes ?? 0)}</dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>{item.catalog.releaseDate}</dd>
            </div>
            <div>
              <dt>Executable</dt>
              <dd>{manifest?.executable ?? "Not currently available"}</dd>
            </div>
            <div>
              <dt>Discoverable</dt>
              <dd>{item.state.discoverable ? "Available in Shop" : "Library only"}</dd>
            </div>
          </dl>
          {item.lastError && <p className="field-error">{item.lastError}</p>}
        </article>

        <article className="detail-panel">
          <h2>Installed</h2>
          {item.installed ? (
            <dl className="spec-list spec-list--stacked">
              <div>
                <dt>Location</dt>
                <dd>{item.installed.installPath}</dd>
              </div>
              <div>
                <dt>Installed</dt>
                <dd>{formatDate(item.installed.installedAt)}</dd>
              </div>
              <div>
                <dt>Verified</dt>
                <dd>{formatDate(item.installed.lastVerifiedAt)}</dd>
              </div>
              <div>
                <dt>Last opened</dt>
                <dd>{formatDate(item.installed.lastLaunchedAt ?? item.collectionEntry?.lastUsedAt ?? null)}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">
              {item.collectionStatus === "notAdded"
                ? "Add this item to your Library before installing it."
                : manifest
                  ? "Added to your Library, but not installed yet."
                  : "This item is currently unavailable in the Shop and cannot be reinstalled right now."}
            </p>
          )}
        </article>
      </section>

      <section className="changelog">
        <div>
          <p className="eyebrow">Release notes</p>
          <h2>Changelog</h2>
        </div>
        {manifest?.changelog.length ? (
          manifest.changelog.map((entry) => (
            <article key={`${entry.version}-${entry.date}`} className="changelog-entry">
              <strong>v{entry.version}</strong>
              <span>{entry.date}</span>
              <ul>
                {entry.items.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </article>
          ))
        ) : (
          <p className="muted">No changelog is available for this item right now.</p>
        )}
      </section>

      {installOpen && manifest && (
        <InstallDialog
          item={item}
          libraries={snapshot.config.libraries}
          defaultLibraryId={snapshot.config.defaultLibraryId}
          onClose={() => setInstallOpen(false)}
          onInstall={async (libraryId) => {
            await installItem(item.catalog.id, libraryId);
          }}
        />
      )}
    </div>
  );
}
