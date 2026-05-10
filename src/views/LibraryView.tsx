import { FolderOpen, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { GameCard } from "../components/GameCard";
import { InstallDialog } from "../components/InstallDialog";
import { formatDate, resolveIntlLocale } from "../domain/format";
import { createLibraryGroup, loadLibraryGroups, saveLibraryGroups, type LibraryGroup } from "../domain/libraryGroups";
import { getProfileScopedStorageKey } from "../domain/profileStorage";
import { getGameStatus, getLibraryItems } from "../domain/selectors";
import { getTagLabel, sortTagsByWeight } from "../domain/tags";
import type { CatalogItemType, ContentView } from "../domain/types";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

type LibrarySortKey = "name" | "lastPlayed" | "installed" | "recentlyAdded" | "playtime";
type InstallFilter = "all" | "installed" | "notInstalled";
type UpdateFilter = "all" | "updates";
type TypeFilter = "all" | CatalogItemType;
type DisplayMode = "grid" | "compact";

interface LibraryPreferences {
  search: string;
  sortBy: LibrarySortKey;
  installFilter: InstallFilter;
  updateFilter: UpdateFilter;
  typeFilter: TypeFilter;
  category: string;
  tag: string;
  displayMode: DisplayMode;
}

const LIBRARY_PREFERENCES_KEY = "lumorix.library.preferences";
const DEFAULT_PREFERENCES: LibraryPreferences = {
  search: "",
  sortBy: "installed",
  installFilter: "all",
  updateFilter: "all",
  typeFilter: "all",
  category: "all",
  tag: "all",
  displayMode: "grid"
};

export function LibraryView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { locale, t } = useI18n();
  const intlLocale = resolveIntlLocale(locale);
  const {
    snapshot,
    activeProfileId,
    installItem,
    launchItem,
    closeItem,
    updateItem,
    repairItem,
    uninstallItem,
    removeItemFromLibrary
  } = useLauncher();
  const [preferences, setPreferences] = useState<LibraryPreferences>(() => loadLibraryPreferences(activeProfileId));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [installTarget, setInstallTarget] = useState<ContentView | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ContentView | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<ContentView | null>(null);
  const [groups, setGroups] = useState<LibraryGroup[]>(() => loadLibraryGroups(activeProfileId));
  const [showGroups, setShowGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const persistGroups = (next: LibraryGroup[]) => {
    setGroups(next);
    saveLibraryGroups(next, activeProfileId);
  };

  useEffect(() => {
    window.localStorage.setItem(
      getProfileScopedStorageKey(LIBRARY_PREFERENCES_KEY, activeProfileId),
      JSON.stringify(preferences)
    );
  }, [activeProfileId, preferences]);

  useEffect(() => {
    setPreferences(loadLibraryPreferences(activeProfileId));
    setGroups(loadLibraryGroups(activeProfileId));
  }, [activeProfileId]);

  const handleInstall = async (item: ContentView) => {
    if (!snapshot) return;

    const { askForLibraryEachInstall } = snapshot.config.installBehavior;
    const defaultLibraryId = snapshot.config.defaultLibraryId;

    if (askForLibraryEachInstall || !defaultLibraryId) {
      setInstallTarget(item);
      return;
    }

    await installItem(item.catalog.id, defaultLibraryId);
  };

  const collator = useMemo(
    () => new Intl.Collator(intlLocale, { sensitivity: "base" }),
    [intlLocale]
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
    const normalizedSearch = preferences.search.trim().toLocaleLowerCase(intlLocale);

    return [...libraryItems]
      .filter((item) => {
        const status = getGameStatus(item);
        if (preferences.installFilter === "installed" && status === "notInstalled") return false;
        if (preferences.installFilter === "notInstalled" && status !== "notInstalled") return false;
        if (preferences.updateFilter === "updates" && status !== "updateAvailable") return false;
        if (preferences.typeFilter !== "all" && item.catalog.itemType !== preferences.typeFilter) {
          return false;
        }
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
          .toLocaleLowerCase(intlLocale);

        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => compareLibraryItems(left, right, preferences.sortBy, collator));
  }, [collator, intlLocale, libraryItems, preferences, snapshot, t]);

  const installedCount = libraryItems.filter((item) => getGameStatus(item) !== "notInstalled").length;
  const updatesCount = libraryItems.filter((item) => getGameStatus(item) === "updateAvailable").length;
  const readyToInstallCount = libraryItems.filter((item) => getGameStatus(item) === "notInstalled").length;
  const hasActiveFilters =
    preferences.search.length > 0 ||
    preferences.installFilter !== "all" ||
    preferences.updateFilter !== "all" ||
    preferences.typeFilter !== "all" ||
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
                <option value="playtime">{t("library.sort.playtime")}</option>
              </select>
            </label>

            <label>
              <span>{t("library.filters.type")}</span>
              <select
                value={preferences.typeFilter}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    typeFilter: event.target.value as TypeFilter
                  }))
                }
              >
                <option value="all">{t("library.filters.allTypes")}</option>
                <option value="game">{t("status.itemType.game")}</option>
                <option value="tool">{t("status.itemType.tool")}</option>
                <option value="project">{t("status.itemType.project")}</option>
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
          </div>

          {showAdvancedFilters ? (
            <div className="library-toolbar__grid library-toolbar__grid--advanced">
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
          ) : null}

          <div className="library-toolbar__active-filters">
            <span>
              <SlidersHorizontal size={14} />
              {t("library.toolbar.results", { count: items.length })}
            </span>
            <div className="library-toolbar__actions">
              <div className="library-display-mode toolbar-chip-group" role="radiogroup" aria-label={t("library.toolbar.viewMode")}>
                <button
                  className={`toolbar-chip ${preferences.displayMode === "grid" ? "is-active" : ""}`}
                  onClick={() =>
                    setPreferences((current) => ({ ...current, displayMode: "grid" }))
                  }
                  type="button"
                  role="radio"
                  aria-checked={preferences.displayMode === "grid"}
                >
                  {t("library.toolbar.viewGrid")}
                </button>
                <button
                  className={`toolbar-chip ${preferences.displayMode === "compact" ? "is-active" : ""}`}
                  onClick={() =>
                    setPreferences((current) => ({ ...current, displayMode: "compact" }))
                  }
                  type="button"
                  role="radio"
                  aria-checked={preferences.displayMode === "compact"}
                >
                  {t("library.toolbar.viewCompact")}
                </button>
              </div>
              <button
                className={`toolbar-chip ${showAdvancedFilters ? "is-active" : ""}`}
                onClick={() => setShowAdvancedFilters((current) => !current)}
                type="button"
              >
                {showAdvancedFilters ? "Weniger Filter" : "Mehr Filter"}
              </button>
              <button
                className={`toolbar-chip ${showGroups ? "is-active" : ""}`}
                onClick={() => setShowGroups((v) => !v)}
                type="button"
              >
                <FolderOpen size={14} />
                {t("library.groups.toggleBtn")}
              </button>
              {hasActiveFilters ? (
                <button
                  className="toolbar-chip"
                  onClick={() => setPreferences((current) => ({ ...DEFAULT_PREFERENCES, sortBy: current.sortBy }))}
                  type="button"
                >
                  {t("common.actions.clearFilters")}
                </button>
              ) : null}
            </div>
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
        <section
          className={`library-grid ${
            preferences.displayMode === "compact" ? "library-grid--compact" : ""
          }`}
        >
          {items.map((item) => (
            <GameCard
              key={item.catalog.id}
              item={item}
              canMoveInstall={snapshot.config.libraries.some(
                (library) =>
                  library.status === "available" && library.id !== item.installed?.libraryId
              )}
              onOpen={() => setRoute(`item:${item.catalog.id}`)}
              onInstall={() => {
                void handleInstall(item);
              }}
              onLaunch={() => launchItem(item.catalog.id)}
              onClose={() => closeItem(item.catalog.id)}
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

      {showGroups && (
        <section className="library-groups-panel">
          <div className="section-toolbar">
            <h3>{t("library.groups.panelTitle")}</h3>
          </div>
          <div className="library-groups-create">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t("library.groups.newGroupPlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newGroupName.trim()) {
                  persistGroups([...groups, createLibraryGroup(newGroupName)]);
                  setNewGroupName("");
                }
              }}
            />
            <button
              className="button button--primary"
              onClick={() => {
                if (!newGroupName.trim()) return;
                persistGroups([...groups, createLibraryGroup(newGroupName)]);
                setNewGroupName("");
              }}
              type="button"
            >
              <Plus size={14} />
              {t("library.groups.create")}
            </button>
          </div>
          {groups.map((group) => {
            const groupItems = items.filter((item) => group.itemIds.includes(item.catalog.id));
            const availableToAdd = items.filter((item) => !group.itemIds.includes(item.catalog.id));
            return (
              <div key={group.id} className="library-group">
                <div className="library-group__header">
                  <span className="library-group__dot" style={{ background: group.color }} />
                  <strong>{group.name}</strong>
                  <span className="muted">{groupItems.length}</span>
                  <button
                    className="icon-button"
                    onClick={() => persistGroups(groups.filter((g) => g.id !== group.id))}
                    type="button"
                    aria-label={t("library.groups.delete")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="library-group__chips">
                  {groupItems.map((item) => (
                    <span key={item.catalog.id} className="library-group-chip">
                      {item.catalog.name}
                      <button
                        type="button"
                        onClick={() => {
                          persistGroups(groups.map((g) =>
                            g.id === group.id
                              ? { ...g, itemIds: g.itemIds.filter((id) => id !== item.catalog.id) }
                              : g
                          ));
                        }}
                        aria-label="Remove"
                      >x</button>
                    </span>
                  ))}
                  {availableToAdd.length > 0 && (
                    <select
                      className="library-group-chip library-group-chip--add"
                      value=""
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        persistGroups(groups.map((g) =>
                          g.id === group.id ? { ...g, itemIds: [...g.itemIds, id] } : g
                        ));
                      }}
                    >
                      <option value="">{t("library.groups.addItem")}</option>
                      {availableToAdd.map((item) => (
                        <option key={item.catalog.id} value={item.catalog.id}>
                          {item.catalog.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
          {groups.length === 0 && (
            <p className="muted">{t("library.groups.empty")}</p>
          )}
        </section>
      )}
    </div>
  );
}

function loadLibraryPreferences(activeProfileId: string): LibraryPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  const saved =
    window.localStorage.getItem(getProfileScopedStorageKey(LIBRARY_PREFERENCES_KEY, activeProfileId)) ??
    window.localStorage.getItem(LIBRARY_PREFERENCES_KEY);
  if (!saved) return DEFAULT_PREFERENCES;

  try {
    const parsed = JSON.parse(saved) as Partial<LibraryPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      displayMode: parsed.displayMode === "compact" ? "compact" : "grid"
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

  if (sortBy === "playtime") {
    return (
      (right.collectionEntry?.totalPlaytimeMinutes ?? 0) -
        (left.collectionEntry?.totalPlaytimeMinutes ?? 0) ||
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
  const status = getGameStatus(item);
  if (status === "updateAvailable") return 0;
  if (status === "installed") return 1;
  if (status === "broken") return 2;
  return 3;
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  return new Date(value).getTime();
}
