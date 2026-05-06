import { ArrowRight, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AppRoute } from "./AppShell";
import { resolveCatalogImageSrc } from "../domain/media";
import { getProfileScopedStorageKey } from "../domain/profileStorage";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

const QUICKSEARCH_HISTORY_KEY = "lumorix.quicksearch.history";
const QUICKSEARCH_HISTORY_LIMIT = 5;

export function QuickSearch({ setRoute }: { setRoute: (route: AppRoute) => void }) {
  const { t } = useI18n();
  const { snapshot, activeProfileId } = useLauncher();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>(() => loadQuickSearchHistory(activeProfileId));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadQuickSearchHistory(activeProfileId));
  }, [activeProfileId]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Cmd+K / Ctrl+K opens search
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        if (open) {
          handleClose();
        } else {
          handleOpen();
        }
      }
      if (event.key === "Escape" && open) {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleOpen, handleClose]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = snapshot?.items ?? [];
  const normalized = query.trim().toLowerCase();
  const results = normalized.length < 1
    ? []
    : items
        .filter((item) =>
          item.catalog.name.toLowerCase().includes(normalized) ||
          item.catalog.developer.toLowerCase().includes(normalized)
        )
        .slice(0, 8);

  function navigate(itemId: string) {
    if (normalized) {
      const nextHistory = pushQueryHistory(history, query);
      setHistory(nextHistory);
      saveQuickSearchHistory(activeProfileId, nextHistory);
    }
    setRoute(`item:${itemId}`);
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="quicksearch-backdrop" onClick={handleClose}>
      <div
        className="quicksearch"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("quicksearch.title")}
      >
        <div className="quicksearch__bar">
          <Search size={18} />
          <input
            ref={inputRef}
            className="quicksearch__input"
            placeholder={t("quicksearch.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length > 0) {
                navigate(results[0].catalog.id);
              }
            }}
            type="search"
            autoComplete="off"
          />
          <kbd className="quicksearch__hint">Esc</kbd>
          <button className="icon-button" onClick={handleClose} type="button" aria-label={t("common.actions.close")}>
            <X size={15} />
          </button>
        </div>

        {results.length > 0 && (
          <div className="quicksearch__results" role="listbox">
            {results.map((item) => {
              const iconSrc = resolveCatalogImageSrc(
                item.catalog.iconImage,
                item.manifest?.version ?? item.catalog.releaseDate
              );
              return (
                <button
                  key={item.catalog.id}
                  className="quicksearch__item"
                  onClick={() => navigate(item.catalog.id)}
                  type="button"
                  role="option"
                >
                  {iconSrc ? (
                    <img src={iconSrc} alt="" className="quicksearch__icon" />
                  ) : (
                    <span className="quicksearch__icon quicksearch__icon--fallback">
                      {item.catalog.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="quicksearch__item-info">
                    <strong>{item.catalog.name}</strong>
                    <small>{item.catalog.developer}</small>
                  </span>
                  <ArrowRight size={14} className="quicksearch__arrow" />
                </button>
              );
            })}
          </div>
        )}

        {normalized.length > 0 && results.length === 0 && (
          <p className="quicksearch__empty">{t("quicksearch.noResults", { query })}</p>
        )}

        {normalized.length === 0 && (
          <div className="quicksearch__shortcuts">
            <div className="quicksearch__history">
              <div className="quicksearch__history-header">
                <span>{t("quicksearch.historyTitle")}</span>
                {history.length > 0 && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setHistory([]);
                      saveQuickSearchHistory(activeProfileId, []);
                    }}
                  >
                    {t("quicksearch.clearHistory")}
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <span className="quicksearch__history-empty">{t("quicksearch.historyEmpty")}</span>
              ) : (
                <div className="quicksearch__history-list">
                  {history.map((entry) => (
                    <button
                      key={entry}
                      className="quicksearch__history-chip"
                      type="button"
                      onClick={() => setQuery(entry)}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span><kbd>1</kbd><kbd>–</kbd><kbd>7</kbd></span>
              <span>{t("quicksearch.hintNav")}</span>
            </div>
            <div>
              <span><kbd>Ctrl</kbd><kbd>K</kbd></span>
              <span>{t("quicksearch.hintToggle")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function loadQuickSearchHistory(activeProfileId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw =
      window.localStorage.getItem(getProfileScopedStorageKey(QUICKSEARCH_HISTORY_KEY, activeProfileId)) ??
      window.localStorage.getItem(QUICKSEARCH_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === "string").slice(0, QUICKSEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function saveQuickSearchHistory(activeProfileId: string, values: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    getProfileScopedStorageKey(QUICKSEARCH_HISTORY_KEY, activeProfileId),
    JSON.stringify(values)
  );
}

function pushQueryHistory(current: string[], value: string): string[] {
  const normalized = value.trim();
  if (!normalized) {
    return current;
  }
  const withoutDupes = current.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase());
  return [normalized, ...withoutDupes].slice(0, QUICKSEARCH_HISTORY_LIMIT);
}
