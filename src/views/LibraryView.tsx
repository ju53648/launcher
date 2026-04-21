import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { GameCard } from "../components/GameCard";
import { InstallDialog } from "../components/InstallDialog";
import { formatDate, resolveIntlLocale } from "../domain/format";
import { getLibraryItems } from "../domain/selectors";
import { getTagLabel, sortTagsByWeight } from "../domain/tags";
import type { ContentView } from "../domain/types";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

type LibrarySortKey = "name" | "lastPlayed" | "installed" | "recentlyAdded";
type InstallFilter = "all" | "installed" | "notInstalled";
type UpdateFilter = "all" | "updates";

interface LibraryPreferences {
  search: string;
  sortBy: LibrarySortKey;
  installFilter: InstallFilter;
  updateFilter: UpdateFilter;
  category: string;
  tag: string;
}

const LIBRARY_PREFERENCES_KEY = "lumorix.library.preferences";
const DEFAULT_PREFERENCES: LibraryPreferences = {
  search: "",
  sortBy: "installed",
  installFilter: "all",
  updateFilter: "all",
  category: "all",
  tag: "all"
};

export function LibraryView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { locale, t } = useI18n();
  const {
    snapshot,
    installItem,
    launchItem,
    updateItem,
    repairItem,
    uninstallItem,
    removeItemFromLibrary
  } = useLauncher();
  const [preferences, setPreferences] = useState<LibraryPreferences>(() => loadLibraryPreferences());
  const [installTarget, setInstallTarget] = useState<ContentView | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ContentView | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<ContentView | null>(null);

  useEffect(() => {
    window.localStorage.setItem(LIBRARY_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const collator = useMemo(
    () => new Intl.Collator(resolveIntlLocale(locale), { sensitivity: "base" }),
    [locale]
  );

  const libraryItems = useMemo(() => (snapshot ? getLibraryItems(snapshot) : []), [snapshot]);

  const categories = useMemo(
    () =>
      Array.from(new Set(libraryItems.flatMap((item) => item.catalog.categories).filter(Boolean))).sort(
        (left, right) => collator.compare(left, right)
      ),
    [collator, libraryItems]
  );

  const tags = useMemo(
    () =>
      Array.from(new Set(libraryItems.flatMap((item) => sortTagsByWeight(item.catalog.tags).map((tag) => tag.id))))
        .map((tagId) => ({ id: tagId, label: getTagLabel(tagId, t) }))
        .sort((left, right) => collator.compare(left.label, right.label)),
    [collator, libraryItems, t]
  );

  const items = useMemo(() => {
    if (!snapshot) return [];
    const normalizedSearch = preferences.search.trim().toLocaleLowerCase(locale);

    return [...libraryItems]
      .filter((item) => {
        if (preferences.installFilter === "installed" && !item.installed) return false;
        if (preferences.installFilter === "notInstalled" && item.installed) return false;
        if (preferences.updateFilter === "updates" && !item.availableUpdate) return false;
        if (
          preferences.category !== "all" &&
          !item.catalog.categories.includes(preferences.category)
        ) {
          return false;
        }
        if (preferences.tag !== "all" && !item.catalog.tags.some((tag) => tag.id === preferences.tag)) {
          return false;
        }
        if (!normalizedSearch) return true;

        const haystack = [
          item.catalog.name,
          item.catalog.developer,
          item.catalog.description,
          ...item.catalog.categories,
          ...item.catalog.tags.map((tag) => getTagLabel(tag.id, t))
        ]
          .join(" ")
          .toLocaleLowerCase(locale);

        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => compareLibraryItems(left, right, preferences.sortBy, collator));
  }, [collator, libraryItems, locale, preferences, snapshot, t]);

  const installedCount = libraryItems.filter((item) => item.installed).length;
  const updatesCount = libraryItems.filter((item) => item.availableUpdate).length;
  const readyToInstallCount = libraryItems.filter((item) => !item.installed).length;
  const hasActiveFilters =
    preferences.search.length > 0 ||
    preferences.installFilter !== "all" ||
    preferences.updateFilter !== "all" ||
    preferences.category !== "all" ||
    preferences.tag !== "all";

  if (!snapshot) return null;

  return (
    <div className="view-stack">
      <section className="library-toolbar">
        <div className="library-toolbar__intro">
          <div>
            <p className="eyebrow">{t("library.toolbar.eyebrow")}</p>
            <h2>{t("library.toolbar.title")}</h2>
            <p>{t("library.toolbar.body")}</p>
          </div>
          <div className="library-toolbar__stats">
            <div>
              <strong>{libraryItems.length}</strong>
              <span>{t("library.toolbar.stats.total")}</span>
            </div>
            <div>
              <strong>{installedCount}</strong>
              <span>{t("library.toolbar.stats.installed")}</span>
            </div>
            <div>
              <strong>{updatesCount}</strong>
              <span>{t("library.toolbar.stats.updates")}</span>
            </div>
            <div>
              <strong>{readyToInstallCount}</strong>
              <span>{t("library.toolbar.stats.ready")}</span>
            </div>
          </div>
        </div>

        <div className="library-toolbar__controls">
          <label className="library-search">
            <Search size={16} />
            <input
              value={preferences.search}
              onChange={(event) =>
                setPreferences((current) => ({ ...current, search: event.target.value }))
              }
              placeholder={t("library.filters.searchPlaceholder")}
              type="search"
            />
          </label>

          <div className="library-toolbar__grid">
            <label>
              <span>{t("library.sort.label")}</span>
              <select
                value={preferences.sortBy}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    sortBy: event.target.value as LibrarySortKey
                  }))
                }
              >
                <option value="name">{t("library.sort.name")}</option>
                <option value="lastPlayed">{t("library.sort.lastPlayed")}</option>
                <option value="installed">{t("library.sort.installed")}</option>
                <option value="recentlyAdded">{t("library.sort.recentlyAdded")}</option>
              </select>
            </label>

            <label>
              <span>{t("library.filters.installState")}</span>
              <select
                value={preferences.installFilter}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    installFilter: event.target.value as InstallFilter
                  }))
                }
              >
                <option value="all">{t("library.filters.installAll")}</option>
                <option value="installed">{t("library.filters.installInstalled")}</option>
                <option value="notInstalled">{t("library.filters.installNotInstalled")}</option>
              </select>
            </label>

            <label>
              <span>{t("library.filters.updates")}</span>
              <select
                value={preferences.updateFilter}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    updateFilter: event.target.value as UpdateFilter
                  }))
                }
              >
                <option value="all">{t("library.filters.updatesAll")}</option>
                <option value="updates">{t("library.filters.updatesOnly")}</option>
              </select>
            </label>

            <label>
              <span>{t("library.filters.category")}</span>
              <select
                value={preferences.category}
                onChange={(event) =>
                  setPreferences((current) => ({ ...current, category: event.target.value }))
                }
              >
                <option value="all">{t("library.filters.allCategories")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t("library.filters.tag")}</span>
              <select
                value={preferences.tag}
                onChange={(event) =>
                  setPreferences((current) => ({ ...current, tag: event.target.value }))
                }
              >
                <option value="all">{t("library.filters.allTags")}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="library-toolbar__active-filters">
            <span>
              <SlidersHorizontal size={14} />
              {t("library.toolbar.results", { count: items.length })}
            </span>
            {hasActiveFilters ? (
              <button
                className="text-button"
                onClick={() => setPreferences((current) => ({ ...DEFAULT_PREFERENCES, sortBy: current.sortBy }))}
                type="button"
              >
                {t("common.actions.clearFilters")}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <EmptyState
          title={
            libraryItems.length === 0
              ? t("library.emptyState.emptyTitle")
              : t("library.emptyState.filteredTitle")
          }
          body={
            libraryItems.length === 0
              ? t("library.emptyState.emptyBody")
              : t("library.emptyState.filteredBody")
          }
          action={
            <div className="empty-state__actions">
              {libraryItems.length > 0 && hasActiveFilters ? (
                <button
                  className="button button--ghost"
                  onClick={() =>
                    setPreferences((current) => ({ ...DEFAULT_PREFERENCES, sortBy: current.sortBy }))
                  }
                  type="button"
                >
                  {t("common.actions.clearFilters")}
                </button>
              ) : null}
              <button className="button button--primary" onClick={() => setRoute("shop")} type="button">
                {t("common.actions.openShop")}
              </button>
            </div>
          }
        />
      ) : (
        <section className="library-grid">
          {items.map((item) => (
            <GameCard
              key={item.catalog.id}
              item={item}
              onOpen={() => setRoute(`item:${item.catalog.id}`)}
              onInstall={() => setInstallTarget(item)}
              onLaunch={() => launchItem(item.catalog.id)}
              onUpdate={() => updateItem(item.catalog.id)}
              onRepair={() => repairItem(item.catalog.id)}
              onUninstall={() => setUninstallTarget(item)}
              onRemove={() => setRemoveTarget(item)}
            />
          ))}
        </section>
      )}

      {installTarget && (
        <InstallDialog
          item={installTarget}
          libraries={snapshot.config.libraries}
          defaultLibraryId={snapshot.config.defaultLibraryId}
          onClose={() => setInstallTarget(null)}
          onInstall={async (libraryId) => {
            await installItem(installTarget.catalog.id, libraryId);
          }}
        />
      )}

      {removeTarget && (
        <ConfirmDialog
          title={t("library.removeDialog.title", { name: removeTarget.catalog.name })}
          body={t("library.removeDialog.body", { name: removeTarget.catalog.name })}
          confirmLabel={t("common.actions.removeFromLibrary")}
          details={[
            t("library.removeDialog.keepInstalledFiles"),
            t("library.removeDialog.addedAt", {
              date: formatDate(removeTarget.collectionEntry?.addedAt ?? null, locale, t)
            })
          ]}
          onClose={() => setRemoveTarget(null)}
          onConfirm={async () => {
            await removeItemFromLibrary(removeTarget.catalog.id);
          }}
        />
      )}

      {uninstallTarget && (
        <ConfirmDialog
          title={t("library.uninstallDialog.title", { name: uninstallTarget.catalog.name })}
          body={t("library.uninstallDialog.body", { name: uninstallTarget.catalog.name })}
          confirmLabel={t("common.actions.uninstall")}
          details={[
            t("library.uninstallDialog.removeFiles"),
            t("library.uninstallDialog.keepLibraryEntry")
          ]}
          onClose={() => setUninstallTarget(null)}
          onConfirm={async () => {
            await uninstallItem(uninstallTarget.catalog.id);
          }}
        />
      )}
    </div>
  );
}

