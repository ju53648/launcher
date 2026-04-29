import { Download, FolderOpen, X } from "lucide-react";
import { useMemo, useState } from "react";

import { formatBytes } from "../domain/format";
import { resolveCatalogImageSrc } from "../domain/media";
import type { ContentView, LibraryFolder } from "../domain/types";
import { useI18n } from "../i18n";
import { StatusBadge } from "./StatusBadge";

export function InstallDialog({
  item,
  libraries,
  defaultLibraryId,
  onClose,
  onInstall
}: {
  item: ContentView;
  libraries: LibraryFolder[];
  defaultLibraryId: string | null;
  onClose: () => void;
  onInstall: (libraryId: string) => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const availableLibraries = useMemo(
    () => libraries.filter((library) => library.status === "available"),
    [libraries]
  );
  const [libraryId, setLibraryId] = useState(defaultLibraryId ?? availableLibraries[0]?.id ?? "");

  const selected = availableLibraries.find((library) => library.id === libraryId);
  const manifest = item.manifest;
  const bannerImageSrc = resolveCatalogImageSrc(
    item.catalog.bannerImage,
    manifest?.version ?? item.catalog.releaseDate
  );

  if (!manifest) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="install-title">
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
            <p className="eyebrow">{t("installDialog.eyebrow")}</p>
            <h2 id="install-title">{item.catalog.name}</h2>
            <p>{formatBytes(manifest.installSizeBytes, locale)} / v{manifest.version}</p>
          </div>
        </div>

        {availableLibraries.length > 0 ? (
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
        ) : (
          <div className="empty-state">
            <div>
              <h2>{t("installDialog.noLibrariesTitle")}</h2>
              <p>{t("installDialog.noLibrariesBody")}</p>
            </div>
          </div>
        )}

        {selected && (
          <div className="install-target">
            <FolderOpen size={18} />
            <span>
              <strong>{t("installDialog.targetLabel")}</strong>
              {` ${selected.path}\\${manifest.defaultInstallFolder}`}
            </span>
          </div>
        )}

        <div className="modal__actions">
          <button className="button button--ghost" onClick={onClose} type="button">
            {t("common.actions.cancel")}
          </button>
          <button
            className="button button--primary"
            disabled={!libraryId || availableLibraries.length === 0}
            onClick={async () => {
              await onInstall(libraryId);
              onClose();
            }}
            type="button"
          >
            <Download size={16} />
            {t("common.actions.install")}
          </button>
        </div>
      </section>
    </div>
  );
}
