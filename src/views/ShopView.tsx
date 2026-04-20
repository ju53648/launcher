import { Check, Plus, ShoppingBag } from "lucide-react";

import type { AppRoute } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes } from "../domain/format";
import type { GameView } from "../domain/types";
import { useLauncher } from "../store/LauncherStore";

export function ShopView({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { snapshot, addGameToLibrary, busyAction } = useLauncher();
  if (!snapshot) return null;

  return (
    <div className="view-stack">
      <section className="shop-intro">
        <div>
          <p className="eyebrow">Catalog</p>
          <h2>Discover games for your Lumorix library</h2>
          <p>
            Browse available titles, add the ones you want, then manage installs and updates from
            your Library.
          </p>
        </div>
        <div className="shop-intro__stat">
          <ShoppingBag size={20} />
          <strong>{snapshot.games.length}</strong>
          <span>{snapshot.games.length === 1 ? "available game" : "available games"}</span>
        </div>
      </section>

      {snapshot.games.length === 0 ? (
        <EmptyState
          title="The shop is empty"
          body="Enable a manifest source or add catalog manifests to make games available here."
        />
      ) : (
        <section className="shop-grid">
          {snapshot.games.map((game) => (
            <ShopCard
              key={game.manifest.id}
              game={game}
              busy={busyAction === "add-game-to-library"}
              onAdd={() => addGameToLibrary(game.manifest.id)}
              onOpen={() => setRoute(`game:${game.manifest.id}`)}
              onLibrary={() => setRoute("library")}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ShopCard({
  game,
  busy,
  onAdd,
  onOpen,
  onLibrary
}: {
  game: GameView;
  busy: boolean;
  onAdd: () => void;
  onOpen: () => void;
  onLibrary: () => void;
}) {
  const inLibrary = game.ownershipStatus !== "notAdded";

  return (
    <article className="shop-card">
      <button className="shop-card__media" onClick={onOpen} type="button">
        <img src={game.manifest.coverImage} alt={`${game.manifest.name} cover`} />
      </button>
      <div className="shop-card__body">
        <div className="shop-card__heading">
          <div>
            <p>{game.manifest.developer}</p>
            <h3>{game.manifest.name}</h3>
          </div>
          <StatusBadge status={game.ownershipStatus} type="ownership" />
        </div>

        <p className="shop-card__description">{game.manifest.description}</p>

        <div className="shop-card__tags">
          {game.manifest.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="shop-card__meta">
          <span>v{game.manifest.version}</span>
          <span>{formatBytes(game.manifest.installSizeBytes)}</span>
        </div>

        <div className="shop-card__actions">
          {inLibrary ? (
            <button className="button button--secondary" onClick={onLibrary} type="button">
              <Check size={16} />
              In Library
            </button>
          ) : (
            <button className="button button--primary" disabled={busy} onClick={onAdd} type="button">
              <Plus size={16} />
              {busy ? "Adding..." : "Add to Library"}
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
