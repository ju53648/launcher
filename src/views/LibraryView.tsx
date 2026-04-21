import { useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { GameCard } from "../components/GameCard";
import { InstallDialog } from "../components/InstallDialog";
import { getLibraryItems } from "../domain/selectors";
import type { ContentView, ItemCollectionStatus } from "../domain/types";
import { useLauncher } from "../store/LauncherStore";

const filters: Array<{ value: "all" | ItemCollectionStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "installed", label: "Installed" },
  { value: "added", label: "Ready to install" },
  { value: "updateAvailable", label: "Updates" },
  { value: "error", label: "Needs repair" }
];

export function LibraryView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { snapshot, installItem, launchItem, updateItem, repairItem } = useLauncher();
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [installTarget, setInstallTarget] = useState<ContentView | null>(null);

  const items = useMemo(() => {
    if (!snapshot) return [];
    const libraryItems = getLibraryItems(snapshot);
    return libraryItems.filter((item) => filter === "all" || item.collectionStatus === filter);
  }, [filter, snapshot]);

  if (!snapshot) return null;

  return (
    <div className="view-stack">
      <div className="filter-row">
        {filters.map((item) => (
          <button
            key={item.value}
            className={`filter-pill ${filter === item.value ? "is-active" : ""}`}
            onClick={() => setFilter(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "Your Library is empty" : "No items match this filter"}
          body={
            filter === "all"
              ? "Add something from the Shop to start building your Lumorix collection. Once added, it stays here for install, launch, update, and repair actions."
              : "Try another filter or head back to the Shop to add more content."
          }
          action={
            <button className="button button--primary" onClick={() => setRoute("shop")} type="button">
              Open Shop
            </button>
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
    </div>
  );
}