function loadLibraryPreferences(): LibraryPreferences {
  const saved = window.localStorage.getItem(LIBRARY_PREFERENCES_KEY);
  if (!saved) return DEFAULT_PREFERENCES;

  try {
    const parsed = JSON.parse(saved) as Partial<LibraryPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function compareLibraryItems(
  left: ContentView,
  right: ContentView,
  sortBy: LibrarySortKey,
  collator: Intl.Collator
) {
  if (sortBy === "name") {
    return collator.compare(left.catalog.name, right.catalog.name);
  }

  if (sortBy === "lastPlayed") {
    return (
      toTime(right.collectionEntry?.lastUsedAt ?? right.installed?.lastLaunchedAt ?? null) -
        toTime(left.collectionEntry?.lastUsedAt ?? left.installed?.lastLaunchedAt ?? null) ||
      collator.compare(left.catalog.name, right.catalog.name)
    );
  }

  if (sortBy === "recentlyAdded") {
    return (
      toTime(right.collectionEntry?.addedAt ?? null) - toTime(left.collectionEntry?.addedAt ?? null) ||
      collator.compare(left.catalog.name, right.catalog.name)
    );
  }

  return (
    installedRank(left) - installedRank(right) ||
    toTime(right.collectionEntry?.lastUsedAt ?? right.installed?.lastLaunchedAt ?? null) -
      toTime(left.collectionEntry?.lastUsedAt ?? left.installed?.lastLaunchedAt ?? null) ||
    collator.compare(left.catalog.name, right.catalog.name)
  );
}

function installedRank(item: ContentView) {
  if (item.availableUpdate) return 0;
  if (item.installed) return 1;
  return 2;
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  return new Date(value).getTime();
}
