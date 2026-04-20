import { Download, Play, Wrench } from "lucide-react";

import { formatBytes } from "../domain/format";
import type { GameView } from "../domain/types";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

export function GameCard({
  game,
  onOpen,
  onInstall,
  onLaunch,
  onUpdate,
  onRepair
}: {
  game: GameView;
  onOpen: () => void;
  onInstall: () => void;
  onLaunch: () => void;
  onUpdate: () => void;
  onRepair: () => void;
}) {
  const { manifest } = game;

  return (
    <article className="game-card">
      <button className="game-card__media" onClick={onOpen} type="button">
        <img src={manifest.coverImage} alt={`${manifest.name} cover`} />
      </button>
      <div className="game-card__body">
        <div className="game-card__title-row">
          <div>
            <h3>{manifest.name}</h3>
            <p>{manifest.developer}</p>
          </div>
          <StatusBadge status={game.ownershipStatus} type="ownership" />
        </div>

        <p className="game-card__description">{manifest.description}</p>

        {game.activeJob ? (
          <div className="game-card__job">
            <span>{game.activeJob.message}</span>
            <ProgressBar value={game.activeJob.progress} compact />
          </div>
        ) : (
          <div className="game-card__meta">
            <span>v{manifest.version}</span>
            <span>{formatBytes(manifest.installSizeBytes)}</span>
          </div>
        )}

        <div className="game-card__actions">
          {game.status === "installed" && (
            <button className="button button--primary" onClick={onLaunch} type="button">
              <Play size={16} />
              Play
            </button>
          )}
          {game.status === "notInstalled" && (
            <button className="button button--primary" onClick={onInstall} type="button">
              <Download size={16} />
              Install
            </button>
          )}
          {game.status === "updateAvailable" && (
            <button className="button button--primary" onClick={onUpdate} type="button">
              <Download size={16} />
              Update
            </button>
          )}
          {game.status === "error" && (
            <button className="button button--primary" onClick={onRepair} type="button">
              <Wrench size={16} />
              Repair
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
