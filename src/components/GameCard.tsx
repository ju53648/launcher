import { Download, Play, Trash2, Wrench } from "lucide-react";

import { formatBytes, formatDate, formatPlaytime, itemTypeLabel, jobProgressLabel } from "../domain/format";
import { getGameStatus, getPrimaryGameAction } from "../domain/selectors";
import { getTagLabel, sortTagsByWeight } from "../domain/tags";
import type { ContentView } from "../domain/types";
import { useI18n } from "../i18n";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

export function GameCard({
  item,
  onOpen,
  onInstall,
  onLaunch,
  onClose,
  onUpdate,
  onRepair,
  onUninstall,
  onRemove
}: {
  item: ContentView;
  onOpen: () => void;
  onInstall: () => void;
  onLaunch: () => void;
  onClose: () => void;
  onUpdate: () => void;
  onRepair: () => void;
  onUninstall: () => void;
  onRemove: () => void;
}) {
  const { locale, t } = useI18n();
  const manifest = item.manifest;
  const gameStatus = getGameStatus(item);
  const primaryAction = getPrimaryGameAction(item);
  const isInstalled = gameStatus !== "notInstalled";
  const hasActiveJob = Boolean(item.activeJob);
  const canRemove = Boolean(item.collectionEntry) && !isInstalled && !hasActiveJob && !item.isRunning;
  const canUninstall = isInstalled && !hasActiveJob && !item.isRunning;
  const lastPlayedAt = item.collectionEntry?.lastUsedAt ?? item.installed?.lastLaunchedAt ?? null;
  const addedAt = item.collectionEntry?.addedAt ?? null;
  const totalPlaytimeMinutes = item.collectionEntry?.totalPlaytimeMinutes ?? 0;

  return (
    <article className="game-card">
      <button className="game-card__media" onClick={onOpen} type="button">
        {item.catalog.coverImage ? (
          <img
            src={item.catalog.coverImage}
            alt={t("accessibility.coverImage", { name: item.catalog.name })}
          />
        ) : (
          <div className="media-placeholder media-placeholder--card">
            <span>{item.catalog.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </button>
      <div className="game-card__body">
        <div className="game-card__title-row">
          <div>
            <h3>{item.catalog.name}</h3>
            <p>
              {item.catalog.developer} / {itemTypeLabel(item.catalog.itemType, t)}
            </p>
          </div>
          <div className="game-card__badges">
            <StatusBadge status={gameStatus} type="game" />
          </div>
        </div>

        <p className="game-card__description">{item.catalog.description}</p>

        <div className="game-card__tags">
          {item.catalog.categories.slice(0, 2).map((category) => (
            <span key={category}>{category}</span>
          ))}
          {sortTagsByWeight(item.catalog.tags)
            .slice(0, 2)
            .map((tag) => (
              <span key={tag.id}>{getTagLabel(tag.id, t)}</span>
            ))}
        </div>

        {item.activeJob ? (
          <div className="game-card__job">
            <span>{jobProgressLabel(item.activeJob, t)}</span>
            <ProgressBar value={item.activeJob.progress} compact />
          </div>
        ) : (
          <div className="game-card__facts">
            <div className="game-card__meta">
              <span>{t("common.labels.version")}</span>
              <strong>{manifest ? `v${manifest.version}` : t("shop.card.unavailable")}</strong>
            </div>
            <div className="game-card__meta">
              <span>{t("common.labels.installSize")}</span>
              <strong>
                {formatBytes(
                  manifest?.installSizeBytes ?? item.installed?.sizeOnDiskBytes ?? 0,
                  locale
                )}
              </strong>
            </div>
            <div className="game-card__meta">
              <span>{t("library.card.lastPlayed")}</span>
              <strong>{formatDate(lastPlayedAt, locale, t)}</strong>
            </div>
            <div className="game-card__meta">
              <span>{t("library.card.playtime")}</span>
              <strong>{formatPlaytime(totalPlaytimeMinutes, locale, t)}</strong>
            </div>
            <div className="game-card__meta">
              <span>{t("library.card.recentlyAdded")}</span>
              <strong>{formatDate(addedAt, locale, t)}</strong>
            </div>
          </div>
        )}

        {item.lastError && <p className="field-error">{item.lastError}</p>}
        {hasActiveJob ? (
          <p className="game-card__hint">{t("library.card.transferHint")}</p>
        ) : isInstalled ? (
          <p className="game-card__hint">{t("library.card.removeHint")}</p>
        ) : null}

        <div className="game-card__actions">
          <div className="game-card__primary-actions">
            {primaryAction === "launch" &&
              (item.isRunning ? (
                <button className="button button--danger" onClick={onClose} type="button">
                  {t("common.actions.closeGame")}
                </button>
              ) : (
                <button className="button button--primary" onClick={onLaunch} type="button">
                  <Play size={16} />
                  {t("common.actions.launch")}
                </button>
              ))}
            {primaryAction === "install" && manifest && (
              <button className="button button--primary" onClick={onInstall} type="button">
                <Download size={16} />
                {t("common.actions.install")}
              </button>
            )}
            {primaryAction === "update" && (
              <button className="button button--primary" onClick={onUpdate} type="button">
                <Download size={16} />
                {t("common.actions.update")}
              </button>
            )}
            {primaryAction === "repair" && (
              <button className="button button--primary" onClick={onRepair} type="button">
                <Wrench size={16} />
                {t("common.actions.repair")}
              </button>
            )}
          </div>
          <div className="game-card__secondary-actions">
            {isInstalled && (
              <button
                className="button button--secondary"
                disabled={!canUninstall}
                onClick={onUninstall}
                type="button"
              >
                <Trash2 size={16} />
                {t("common.actions.uninstall")}
              </button>
            )}
            <button
              className="button button--ghost"
              disabled={!canRemove}
              onClick={onRemove}
              type="button"
            >
              <Trash2 size={16} />
              {t("common.actions.removeFromLibrary")}
            </button>
            <button className="button button--ghost" onClick={onOpen} type="button">
              {t("common.actions.details")}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
