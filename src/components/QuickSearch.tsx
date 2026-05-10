import { ArrowRight, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [activeIndex, setActiveIndex] = useState(0);
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
  const results = useMemo(() => {
    if (normalized.length < 1) {
      return [];
    }

    return [...items]
      .filter((item) => {
        const haystack = [
          item.catalog.name,
          item.catalog.developer,
          item.catalog.description,
          ...item.catalog.categories
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .sort((left, right) => searchRank(right, normalized) - searchRank(left, normalized))
      .slice(0, 8);
  }, [items, normalized]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalized, open]);

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
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && results.length > 0) {
                e.preventDefault();
                setActiveIndex((current) => Math.min(results.length - 1, current + 1));
                return;
              }

              if (e.key === "ArrowUp" && results.length > 0) {
                e.preventDefault();
                setActiveIndex((current) => Math.max(0, current - 1));
                return;
              }

              if (e.key === "Enter" && results.length > 0) {
                e.preventDefault();
                navigate(results[Math.min(activeIndex, results.length - 1)].catalog.id);
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
            {results.map((item, index) => {
              const iconSrc = resolveCatalogImageSrc(
                item.catalog.iconImage,
                item.manifest?.version ?? item.catalog.releaseDate
              );
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.catalog.id}
                  className={`quicksearch__item ${isActive ? "is-active" : ""}`}
                  onClick={() => navigate(item.catalog.id)}
                  onMouseEnter={() => setActiveIndex(index)}
                  type="button"
                  role="option"
                  aria-selected={isActive}
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
              <span><kbd>↑</kbd><kbd>↓</kbd><kbd>↵</kbd></span>
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

function searchRank(
  item: NonNullable<ReturnType<typeof useLauncher>["snapshot"]>["items"][number],
  query: string
) {
  const name = item.catalog.name.toLowerCase();
  const developer = item.catalog.developer.toLowerCase();
  const description = item.catalog.description.toLowerCase();

  let score = 0;
  if (name === query) score += 120;
  else if (name.startsWith(query)) score += 80;
  else if (name.includes(query)) score += 50;

  if (developer.startsWith(query)) score += 20;
  else if (developer.includes(query)) score += 12;

  if (description.includes(query)) score += 8;
  if (item.state.added) score += 4;
  if (item.state.installed) score += 3;

  return score;
}
