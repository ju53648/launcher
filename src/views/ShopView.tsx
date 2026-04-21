import { Check, Download, Filter, Plus, Search, Sparkles } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import {
  getDiscoverableItems,
  getRecommendedItems,
  getShopCategories,
  getShopTags
} from "../domain/selectors";
import { formatBytes, itemTypeLabel } from "../domain/format";
import type { CatalogItemType, ContentView } from "../domain/types";
import { useLauncher } from "../store/LauncherStore";

type TypeFilter = "all" | CatalogItemType;

const typeFilters: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "All types" },
  { value: "game", label: "Games" },
  { value: "tool", label: "Tools" },
  { value: "project", label: "Projects" }
];

export function ShopView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { snapshot, addItemToLibrary, busyAction } = useLauncher();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  if (!snapshot) return null;

  const discoverableItems = getDiscoverableItems(snapshot);
  const categories = getShopCategories(snapshot);
  const tags = getShopTags(snapshot);
  const recommendations = getRecommendedItems(snapshot, 3);

  const filteredItems = useMemo(() => {
    return discoverableItems.filter((item) => {
      if (typeFilter !== "all" && item.catalog.itemType !== typeFilter) return false;
      if (categoryFilter !== "all" && !item.catalog.categories.includes(categoryFilter)) return false;
      if (tagFilter !== "all" && !item.catalog.tags.includes(tagFilter)) return false;
      if (!deferredSearch) return true;

      const haystack = [
        item.catalog.name,
        item.catalog.developer,
        item.catalog.description,
        ...item.catalog.categories,
        ...item.catalog.tags
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(deferredSearch);
    });
  }, [categoryFilter, deferredSearch, discoverableItems, tagFilter, typeFilter]);

  return (
    <div className="view-stack">
      <section className="shop-intro">
        <div>
          <p className="eyebrow">Discovery</p>
          <h2>Find Lumorix content worth keeping locally</h2>
          <p>
            The Shop is your discovery layer. Add what you want to your Library, then install or
            update it on your terms.
          </p>
        </div>
        <div className="shop-intro__stat">
          <Sparkles size={20} />
          <strong>{discoverableItems.length}</strong>
          <span>{discoverableItems.length === 1 ? "discoverable item" : "discoverable items"}</span>
        </div>
      </section>

      {recommendations.length > 0 && (
        <section className="recommendations-panel">
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">For your library</p>
              <h2>Recommended next</h2>
            </div>
          </div>
          <div className="recommendation-grid">
            {recommendations.map((item) => (
              <button
                key={item.catalog.id}
                className="recommendation-card"
                onClick={() => setRoute(`item:${item.catalog.id}`)}
                type="button"
              >
                <strong>{item.catalog.name}</strong>
                <span>{item.catalog.tags.slice(0, 3).join(" · ")}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="shop-filters">
        <label className="shop-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, developer, tag, or category"
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
              Categories
            </span>
            <div className="filter-row">
              <button
                className={`filter-pill ${categoryFilter === "all" ? "is-active" : ""}`}
                onClick={() => setCategoryFilter("all")}
                type="button"
              >
                All
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
              Tags
            </span>
            <div className="filter-row">
              <button
                className={`filter-pill ${tagFilter === "all" ? "is-active" : ""}`}
                onClick={() => setTagFilter("all")}
                type="button"
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  className={`filter-pill ${tagFilter === tag ? "is-active" : ""}`}
                  onClick={() => setTagFilter(tag)}
                  type="button"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {discoverableItems.length === 0 ? (
        <EmptyState
          title="The Shop is empty"
          body="Enable a manifest source or add catalog manifests to make content available here."
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No items match these filters"
          body="Try another search, clear a filter, or explore a different category."
        />
      ) : (
        <>
          <div className="section-toolbar section-toolbar--compact">
            <div>
              <p className="eyebrow">Results</p>
              <h2>{filteredItems.length} shown</h2>
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
  onDownloads
}: {
  item: ContentView;
  busy: boolean;
  onAdd: () => void;
  onOpen: () => void;
  onLibrary: () => void;
  onDownloads: () => void;
}) {
  const manifest = item.manifest;

  return (
    <article className="shop-card">
      <button className="shop-card__media" onClick={onOpen} type="button">
        {item.catalog.coverImage ? (
          <img src={item.catalog.coverImage} alt={`${item.catalog.name} cover`} />
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
              {item.catalog.developer} · {itemTypeLabel(item.catalog.itemType)}
            </p>
            <h3>{item.catalog.name}</h3>
          </div>
          <StatusBadge status={item.collectionStatus} type="collection" />
        </div>

        <p className="shop-card__description">{item.catalog.description}</p>

        <div className="shop-card__tags">
          {[...item.catalog.categories, ...item.catalog.tags].slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="shop-card__meta">
          <span>{manifest ? `v${manifest.version}` : "Unavailable"}</span>
          <span>{formatBytes(manifest?.installSizeBytes ?? 0)}</span>
        </div>

        <div className="shop-card__actions">
          {!item.state.added ? (
            <button className="button button--primary" disabled={busy} onClick={onAdd} type="button">
              <Plus size={16} />
              {busy ? "Adding..." : "Add to Library"}
            </button>
          ) : item.activeJob ? (
            <button className="button button--secondary" onClick={onDownloads} type="button">
              <Download size={16} />
              View Download
            </button>
          ) : (
            <button className="button button--secondary" onClick={onLibrary} type="button">
              <Check size={16} />
              View in Library
            </button>
          )}
          <button className="button button--ghost" onClick={onOpen} type="button">
            Details
          </button>
        </div>
      </div>
    </article>
  );
}
