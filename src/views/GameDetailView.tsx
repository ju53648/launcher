import { ArrowLeft, Check, Download, FolderInput, FolderOpen, Play, Plus, RefreshCw, Star, Trash2, Wrench, X } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { InstallDialog } from "../components/InstallDialog";
import { MoveDialog } from "../components/MoveDialog";
import { ProgressBar } from "../components/ProgressBar";
import { RecommendationSection } from "../components/RecommendationSection";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, formatDate, itemTypeLabel, jobProgressLabel } from "../domain/format";
import { resolveCatalogImageSrc } from "../domain/media";
import { getGameStatus, getPrimaryGameAction, getSimilarItems } from "../domain/selectors";
import { getTagLabel, sortTagsByWeight } from "../domain/tags";
import type { ContentView } from "../domain/types";
import { useI18n } from "../i18n";
import { isTauriRuntime } from "../services/tauri";
import { useLauncher } from "../store/LauncherStore";
import type { AppRoute } from "../components/AppShell";

export function GameDetailView({
  item,
  setRoute
}: {
  item: ContentView;
  setRoute: (route: AppRoute) => void;
}) {
  const { locale, t } = useI18n();
  const {
    snapshot,
    personalization,
    setFavoriteItem,
    addItemToLibrary,
    installItem,
    launchItem,
    closeItem,
    updateItem,
    repairItem,
    moveInstallItem,
    uninstallItem,
    removeItemFromLibrary,
    openInstallFolder
  } = useLauncher();
  const isFavorite = personalization.favoriteItemId === item.catalog.id;
  const [installOpen, setInstallOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [uninstallOpen, setUninstallOpen] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);

  if (!snapshot) return null;

  const runningInTauri = isTauriRuntime();
  const manifest = item.manifest;
  const similarItems = getSimilarItems(snapshot, item.catalog.id, 3);
  const hasActiveJob = Boolean(item.activeJob);
  const gameStatus = getGameStatus(item);
  const primaryAction = getPrimaryGameAction(item);
  const isInstalled = gameStatus !== "notInstalled";
  const bannerImageSrc = resolveCatalogImageSrc(
    item.catalog.bannerImage,
    manifest?.version ?? item.catalog.releaseDate
  );
  const iconImageSrc = resolveCatalogImageSrc(
    item.catalog.iconImage,
    manifest?.version ?? item.catalog.releaseDate
  );
  const preferredReturnRoute: AppRoute =
    item.collectionStatus === "notAdded" ? "shop" : "library";
  const canMoveInstall = snapshot.config.libraries.some(
    (library) => library.status === "available" && library.id !== item.installed?.libraryId
  );
  const showFilesLabel = runningInTauri
    ? t("common.actions.showFiles")
    : pathCopied
      ? t("detail.installedPanel.previewCopied")
      : t("detail.installedPanel.previewCopyAction");

  const handleInstall = async () => {
    const { askForLibraryEachInstall } = snapshot.config.installBehavior;
    const defaultLibraryId = snapshot.config.defaultLibraryId;

    if (askForLibraryEachInstall || !defaultLibraryId) {
      setInstallOpen(true);
      return;
    }

    await installItem(item.catalog.id, defaultLibraryId);
  };

  const handleOpenInstallFolder = async () => {
    await openInstallFolder(item.catalog.id);
    if (!runningInTauri) {
      setPathCopied(true);
      window.setTimeout(() => setPathCopied(false), 1800);
    }
  };

  return (
    <div className="view-stack">
      <section className="detail-hero">
        {bannerImageSrc ? (
          <img src={bannerImageSrc} alt="" />
        ) : (
          <div className="media-placeholder media-placeholder--hero" />
        )}
        <div className="detail-hero__content">
          <div className="detail-hero__title">
            {iconImageSrc ? (
              <img src={iconImageSrc} alt="" />
            ) : (
              <div className="item-thumb item-thumb--hero item-thumb--fallback">
                <span>{item.catalog.name.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div>
              <button
                className="button button--ghost detail-back"
                onClick={() => setRoute(preferredReturnRoute)}
                type="button"
              >
                <ArrowLeft size={16} />
                {t("common.actions.back")}
              </button>
              <p className="eyebrow">
                {item.catalog.developer} / {itemTypeLabel(item.catalog.itemType, t)}
              </p>
              <h2>{item.catalog.name}</h2>
              <p className="detail-hero__tagline">{item.catalog.description}</p>
              <div className="tag-row">
                {item.catalog.categories.map((category) => (
                  <span key={category}>{category}</span>
                ))}
                {sortTagsByWeight(item.catalog.tags).map((tag) => (
                  <span key={tag.id}>{getTagLabel(tag.id, t)}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="detail-hero__badges">
            <StatusBadge status={gameStatus} type="game" />
            {isFavorite && (
              <span className="detail-favorite-badge">
                <Star size={12} />
                {t("detail.favoriteLabel")}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="detail-actions">
        <div className="detail-actions__row">
          {item.collectionStatus === "notAdded" && manifest && (
            <button
              className="button button--primary"
              onClick={() => addItemToLibrary(item.catalog.id)}
              type="button"
            >
              <Plus size={16} />
              {t("common.actions.addToLibrary")}
            </button>
          )}
          {item.collectionStatus !== "notAdded" && primaryAction === "install" && manifest && (
            <button
              className="button button--primary"
              onClick={() => {
                void handleInstall();
              }}
              type="button"
            >
              <Download size={16} />
              {t("common.actions.install")}
            </button>
          )}
          {primaryAction === "launch" &&
            (item.isRunning ? (
              <button className="button button--danger" onClick={() => closeItem(item.catalog.id)} type="button">
                <X size={16} />
                {t("common.actions.closeGame")}
              </button>
            ) : (
              <button className="button button--primary" onClick={() => launchItem(item.catalog.id)} type="button">
                <Play size={16} />
                {t("common.actions.launch")}
              </button>
            ))}
          {primaryAction === "update" && (
            <button className="button button--primary" onClick={() => updateItem(item.catalog.id)} type="button">
              <RefreshCw size={16} />
              {t("common.actions.update")}
            </button>
          )}
          {primaryAction === "repair" && (
            <button className="button button--primary" onClick={() => repairItem(item.catalog.id)} type="button">
              <Wrench size={16} />
              {t("common.actions.repair")}
            </button>
          )}
        </div>
        {isInstalled && (
          <div className="detail-actions__row">
            <button className="button button--secondary" disabled={hasActiveJob || item.isRunning} onClick={() => repairItem(item.catalog.id)} type="button">
              <Wrench size={16} />
              {t("common.actions.verifyRepair")}
            </button>
            <button
              className="button button--secondary"
              disabled={hasActiveJob || item.isRunning}
              onClick={() => {
                void handleOpenInstallFolder();
              }}
              type="button"
            >
              {runningInTauri ? <FolderOpen size={16} /> : pathCopied ? <Check size={16} /> : <FolderOpen size={16} />}
              {showFilesLabel}
            </button>
            <button
              className="button button--secondary"
              disabled={hasActiveJob || item.isRunning || !canMoveInstall}
              onClick={() => setMoveOpen(true)}
              type="button"
            >
              <FolderInput size={16} />
              {t("common.actions.moveInstall")}
            </button>
            <button
              className="button button--danger"
              disabled={hasActiveJob || item.isRunning}
              onClick={() => setUninstallOpen(true)}
              type="button"
            >
              <Trash2 size={16} />
              {t("common.actions.uninstall")}
            </button>
            {item.collectionStatus !== "notAdded" && (
              <button
                className="button button--ghost"
                disabled={hasActiveJob || item.isRunning}
                onClick={() => setRemoveOpen(true)}
                type="button"
              >
                <Trash2 size={16} />
                {t("common.actions.removeFromLibrary")}
              </button>
            )}
          </div>
        )}
        {!isInstalled && item.collectionStatus !== "notAdded" && (
          <div className="detail-actions__row">
            <button
              className="button button--ghost"
              disabled={hasActiveJob || item.isRunning}
              onClick={() => setRemoveOpen(true)}
              type="button"
            >
              <Trash2 size={16} />
              {t("common.actions.removeFromLibrary")}
            </button>
          </div>
        )}
        <div className="detail-actions__row">
          <button
            className={`button ${isFavorite ? "button--primary" : "button--ghost"}`}
            onClick={() => void setFavoriteItem(isFavorite ? null : item.catalog.id)}
            type="button"
          >
            <Star size={16} />
            {isFavorite ? t("detail.removeFavorite") : t("detail.addFavorite")}
          </button>
        </div>
        {hasActiveJob && <p className="detail-actions__hint">{t("library.card.transferHint")}</p>}
        {!hasActiveJob && isInstalled && !item.isRunning && !canMoveInstall && (
          <p className="detail-actions__hint">{t("moveDialog.noLibrariesBody")}</p>
        )}
      </section>

      {item.activeJob && (
        <section className="install-panel">
          <div>
            <p className="eyebrow">{t(`status.phase.${item.activeJob.phase}`)}</p>
            <h2>{jobProgressLabel(item.activeJob, t)}</h2>
          </div>
          <ProgressBar value={item.activeJob.progress} />
        </section>
      )}

      <section className="detail-grid">
        <article className="detail-panel detail-panel--wide">
          <h2>{t("common.labels.overview")}</h2>
          <p>{item.catalog.description}</p>
          <dl className="spec-list">
            <div>
              <dt>{t("common.labels.type")}</dt>
              <dd>{itemTypeLabel(item.catalog.itemType, t)}</dd>
            </div>
            <div>
              <dt>{t("common.labels.version")}</dt>
              <dd>{manifest ? `v${manifest.version}` : item.installed?.installedVersion ?? t("common.notAvailable")}</dd>
            </div>
            <div>
              <dt>{t("common.labels.installSize")}</dt>
              <dd>{formatBytes(manifest?.installSizeBytes ?? item.installed?.sizeOnDiskBytes ?? 0, locale)}</dd>
            </div>
            <div>
              <dt>{t("common.labels.release")}</dt>
              <dd>{item.catalog.releaseDate}</dd>
            </div>
            <div>
              <dt>{t("common.labels.executable")}</dt>
              <dd>{manifest?.executable ?? t("detail.executableUnavailable")}</dd>
            </div>
            <div>
              <dt>{t("common.labels.discoverable")}</dt>
              <dd>{item.state.discoverable ? t("detail.discoverable.yes") : t("detail.discoverable.no")}</dd>
            </div>
          </dl>
          {item.lastError && <p className="field-error">{item.lastError}</p>}
        </article>

        <article className="detail-panel">
          <h2>{t("common.labels.installed")}</h2>
          {item.installed ? (
            <dl className="spec-list spec-list--stacked">
              <div>
                <dt>{t("common.labels.location")}</dt>
                <dd>{item.installed.installPath}</dd>
              </div>
              <div>
                <dt>{t("common.labels.installed")}</dt>
                <dd>{formatDate(item.installed.installedAt, locale, t)}</dd>
              </div>
              <div>
                <dt>{t("common.labels.verified")}</dt>
                <dd>{formatDate(item.installed.lastVerifiedAt, locale, t)}</dd>
              </div>
              <div>
                <dt>{t("common.labels.lastOpened")}</dt>
                <dd>
                  {formatDate(
                    item.installed.lastLaunchedAt ?? item.collectionEntry?.lastUsedAt ?? null,
                    locale,
                    t
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="muted">
              {item.collectionStatus === "notAdded"
                ? t("detail.installedPanel.notAdded")
                : manifest
                  ? t("detail.installedPanel.notInstalled")
                  : t("detail.installedPanel.unavailable")}
            </p>
          )}
          {item.installed && !runningInTauri ? (
            <p className={`detail-installed-note ${pathCopied ? "is-success" : ""}`}>
              {pathCopied
                ? t("detail.installedPanel.previewCopied")
                : t("detail.installedPanel.previewHint")}
            </p>
          ) : null}
        </article>
      </section>

      <RecommendationSection
        eyebrow={t("detail.similar.eyebrow")}
        title={t("detail.similar.title")}
        description={t("detail.similar.body")}
        entries={similarItems}
        onOpen={(itemId) => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setRoute(`item:${itemId}`);
        }}
      />

      <section className="changelog">
        <div>
          <p className="eyebrow">{t("common.labels.releaseNotes")}</p>
          <h2>{t("common.labels.changelog")}</h2>
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
          <p className="muted">{t("detail.changelogEmpty")}</p>
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

      {moveOpen && (
        <MoveDialog
          item={item}
          libraries={snapshot.config.libraries}
          onClose={() => setMoveOpen(false)}
          onMove={async (targetLibraryId) => {
            await moveInstallItem(item.catalog.id, targetLibraryId);
          }}
        />
      )}

      {removeOpen && (
        <ConfirmDialog
          title={t("library.removeDialog.title", { name: item.catalog.name })}
          body={t("library.removeDialog.body", { name: item.catalog.name })}
          confirmLabel={t("common.actions.removeFromLibrary")}
          details={[
            t("library.removeDialog.keepInstalledFiles"),
            t("library.removeDialog.addedAt", {
              date: formatDate(item.collectionEntry?.addedAt ?? null, locale, t)
            })
          ]}
          onClose={() => setRemoveOpen(false)}
          onConfirm={async () => {
            await removeItemFromLibrary(item.catalog.id);
            setRoute("library");
          }}
        />
      )}

      {uninstallOpen && (
        <ConfirmDialog
          title={t("library.uninstallDialog.title", { name: item.catalog.name })}
          body={t("library.uninstallDialog.body", { name: item.catalog.name })}
          confirmLabel={t("common.actions.uninstall")}
          details={[
            t("library.uninstallDialog.removeFiles"),
            t("library.uninstallDialog.keepLibraryEntry")
          ]}
          onClose={() => setUninstallOpen(false)}
          onConfirm={async () => {
            await uninstallItem(item.catalog.id);
          }}
        />
      )}
    </div>
  );
}
