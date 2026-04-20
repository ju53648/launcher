import { useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { GameCard } from "../components/GameCard";
import { InstallDialog } from "../components/InstallDialog";
import type { GameView } from "../domain/types";
import { useLauncher } from "../store/LauncherStore";

const filters: Array<{ value: "all" | "installed" | "added" | "updateAvailable"; label: string }> = [
  { value: "all", label: "All" },
  { value: "installed", label: "Installed" },
  { value: "added", label: "Ready to install" },
  { value: "updateAvailable", label: "Updates" }
];

export function LibraryView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { snapshot, installGame, launchGame, updateGame, repairGame } = useLauncher();
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [installTarget, setInstallTarget] = useState<GameView | null>(null);

  const games = useMemo(() => {
    if (!snapshot) return [];
    const libraryGames = snapshot.games.filter((game) => game.ownershipStatus !== "notAdded");
    return libraryGames.filter((game) => filter === "all" || game.ownershipStatus === filter);
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

      {games.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "Your library is empty" : "No games match this filter"}
          body={
            filter === "all"
              ? "Add games from the Shop to build your collection. Installed games will also appear here automatically."
              : "Try another library filter, or add more games from the Shop."
          }
          action={
            <button className="button button--primary" onClick={() => setRoute("shop")} type="button">
              Open Shop
            </button>
          }
        />
      ) : (
        <section className="library-grid">
          {games.map((game) => (
            <GameCard
              key={game.manifest.id}
              game={game}
              onOpen={() => setRoute(`game:${game.manifest.id}`)}
              onInstall={() => setInstallTarget(game)}
              onLaunch={() => launchGame(game.manifest.id)}
              onUpdate={() => updateGame(game.manifest.id)}
              onRepair={() => repairGame(game.manifest.id)}
            />
          ))}
        </section>
      )}

      {installTarget && (
        <InstallDialog
          game={installTarget}
          libraries={snapshot.config.libraries}
          defaultLibraryId={snapshot.config.defaultLibraryId}
          onClose={() => setInstallTarget(null)}
          onInstall={async (libraryId) => {
            await installGame(installTarget.manifest.id, libraryId);
          }}
        />
      )}
    </div>
  );
}
