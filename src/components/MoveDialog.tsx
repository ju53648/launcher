import { FolderInput, X } from "lucide-react";
import { useMemo, useState } from "react";

import { resolveCatalogImageSrc } from "../domain/media";
import type { ContentView, LibraryFolder } from "../domain/types";
import { useI18n } from "../i18n";
import { StatusBadge } from "./StatusBadge";

export function MoveDialog({
  item,
  libraries,
  onClose,
  onMove
}: {
  item: ContentView;
  libraries: LibraryFolder[];
  onClose: () => void;
  onMove: (targetLibraryId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const currentLibraryId = item.installed?.libraryId ?? null;

  const availableLibraries = useMemo(
    () =>
      libraries.filter(
        (library) => library.status === "available" && library.id !== currentLibraryId
      ),
    [libraries, currentLibraryId]
  );

  const [libraryId, setLibraryId] = useState(availableLibraries[0]?.id ?? "");

  const manifest = item.manifest;
  const bannerImageSrc = resolveCatalogImageSrc(
    item.catalog.bannerImage,
    manifest?.version ?? item.catalog.releaseDate
  );

  const currentLibrary = libraries.find((l) => l.id === currentLibraryId);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="move-title">
        <button
          className="icon-button modal__close"
          onClick={onClose}
          type="button"
          aria-label={t("accessibility.closeModal")}
        >
          <X size={18} />
        </button>
        <div className="modal__hero">
          {bannerImageSrc ? (
            <img src={bannerImageSrc} alt="" />
          ) : (
            <div className="media-placeholder media-placeholder--hero" />
          )}
          <div>
            <p className="eyebrow">{t("moveDialog.eyebrow")}</p>
            <h2 id="move-title">{item.catalog.name}</h2>
            {currentLibrary && (
              <p className="muted">
                {t("moveDialog.currentLibrary", { name: currentLibrary.name })}
              </p>
            )}
          </div>
        </div>

        {availableLibraries.length > 0 ? (
          <div className="library-picker">
            {availableLibraries.map((library) => (
              <label key={library.id} className="library-option">
                <input
                  type="radio"
                  name="move-library"
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
        ) : (
          <div className="empty-state">
            <div>
              <h2>{t("moveDialog.noLibrariesTitle")}</h2>
              <p>{t("moveDialog.noLibrariesBody")}</p>
            </div>
          </div>
        )}

        <p className="move-dialog__saves-note">{t("moveDialog.savesPreserved")}</p>

        <div className="modal__actions">
          <button className="button button--ghost" onClick={onClose} type="button">
            {t("common.actions.cancel")}
          </button>
          <button
            className="button button--primary"
            disabled={!libraryId || availableLibraries.length === 0}
            onClick={async () => {
              await onMove(libraryId);
              onClose();
            }}
            type="button"
          >
            <FolderInput size={16} />
            {t("common.actions.moveInstall")}
          </button>
        </div>
      </section>
    </div>
  );
}
