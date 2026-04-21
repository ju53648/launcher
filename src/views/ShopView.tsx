import { Check, Download, Filter, Plus, Search, Sparkles } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { RecommendationSection } from "../components/RecommendationSection";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, itemTypeLabel } from "../domain/format";
import {
  getBecauseYouPlayedRecommendations,
  getDiscoverableItems,
  getForYouRecommendations,
  getShopCategories,
  getShopTagGroups
} from "../domain/selectors";
import { getTagCategoryLabel, getTagLabel, sortTagsByWeight } from "../domain/tags";
import type { CatalogItemType, ContentView } from "../domain/types";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

type TypeFilter = "all" | CatalogItemType;

export function ShopView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { locale, t } = useI18n();
  const { snapshot, addItemToLibrary, busyAction } = useLauncher();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  if (!snapshot) return null;

  const typeFilters: Array<{ value: TypeFilter; label: string }> = [
    { value: "all", label: t("shop.filters.allTypes") },
    { value: "game", label: t("status.itemType.game") },
    { value: "tool", label: t("status.itemType.tool") },
    { value: "project", label: t("status.itemType.project") }
  ];

  const discoverableItems = getDiscoverableItems(snapshot);
  const categories = getShopCategories(snapshot);
  const tagGroups = getShopTagGroups(snapshot);
  const forYouRecommendations = getForYouRecommendations(snapshot, 3);
  const becausePlayed = getBecauseYouPlayedRecommendations(snapshot, 3);

  const filteredItems = useMemo(() => {
    return discoverableItems.filter((item) => {
      if (typeFilter !== "all" && item.catalog.itemType !== typeFilter) return false;
      if (categoryFilter !== "all" && !item.catalog.categories.includes(categoryFilter)) return false;
      if (tagFilter !== "all" && !item.catalog.tags.some((tag) => tag.id === tagFilter)) return false;
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
    });
  }, [categoryFilter, deferredSearch, discoverableItems, tagFilter, t, typeFilter]);

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

      <RecommendationSection
        eyebrow={t("shop.recommendations.forYouEyebrow")}
        title={t("shop.recommendations.forYouTitle")}
        description={t("shop.recommendations.forYouBody")}
        entries={forYouRecommendations}
        onOpen={(itemId) => setRoute(`item:${itemId}`)}
      />

      <RecommendationSection
        eyebrow={t("shop.recommendations.becausePlayedEyebrow")}
        title={
          becausePlayed.sourceItem
            ? t("shop.recommendations.becausePlayedTitle", {
                name: becausePlayed.sourceItem.catalog.name
              })
            : ""
        }
        description={t("shop.recommendations.becausePlayedBody")}
        entries={becausePlayed.recommendations}
        onOpen={(itemId) => setRoute(`item:${itemId}`)}
      />

      <section className="shop-filters">
        <label className="shop-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("shop.filters.searchPlaceholder")}
          />
        </label>

        <div className="filter-row">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              className={`filter-pill ${typeFilter === filter.value ? "is-active" : ""}`}
              onClick={() => setTypeFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="shop-filter-groups">
          <div className="shop-filter-group">
            <span>
              <Filter size={14} />
              {t("shop.filters.categories")}
            </span>
            <div className="filter-row">
              <button
                className={`filter-pill ${categoryFilter === "all" ? "is-active" : ""}`}
                onClick={() => setCategoryFilter("all")}
                type="button"
              >
                {t("shop.filters.all")}
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  className={`filter-pill ${categoryFilter === category ? "is-active" : ""}`}
                  onClick={() => setCategoryFilter(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="shop-filter-group">
            <span>
              <Filter size={14} />
              {t("shop.filters.tags")}
            </span>
            <div className="filter-row">
              <button
                className={`filter-pill ${tagFilter === "all" ? "is-active" : ""}`}
                onClick={() => setTagFilter("all")}
                type="button"
              >
                {t("shop.filters.all")}
              </button>
            </div>
            <div className="shop-tag-groups">
              {tagGroups.map((group) => (
                <div key={group.category} className="shop-tag-group">
                  <small>{getTagCategoryLabel(group.category, t)}</small>
                  <div className="filter-row">
                    {group.tags.map((tagId) => (
                      <button
                        key={tagId}
                        className={`filter-pill ${tagFilter === tagId ? "is-active" : ""}`}
                        onClick={() => setTagFilter(tagId)}
                        type="button"
                      >
                        {getTagLabel(tagId, t)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
        </>
      )}
    </div>
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

  return (
    <article className="shop-card">
      <button className="shop-card__media" onClick={onOpen} type="button">
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
      <div className="shop-card__body">
        <div className="shop-card__heading">
          <div>
            <p>
              {item.catalog.developer} / {itemTypeLabel(item.catalog.itemType, t)}
            </p>
            <h3>{item.catalog.name}</h3>
          </div>
          <StatusBadge status={item.collectionStatus} type="collection" />
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
