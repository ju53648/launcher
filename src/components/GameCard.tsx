import { Download, Play, Wrench } from "lucide-react";

import { formatBytes, itemTypeLabel, jobProgressLabel } from "../domain/format";
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
  onUpdate,
  onRepair
}: {
  item: ContentView;
  onOpen: () => void;
  onInstall: () => void;
  onLaunch: () => void;
  onUpdate: () => void;
  onRepair: () => void;
}) {
  const { locale, t } = useI18n();
  const manifest = item.manifest;

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
          <StatusBadge status={item.collectionStatus} type="collection" />
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
          <div className="game-card__meta">
            <span>{manifest ? `v${manifest.version}` : t("shop.card.unavailable")}</span>
            <span>
              {formatBytes(
                manifest?.installSizeBytes ?? item.installed?.sizeOnDiskBytes ?? 0,
                locale
              )}
            </span>
          </div>
        )}

        {item.lastError && <p className="field-error">{item.lastError}</p>}

        <div className="game-card__actions">
          {item.installState === "installed" && (
            <button className="button button--primary" onClick={onLaunch} type="button">
              <Play size={16} />
              {t("common.actions.launch")}
            </button>
          )}
          {item.installState === "notInstalled" && manifest && (
            <button className="button button--primary" onClick={onInstall} type="button">
              <Download size={16} />
              {t("common.actions.install")}
            </button>
          )}
          {item.installState === "updateAvailable" && (
            <button className="button button--primary" onClick={onUpdate} type="button">
              <Download size={16} />
              {t("common.actions.update")}
            </button>
          )}
          {item.installState === "error" && (
            <button className="button button--primary" onClick={onRepair} type="button">
              <Wrench size={16} />
              {t("common.actions.repair")}
            </button>
          )}
          <button className="button button--ghost" onClick={onOpen} type="button">
            {t("common.actions.details")}
          </button>
        </div>
      </div>
    </article>
  );
}
