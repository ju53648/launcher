import { useMemo, useState } from "react";

import type { AppRoute } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { GameCard } from "../components/GameCard";
import { InstallDialog } from "../components/InstallDialog";
import type { GameStatus, GameView } from "../domain/types";
import { useLauncher } from "../store/LauncherStore";

const filters: Array<{ value: "all" | GameStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "installed", label: "Installed" },
  { value: "notInstalled", label: "Not installed" },
  { value: "updateAvailable", label: "Updates" }
];

export function LibraryView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { snapshot, installGame, launchGame, updateGame, repairGame } = useLauncher();
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [installTarget, setInstallTarget] = useState<GameView | null>(null);

  const games = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.games.filter((game) => filter === "all" || game.status === filter);
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
          title="No games here yet"
          body="Add or enable manifests and Lumorix will list installable games here."
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
