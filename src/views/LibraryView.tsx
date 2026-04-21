import { useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { GameCard } from "../components/GameCard";
import { InstallDialog } from "../components/InstallDialog";
import { getLibraryItems } from "../domain/selectors";
import type { ContentView, ItemCollectionStatus } from "../domain/types";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

export function LibraryView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { t } = useI18n();
  const { snapshot, installItem, launchItem, updateItem, repairItem } = useLauncher();
  const [filter, setFilter] = useState<"all" | ItemCollectionStatus>("all");
  const [installTarget, setInstallTarget] = useState<ContentView | null>(null);

  const filters: Array<{ value: "all" | ItemCollectionStatus; label: string }> = [
    { value: "all", label: t("library.filters.all") },
    { value: "installed", label: t("library.filters.installed") },
    { value: "added", label: t("library.filters.added") },
    { value: "updateAvailable", label: t("library.filters.updateAvailable") },
    { value: "error", label: t("library.filters.error") }
  ];

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
          title={
            filter === "all"
              ? t("library.emptyState.emptyTitle")
              : t("library.emptyState.filteredTitle")
          }
          body={
            filter === "all"
              ? t("library.emptyState.emptyBody")
              : t("library.emptyState.filteredBody")
          }
          action={
            <button className="button button--primary" onClick={() => setRoute("shop")} type="button">
              {t("common.actions.openShop")}
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
