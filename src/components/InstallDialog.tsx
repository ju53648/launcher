import { Download, FolderOpen, X } from "lucide-react";
import { useMemo, useState } from "react";

import { formatBytes } from "../domain/format";
import type { GameView, LibraryFolder } from "../domain/types";
import { StatusBadge } from "./StatusBadge";

export function InstallDialog({
  game,
  libraries,
  defaultLibraryId,
  onClose,
  onInstall
}: {
  game: GameView;
  libraries: LibraryFolder[];
  defaultLibraryId: string | null;
  onClose: () => void;
  onInstall: (libraryId: string) => Promise<void>;
}) {
  const availableLibraries = useMemo(
    () => libraries.filter((library) => library.status === "available"),
    [libraries]
  );
  const [libraryId, setLibraryId] = useState(defaultLibraryId ?? availableLibraries[0]?.id ?? "");

  const selected = availableLibraries.find((library) => library.id === libraryId);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="install-title">
        <button className="icon-button modal__close" onClick={onClose} type="button" aria-label="Close">
          <X size={18} />
        </button>
        <div className="modal__hero">
          <img src={game.manifest.bannerImage} alt="" />
          <div>
            <p className="eyebrow">Install package</p>
            <h2 id="install-title">{game.manifest.name}</h2>
            <p>{formatBytes(game.manifest.installSizeBytes)} · v{game.manifest.version}</p>
          </div>
        </div>

        <div className="library-picker">
          {availableLibraries.map((library) => (
            <label key={library.id} className="library-option">
              <input
                type="radio"
                name="library"
                checked={library.id === libraryId}
                onChange={() => setLibraryId(library.id)}
              />
              <span>
                <strong>{library.name}</strong>
                <small>{library.path}</small>
              </span>
              <StatusBadge status={library.status} type="library" />
            </label>
          ))}
        </div>

        {selected && (
          <div className="install-target">
            <FolderOpen size={18} />
            <span>{`${selected.path}\\${game.manifest.defaultInstallFolder}`}</span>
          </div>
        )}

        <div className="modal__actions">
          <button className="button button--ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="button button--primary"
            disabled={!libraryId}
            onClick={async () => {
              await onInstall(libraryId);
              onClose();
            }}
            type="button"
          >
            <Download size={16} />
            Install
          </button>
        </div>
      </section>
    </div>
  );
}
