import { ArrowRight, Download, HardDrive, Library, Pin, PinOff, Play, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { LauncherAvatar } from "../components/LauncherAvatar";
import { LauncherUpdatePanel } from "../components/LauncherUpdatePanel";
import { ProgressBar } from "../components/ProgressBar";
import {
  formatBytes,
  formatDate,
  jobProgressLabel
} from "../domain/format";
import { resolveCatalogImageSrc } from "../domain/media";
import {
  buildRecentActivity,
  getActiveJobs,
  getInstalledItems,
  getLibraryItems,
  getRecentlyInstalledItems,
  getRecentlyUsedItems
} from "../domain/selectors";
import type { ContentView } from "../domain/types";
import { getProfileScopedStorageKey } from "../domain/profileStorage";
import { useI18n } from "../i18n";
import { describeLauncherUpdateProgress } from "../services/appUpdater";
import { useLauncher } from "../store/LauncherStore";

const PINNED_GAMES_STORAGE_KEY = "lumorix.home.pinnedGames";
const MAX_PINNED_GAMES = 3;

export function HomeView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { locale, t } = useI18n();
  const {
    snapshot,
    personalization,
    activeProfileId,
    launchItem,
    checkLauncherUpdates,
    installLauncherUpdate,
    busyAction,
    updateProgress
  } = useLauncher();
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => loadPinnedGameIds(activeProfileId));

  useEffect(() => {
    setPinnedIds(loadPinnedGameIds(activeProfileId));
  }, [activeProfileId]);

  useEffect(() => {
    if (!snapshot) return;
    const validLibraryGames = new Set(
      snapshot.items
        .filter((item) => item.collectionStatus !== "notAdded" && item.catalog.itemType === "game")
        .map((item) => item.catalog.id)
    );
    const next = pinnedIds.filter((id) => validLibraryGames.has(id)).slice(0, MAX_PINNED_GAMES);
    if (next.length !== pinnedIds.length) {
      setPinnedIds(next);
      savePinnedGameIds(activeProfileId, next);
    }
  }, [activeProfileId, pinnedIds, snapshot]);

  if (!snapshot) return null;

  const libraryItems = getLibraryItems(snapshot);
  const installedItems = getInstalledItems(snapshot);
  const activeJobs = getActiveJobs(snapshot);
  const recentActivity = buildRecentActivity(snapshot, 6);
  const recentInstalls = getRecentlyInstalledItems(snapshot, 4);
  const recentlyUsed = getRecentlyUsedItems(snapshot, 4);
  // The most recently played/used installed game for the "continue" hero card
  const lastPlayedItem = getRecentlyUsedItems(snapshot, 1).find(
    (item) => item.state.installed && item.catalog.itemType === "game"
  ) ?? null;
  const favoriteItem = personalization.favoriteItemId
    ? snapshot.items.find((item) => item.catalog.id === personalization.favoriteItemId) ?? null
    : null;
  const updateCount = libraryItems.filter((item) => item.state.updateAvailable).length;
  const pinnedItems = pinnedIds
    .map((id) => snapshot.items.find((item) => item.catalog.id === id))
    .filter(
      (item): item is ContentView => Boolean(item && item.state.installed && item.catalog.itemType === "game")
    );
  const installedSize = installedItems.reduce(
    (total, item) =>
      total + (item.installed?.sizeOnDiskBytes ?? item.manifest?.installSizeBytes ?? 0),
    0
  );

  const updateMessage =
    updateProgress.status !== "idle"
      ? describeLauncherUpdateProgress(updateProgress, t)
      : snapshot.launcherUpdate.updateAvailable
        ? t("home.updateCard.versionAvailable", {
            version: snapshot.launcherUpdate.latestVersion ?? ""
          })
        : t("home.updateCard.runningVersion", { version: snapshot.appVersion });
  const showInstallAction =
    updateProgress.status === "available" ||
    updateProgress.status === "restartRequired" ||
    snapshot.launcherUpdate.updateAvailable;
  const heroTitle = personalization.displayName
    ? t("home.hero.titlePersonalized", { name: personalization.displayName })
    : t("home.hero.title");

  const togglePinItem = (itemId: string) => {
    const isPinned = pinnedIds.includes(itemId);
    const next = isPinned
      ? pinnedIds.filter((id) => id !== itemId)
      : [itemId, ...pinnedIds].slice(0, MAX_PINNED_GAMES);
    setPinnedIds(next);
    savePinnedGameIds(activeProfileId, next);
  };

  return (
    <div className="view-stack">
      <section className="home-dashboard">
        <div className="home-dashboard__copy">
          <p className="eyebrow">{t("home.hero.eyebrow")}</p>
          <h2>{heroTitle}</h2>
          <p>{t("home.hero.body")}</p>
          <div className="hero-actions">
            <button
              className="button button--primary"
              onClick={() => setRoute("library")}
              type="button"
            >
              {t("common.actions.openLibrary")}
            </button>
            <button
              className="button button--ghost"
              onClick={() => setRoute("shop")}
              type="button"
            >
              {t("common.actions.browseShop")}
            </button>
            <button
              className="button button--ghost"
              onClick={() => setRoute("downloads")}
              type="button"
            >
              {t("common.actions.viewDownloads")}
            </button>
          </div>
          <div className="persona-summary">
            <div className="persona-summary__header">
              <LauncherAvatar avatarId={personalization.avatarId} size="md" />
              <div>
                <span>{t("home.hero.profileLabel")}</span>
                <strong>{t(`settings.personalization.themes.${personalization.themeId}.name`)}</strong>
              </div>
            </div>
            <p>{t("home.hero.profileBody")}</p>
            {favoriteItem && (
              <button
                className="persona-summary__favorite"
                onClick={() => setRoute(`item:${favoriteItem.catalog.id}`)}
                type="button"
              >
                <strong>{t("home.hero.favoriteLabel")}</strong>
                <span>{favoriteItem.catalog.name}</span>
              </button>
            )}
          </div>
        </div>

        <div className="home-dashboard__update">
          <RefreshCw size={20} />
          <span>{t("home.updateCard.label")}</span>
          <strong>{updateMessage}</strong>
          <p>
            {t("home.updateCard.lastChecked", {
              date: formatDate(snapshot.launcherUpdate.checkedAt, locale, t)
            })}
          </p>
          <div className="home-dashboard__actions">
            <button
              className="text-button"
              disabled={
                busyAction === "check-launcher-update" ||
                busyAction === "install-launcher-update"
              }
              onClick={checkLauncherUpdates}
              type="button"
            >
              {busyAction === "check-launcher-update"
                ? t("common.actions.checkingShort")
                : t("common.actions.checkUpdates")}
            </button>
            {showInstallAction && (
              <button
                className="text-button"
                disabled={
                  busyAction === "check-launcher-update" ||
                  busyAction === "install-launcher-update"
                }
                onClick={installLauncherUpdate}
                type="button"
              >
                {busyAction === "install-launcher-update"
                  ? t("common.actions.installingShort")
                  : t("common.actions.installUpdate")}
              </button>
            )}
          </div>
        </div>
      </section>

      {lastPlayedItem && (
        <ContinuePlayingCard
          item={lastPlayedItem}
          onPlay={() => void launchItem(lastPlayedItem.catalog.id)}
          onOpen={() => setRoute(`item:${lastPlayedItem.catalog.id}`)}
          isPinned={pinnedIds.includes(lastPlayedItem.catalog.id)}
          onTogglePin={() => togglePinItem(lastPlayedItem.catalog.id)}
          t={t}
          locale={locale}
        />
      )}

      {pinnedItems.length > 0 && (
        <section className="pinned-row">
          <div className="section-toolbar section-toolbar--compact">
            <div>
              <p className="eyebrow">{t("home.pinned.eyebrow")}</p>
              <h2>{t("home.pinned.title")}</h2>
            </div>
          </div>
          <div className="pinned-row__grid">
            {pinnedItems.map((item) => (
              <article key={item.catalog.id} className="pinned-card">
                <div>
                  <strong>{item.catalog.name}</strong>
                  <p className="muted">{item.catalog.developer}</p>
                </div>
                <div className="pinned-card__actions">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => void launchItem(item.catalog.id)}
                  >
                    <Play size={14} />
                    {t("home.continuePlaying.play")}
                  </button>
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => setRoute(`item:${item.catalog.id}`)}
                  >
                    {t("home.continuePlaying.details")}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={t("home.pinned.unpin")}
                    onClick={() => togglePinItem(item.catalog.id)}
                  >
                    <PinOff size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-grid">
        <article className="metric-panel">
          <Library size={22} />
          <span>{t("home.metrics.collection")}</span>
          <strong>{libraryItems.length}</strong>
          <p>{t("home.metrics.collectionDescription", { count: installedItems.length })}</p>
        </article>
        <article className="metric-panel">
          <Download size={22} />
          <span>{t("home.metrics.downloads")}</span>
          <strong>{activeJobs.length}</strong>
          <p>{t("home.metrics.downloadsDescription", { count: activeJobs.length })}</p>
        </article>
        <article className="metric-panel">
          <HardDrive size={22} />
          <span>{t("home.metrics.diskUsage")}</span>
          <strong>{formatBytes(installedSize, locale)}</strong>
          <p>{t("home.metrics.diskDescription", { count: snapshot.config.libraries.length })}</p>
        </article>
        <article className="metric-panel">
          <Sparkles size={22} />
          <span>{t("home.metrics.updates")}</span>
          <strong>{updateCount}</strong>
          <p>{t("home.metrics.updatesDescription", { count: updateCount })}</p>
        </article>
      </section>

      <LauncherUpdatePanel progress={updateProgress} />

      {activeJobs.length > 0 && (
        <section className="queue-strip">
          <div>
            <p className="eyebrow">{t("home.activeTransfers.eyebrow")}</p>
            <h2>{t("home.activeTransfers.title")}</h2>
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
                <span>{jobProgressLabel(job, t)}</span>
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
              <p className="eyebrow">{t("home.recentActivity.eyebrow")}</p>
              <h2>{t("home.recentActivity.title")}</h2>
            </div>
            <button
              className="button button--ghost"
              onClick={() => setRoute("library")}
              type="button"
            >
              {t("common.actions.openCollection")}
            </button>
          </div>
          {recentActivity.length === 0 ? (
            <p className="muted">{t("home.recentActivity.empty")}</p>
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
                      {t(`home.recentActivity.${event.kind}`)} / {formatDate(event.at, locale, t)}
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
              <p className="eyebrow">{t("home.recentlyUsed.eyebrow")}</p>
              <h2>{t("home.recentlyUsed.title")}</h2>
            </div>
            <button
              className="button button--ghost"
              onClick={() => setRoute("library")}
              type="button"
            >
              {t("common.actions.viewLibrary")}
            </button>
          </div>
          {recentlyUsed.length === 0 ? (
            <p className="muted">{t("home.recentlyUsed.empty")}</p>
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
                    <small>
                      {t("home.recentlyUsed.used", {
                        date: formatDate(
                          item.collectionEntry?.lastUsedAt ?? item.installed?.lastLaunchedAt ?? null,
                          locale,
                          t
                        )
                      })}
                    </small>
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
              <p className="eyebrow">{t("home.recentInstalls.eyebrow")}</p>
              <h2>{t("home.recentInstalls.title")}</h2>
            </div>
            <button
              className="button button--ghost"
              onClick={() => setRoute("downloads")}
              type="button"
            >
              {t("common.actions.openDownloads")}
            </button>
          </div>
          {recentInstalls.length === 0 ? (
            <p className="muted">{t("home.recentInstalls.empty")}</p>
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
                    <small>
                      {t("home.recentInstalls.installed", {
                        date: formatDate(item.installed?.installedAt ?? null, locale, t)
                      })}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="activity-panel">
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">{t("home.nextSteps.eyebrow")}</p>
              <h2>{t("home.nextSteps.title")}</h2>
            </div>
          </div>
          <div className="home-action-list">
            <button className="home-action-card" onClick={() => setRoute("shop")} type="button">
              <strong>{t("home.nextSteps.discoverTitle")}</strong>
              <span>{t("home.nextSteps.discoverBody")}</span>
            </button>
            <button className="home-action-card" onClick={() => setRoute("library")} type="button">
              <strong>{t("home.nextSteps.manageTitle")}</strong>
              <span>{t("home.nextSteps.manageBody")}</span>
            </button>
            <button className="home-action-card" onClick={() => setRoute("settings")} type="button">
              <strong>{t("home.nextSteps.settingsTitle")}</strong>
              <span>{t("home.nextSteps.settingsBody")}</span>
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

function ItemThumb({ item, compact = false }: { item: ContentView; compact?: boolean }) {
  const iconImageSrc = resolveCatalogImageSrc(
    item.catalog.iconImage,
    item.manifest?.version ?? item.catalog.releaseDate
  );

  if (iconImageSrc) {
    return (
      <img
        className={compact ? "item-thumb item-thumb--compact" : "item-thumb"}
        src={iconImageSrc}
        alt=""
      />
    );
  }

  return (
    <div
      className={
        compact
          ? "item-thumb item-thumb--compact item-thumb--fallback"
          : "item-thumb item-thumb--fallback"
      }
    >
      <span>{item.catalog.name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function ContinuePlayingCard({
  item,
  onPlay,
  onOpen,
  onTogglePin,
  isPinned,
  t,
  locale
}: {
  item: ContentView;
  onPlay: () => void;
  onOpen: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string;
  locale: string;
}) {
  const bannerSrc = resolveCatalogImageSrc(
    item.catalog.bannerImage,
    item.manifest?.version ?? item.catalog.releaseDate
  );
  const lastUsed =
    item.collectionEntry?.lastUsedAt ?? item.installed?.lastLaunchedAt ?? null;
  const minutes = item.collectionEntry?.totalPlaytimeMinutes ?? 0;

  return (
    <section className="continue-card">
      {bannerSrc && <img src={bannerSrc} alt="" className="continue-card__bg" />}
      <div className="continue-card__overlay" />
      <div className="continue-card__content">
        <div>
          <p className="eyebrow">{t("home.continuePlaying.eyebrow")}</p>
          <div className="continue-card__title-row">
            <h2>{item.catalog.name}</h2>
            <button
              className="icon-button"
              type="button"
              onClick={onTogglePin}
              aria-label={isPinned ? t("home.pinned.unpin") : t("home.pinned.pin")}
            >
              <Pin size={14} />
            </button>
          </div>
          {lastUsed && (
            <p className="continue-card__meta">
              {t("home.continuePlaying.lastPlayed", {
                date: formatDate(lastUsed, locale, t)
              })}
              {minutes > 0 &&
                ` · ${t("home.continuePlaying.playtime", { hours: Math.round(minutes / 60 * 10) / 10 })}`}
            </p>
          )}
        </div>
        <div className="hero-actions">
          <button className="button button--primary" onClick={onPlay} type="button">
            <Play size={16} />
            {t("home.continuePlaying.play")}
          </button>
          <button className="button button--ghost" onClick={onOpen} type="button">
            {t("home.continuePlaying.details")}
          </button>
        </div>
      </div>
    </section>
  );
}

function loadPinnedGameIds(activeProfileId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const scoped = getProfileScopedStorageKey(PINNED_GAMES_STORAGE_KEY, activeProfileId);
    const raw = window.localStorage.getItem(scoped) ?? window.localStorage.getItem(PINNED_GAMES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_PINNED_GAMES);
  } catch {
    return [];
  }
}

function savePinnedGameIds(activeProfileId: string, ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(getProfileScopedStorageKey(PINNED_GAMES_STORAGE_KEY, activeProfileId), JSON.stringify(ids));
}

