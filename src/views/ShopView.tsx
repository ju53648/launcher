import { ArrowRight, Check, Download, Play, Plus, Search, Sparkles } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, itemTypeLabel, resolveIntlLocale } from "../domain/format";
import { resolveCatalogImageSrc } from "../domain/media";
import {
  getDiscoverableItems,
  getGameStatus,
  getShopCategories
} from "../domain/selectors";
import { getTagLabel, sortTagsByWeight } from "../domain/tags";
import type { CatalogItemType, ContentView } from "../domain/types";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

type TypeFilter = "all" | CatalogItemType;
type ShopStatusFilter = "all" | "notAdded" | "inLibrary" | "installed" | "updates";
type ShopSortKey = "relevance" | "name" | "releaseDate" | "installSize" | "status";

export function ShopView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { locale, t } = useI18n();
  const intlLocale = resolveIntlLocale(locale);
  const { snapshot, addItemToLibrary, busyAction, installItem, launchItem, closeItem } = useLauncher();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ShopStatusFilter>("all");
  const [sortBy, setSortBy] = useState<ShopSortKey>("relevance");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  if (!snapshot) return null;

  const discoverableItems = getDiscoverableItems(snapshot);
  const featuredItem = selectFeaturedItem(discoverableItems);
  const categories = getShopCategories(snapshot);
  const tags = useMemo(
    () =>
      Array.from(
        new Set(discoverableItems.flatMap((item) => sortTagsByWeight(item.catalog.tags).map((tag) => tag.id)))
      )
        .map((tagId) => ({ id: tagId, label: getTagLabel(tagId, t) }))
        .sort((left, right) => left.label.localeCompare(right.label, intlLocale)),
    [discoverableItems, intlLocale, t]
  );

  const filteredItems = useMemo(() => {
    const collator = new Intl.Collator(intlLocale, { sensitivity: "base" });
    return discoverableItems
      .filter((item) => {
        if (typeFilter !== "all" && item.catalog.itemType !== typeFilter) return false;
        if (categoryFilter !== "all" && !item.catalog.categories.includes(categoryFilter)) return false;
        if (tagFilter !== "all" && !item.catalog.tags.some((tag) => tag.id === tagFilter)) return false;
        if (statusFilter === "notAdded" && item.state.added) return false;
        if (statusFilter === "inLibrary" && !item.state.added) return false;

        const status = getGameStatus(item);
        if (statusFilter === "installed" && status === "notInstalled") return false;
        if (statusFilter === "updates" && status !== "updateAvailable") return false;

        if (!deferredSearch) return true;

        const haystack = [
          item.catalog.name,
          item.catalog.developer,
          item.catalog.description,
          ...item.catalog.categories,
          ...item.catalog.tags.map((tag) => getTagLabel(tag.id, t))
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(deferredSearch);
      })
      .sort((left, right) => compareShopItems(left, right, sortBy, deferredSearch, collator, t));
  }, [categoryFilter, deferredSearch, discoverableItems, intlLocale, sortBy, statusFilter, t, tagFilter, typeFilter]);

  const hasSparseCatalog = discoverableItems.length <= 2;
  const hasActiveFilters =
    deferredSearch.length > 0 ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    tagFilter !== "all";

  return (
    <div className="view-stack">
      <section className="shop-intro">
        <div>
          <p className="eyebrow">{t("shop.intro.eyebrow")}</p>
          <h2>{t("shop.intro.title")}</h2>
          <p>{t("shop.intro.body")}</p>
        </div>
        <div className="shop-intro__stat">
          <Sparkles size={20} />
          <strong>{discoverableItems.length}</strong>
          <span>{t("shop.discoverableCount", { count: discoverableItems.length })}</span>
        </div>
      </section>

      {!hasActiveFilters && featuredItem && (
        <FeaturedShopCard
          item={featuredItem}
          busy={Boolean(busyAction)}
          onOpen={() => setRoute(`item:${featuredItem.catalog.id}`)}
          onInstall={async () => {
            if (!featuredItem.state.added) {
              await addItemToLibrary(featuredItem.catalog.id);
            }

            const defaultLibraryId = snapshot.config.defaultLibraryId;
            if (!defaultLibraryId) {
              setRoute(`item:${featuredItem.catalog.id}`);
              return;
            }

            await installItem(featuredItem.catalog.id, defaultLibraryId);
          }}
          onPlay={async () => {
            if (featuredItem.isRunning) {
              await closeItem(featuredItem.catalog.id);
              return;
            }
            await launchItem(featuredItem.catalog.id);
          }}
        />
      )}

      <section className="shop-filters">
        <label className="shop-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("shop.filters.searchPlaceholder")}
          />
        </label>

        <div className="shop-controls-grid">
          <label>
            <span>{t("shop.sort.label")}</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as ShopSortKey)}>
              <option value="relevance">{t("shop.sort.relevance")}</option>
              <option value="name">{t("shop.sort.name")}</option>
              <option value="releaseDate">{t("shop.sort.releaseDate")}</option>
              <option value="installSize">{t("shop.sort.installSize")}</option>
              <option value="status">{t("shop.sort.status")}</option>
            </select>
          </label>

          <label>
            <span>{t("shop.filters.allTypes")}</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
              <option value="all">{t("shop.filters.allTypes")}</option>
              <option value="game">{t("status.itemType.game")}</option>
              <option value="tool">{t("status.itemType.tool")}</option>
              <option value="project">{t("status.itemType.project")}</option>
            </select>
          </label>

          <label>
            <span>{t("shop.filters.status")}</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ShopStatusFilter)}>
              <option value="all">{t("shop.filters.statusAll")}</option>
              <option value="notAdded">{t("shop.filters.statusNotAdded")}</option>
              <option value="inLibrary">{t("shop.filters.statusInLibrary")}</option>
              <option value="installed">{t("shop.filters.statusInstalled")}</option>
              <option value="updates">{t("shop.filters.statusUpdates")}</option>
            </select>
          </label>

          <label>
            <span>{t("shop.filters.categories")}</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">{t("shop.filters.all")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("shop.filters.tags")}</span>
            <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
              <option value="all">{t("shop.filters.all")}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="library-toolbar__active-filters">
          <span>{t("shop.results.shown", { count: filteredItems.length })}</span>
          {hasActiveFilters ? (
            <button
              className="text-button"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setStatusFilter("all");
                setCategoryFilter("all");
                setTagFilter("all");
              }}
              type="button"
            >
              {t("common.actions.clearFilters")}
            </button>
          ) : null}
        </div>
      </section>

      {discoverableItems.length === 0 ? (
        <EmptyState
          title={t("shop.emptyState.emptyTitle")}
          body={t("shop.emptyState.emptyBody")}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={t("shop.emptyState.filteredTitle")}
          body={t("shop.emptyState.filteredBody")}
        />
      ) : (
        <>
          <div className="section-toolbar section-toolbar--compact">
            <div>
              <p className="eyebrow">{t("shop.results.eyebrow")}</p>
              <h2>{t("shop.results.shown", { count: filteredItems.length })}</h2>
            </div>
          </div>
          <section className="shop-grid">
            {filteredItems.map((item) => (
              <ShopCard
                key={item.catalog.id}
                item={item}
                busy={busyAction === "add-item-to-library"}
                onAdd={() => addItemToLibrary(item.catalog.id)}
                onOpen={() => setRoute(`item:${item.catalog.id}`)}
                onLibrary={() => setRoute("library")}
                onDownloads={() => setRoute("downloads")}
                locale={locale}
              />
            ))}
          </section>

          {hasSparseCatalog && (
            <section className="shop-sparse-state">
              <p className="eyebrow">{t("shop.sparseState.eyebrow")}</p>
              <h3>{t("shop.sparseState.title")}</h3>
              <p>{t("shop.sparseState.body")}</p>
              <div className="shop-sparse-state__actions">
                <button className="button button--secondary" onClick={() => setRoute("library")} type="button">
                  {t("common.actions.viewLibrary")}
                </button>
                {featuredItem && (
                  <button className="button button--ghost" onClick={() => setRoute(`item:${featuredItem.catalog.id}`)} type="button">
                    {t("common.actions.details")}
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function compareShopItems(
  left: ContentView,
  right: ContentView,
  sortBy: ShopSortKey,
  search: string,
  collator: Intl.Collator,
  t: ReturnType<typeof useI18n>["t"]
) {
  if (sortBy === "name") {
    return collator.compare(left.catalog.name, right.catalog.name);
  }

  if (sortBy === "releaseDate") {
    return (
      toDateScore(right.catalog.releaseDate) - toDateScore(left.catalog.releaseDate) ||
      collator.compare(left.catalog.name, right.catalog.name)
    );
  }

  if (sortBy === "installSize") {
    return (
      (right.manifest?.installSizeBytes ?? 0) - (left.manifest?.installSizeBytes ?? 0) ||
      collator.compare(left.catalog.name, right.catalog.name)
    );
  }

  if (sortBy === "status") {
    return shopStatusRank(left) - shopStatusRank(right) || collator.compare(left.catalog.name, right.catalog.name);
  }

  return (
    relevanceScore(right, search, t) - relevanceScore(left, search, t) ||
    collator.compare(left.catalog.name, right.catalog.name)
  );
}

function shopStatusRank(item: ContentView) {
  const status = getGameStatus(item);
  if (status === "updateAvailable") return 0;
  if (status === "installed") return 1;
  if (item.state.added) return 2;
  return 3;
}

function toDateScore(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function relevanceScore(item: ContentView, search: string, t: ReturnType<typeof useI18n>["t"]) {
  if (!search) return 0;

  let score = 0;
  const name = item.catalog.name.toLowerCase();
  const developer = item.catalog.developer.toLowerCase();
  const categories = item.catalog.categories.map((entry) => entry.toLowerCase());
  const tags = item.catalog.tags.map((tag) => getTagLabel(tag.id, t).toLowerCase());
  const description = item.catalog.description.toLowerCase();

  if (name === search) score += 120;
  else if (name.startsWith(search)) score += 80;
  else if (name.includes(search)) score += 50;

  if (developer.includes(search)) score += 20;
  if (categories.some((entry) => entry.includes(search))) score += 16;
  if (tags.some((entry) => entry.includes(search))) score += 16;
  if (description.includes(search)) score += 8;
  if (item.state.added) score += 3;

  return score;
}

function FeaturedShopCard({
  item,
  busy,
  onOpen,
  onInstall,
  onPlay
}: {
  item: ContentView;
  busy: boolean;
  onOpen: () => void;
  onInstall: () => Promise<void>;
  onPlay: () => Promise<void>;
}) {
  const { t } = useI18n();
  const gameStatus = getGameStatus(item);
  const isInstalled = gameStatus === "installed" || gameStatus === "updateAvailable";
  const actionBusy = busy;
  const bannerImageSrc = resolveCatalogImageSrc(
    item.catalog.bannerImage,
    item.manifest?.version ?? item.catalog.releaseDate
  );
  const coverImageSrc = resolveCatalogImageSrc(
    item.catalog.coverImage,
    item.manifest?.version ?? item.catalog.releaseDate
  );

  return (
    <section className="shop-featured">
      <div className="shop-featured__media" aria-hidden>
        {bannerImageSrc ? (
          <img src={bannerImageSrc} alt="" />
        ) : coverImageSrc ? (
          <img src={coverImageSrc} alt="" />
        ) : (
          <div className="media-placeholder media-placeholder--hero" />
        )}
      </div>
      <div className="shop-featured__content">
        <p className="eyebrow">{t("shop.featured.eyebrow")}</p>
        <h2>{item.catalog.name}</h2>
        <p>{item.catalog.description}</p>
        <div className="shop-featured__meta">
          <StatusBadge status={gameStatus} type="game" />
          <span>{item.catalog.developer}</span>
        </div>
        <div className="shop-featured__actions">
          {isInstalled ? (
            <button
              className={`button ${item.isRunning ? "button--danger" : "button--primary"}`}
              disabled={actionBusy}
              onClick={() => void onPlay()}
              type="button"
            >
              {item.isRunning ? (
                t("common.actions.closeGame")
              ) : (
                <>
                  <Play size={16} />
                  {t("common.actions.launch")}
                </>
              )}
            </button>
          ) : (
            <button className="button button--primary" disabled={actionBusy} onClick={() => void onInstall()} type="button">
              <Download size={16} />
              {t("common.actions.install")}
            </button>
          )}
          <button className="button button--ghost" onClick={onOpen} type="button">
            {t("common.actions.details")}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function ShopCard({
  item,
  busy,
  onAdd,
  onOpen,
  onLibrary,
  onDownloads,
  locale
}: {
  item: ContentView;
  busy: boolean;
  onAdd: () => void;
  onOpen: () => void;
  onLibrary: () => void;
  onDownloads: () => void;
  locale: string;
}) {
  const { t } = useI18n();
  const manifest = item.manifest;
  const gameStatus = getGameStatus(item);
  const coverImageSrc = resolveCatalogImageSrc(
    item.catalog.coverImage,
    manifest?.version ?? item.catalog.releaseDate
  );

  return (
    <article className="shop-card">
      <button className="shop-card__media" onClick={onOpen} type="button">
        {coverImageSrc ? (
          <img
            src={coverImageSrc}
            alt={t("accessibility.coverImage", { name: item.catalog.name })}
          />
        ) : (
          <div className="media-placeholder media-placeholder--card">
            <span>{item.catalog.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </button>
      <div className="shop-card__body">
        <div className="shop-card__heading">
          <div>
            <p>
              {item.catalog.developer} / {itemTypeLabel(item.catalog.itemType, t)}
            </p>
            <h3>{item.catalog.name}</h3>
          </div>
          <div className="shop-card__status">
            <StatusBadge status={gameStatus} type="game" />
          </div>
        </div>

        <p className="shop-card__description">{item.catalog.description}</p>

        <div className="shop-card__tags">
          {item.catalog.categories.slice(0, 2).map((category) => (
            <span key={category}>{category}</span>
          ))}
          {sortTagsByWeight(item.catalog.tags)
            .slice(0, 2)
            .map((tag) => (
              <span key={tag.id}>{getTagLabel(tag.id, t)}</span>
            ))}
        </div>

        <div className="shop-card__meta">
          <span>{manifest ? `v${manifest.version}` : t("shop.card.unavailable")}</span>
          <span>{formatBytes(manifest?.installSizeBytes ?? 0, locale)}</span>
        </div>

        <div className="shop-card__actions">
          {!item.state.added ? (
            <button className="button button--primary" disabled={busy} onClick={onAdd} type="button">
              <Plus size={16} />
              {busy ? t("common.actions.addingToLibrary") : t("common.actions.addToLibrary")}
            </button>
          ) : item.activeJob ? (
            <button className="button button--secondary" onClick={onDownloads} type="button">
              <Download size={16} />
              {t("common.actions.viewDownload")}
            </button>
          ) : (
            <button className="button button--secondary" onClick={onLibrary} type="button">
              <Check size={16} />
              {t("shop.card.viewInLibrary")}
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

function selectFeaturedItem(items: ContentView[]): ContentView | null {
  if (items.length === 0) return null;

  const dropDash = items.find((item) => item.catalog.id === "com.lumorix.dropdash");
  if (dropDash) return dropDash;

  const namedDropDash = items.find((item) => item.catalog.name.toLowerCase().includes("dropdash"));
  if (namedDropDash) return namedDropDash;

  return items[0];
}
