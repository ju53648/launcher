import {
  Check,
  FolderPlus,
  Languages,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "../components/StatusBadge";
import { LauncherUpdatePanel } from "../components/LauncherUpdatePanel";
import { GameRefreshPanel } from "../components/GameRefreshPanel";
import { formatDate } from "../domain/format";
import { SUPPORTED_LOCALES, useI18n } from "../i18n";
import { chooseDirectory } from "../services/tauri";
import { useLauncher } from "../store/LauncherStore";

export function SettingsView() {
  const { locale, t } = useI18n();
  const {
    snapshot,
    addLibrary,
    renameLibrary,
    removeLibrary,
    setDefaultLibrary,
    updatePreferences,
    setLanguagePreference,
    checkLauncherUpdates,
    installLauncherUpdate,
    checkItemUpdates,
    busyAction,
    updateProgress,
    gameRefreshFeedback
  } = useLauncher();
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryPath, setNewLibraryPath] = useState("");
  const [libraryNames, setLibraryNames] = useState<Record<string, string>>({});

  const preferences = useMemo(() => {
    if (!snapshot) return null;
    return {
      checkLauncherUpdatesOnStart: snapshot.config.checkLauncherUpdatesOnStart,
      checkGameUpdatesOnStart: snapshot.config.checkGameUpdatesOnStart,
      askForLibraryEachInstall: snapshot.config.installBehavior.askForLibraryEachInstall,
      createDesktopShortcuts: snapshot.config.installBehavior.createDesktopShortcuts,
      keepDownloadCache: snapshot.config.installBehavior.keepDownloadCache
    };
  }, [snapshot]);
  const [draftPreferences, setDraftPreferences] = useState(preferences);

  useEffect(() => {
    setDraftPreferences(preferences);
  }, [preferences]);

  if (!snapshot || !preferences) return null;

  const prefs = draftPreferences ?? preferences;
  const languageOptions = SUPPORTED_LOCALES.map((value) => ({
    value,
    label: t(`common.languages.${value}`),
    isNovelty: value === "shakespeare"
  }));

  return (
    <div className="settings-layout">
      <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">{t("settings.language.eyebrow")}</p>
            <h2>{t("settings.language.title")}</h2>
            <p className="muted">{t("settings.language.description")}</p>
          </div>
          <Languages size={18} />
        </div>

        <div className="language-selector" role="radiogroup" aria-label={t("settings.language.title")}>
          {languageOptions.map((option) => {
            const active = locale === option.value;
            return (
              <button
                key={option.value}
                className={`language-option ${active ? "is-active" : ""}`}
                onClick={() => setLanguagePreference(option.value)}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={busyAction === "set-language"}
              >
                <div className="language-option__header">
                  <strong>{option.label}</strong>
                  {active && (
                    <span className="language-option__check">
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <small>
                  {active ? t("settings.language.active") : t("settings.language.switchNow")}
                  {option.isNovelty ? ` • ${t("settings.language.novelty")}` : ""}
                </small>
              </button>
            );
          })}
        </div>

        <p className="muted">{t("settings.language.helper")}</p>
      </section>

      <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">{t("settings.storage.eyebrow")}</p>
            <h2>{t("settings.storage.title")}</h2>
          </div>
          <button
            className="button button--secondary"
            onClick={async () => {
              const path = await chooseDirectory({
                title: t("common.actions.chooseFolder"),
                prompt: t("common.labels.path"),
                defaultPath: snapshot.recommendedLibraryPath
              });
              if (path) setNewLibraryPath(path);
            }}
            type="button"
          >
            <FolderPlus size={16} />
            {t("common.actions.chooseFolder")}
          </button>
        </div>

        <div className="add-library">
          <label>
            <span>{t("common.labels.name")}</span>
            <input
              value={newLibraryName}
              onChange={(event) => setNewLibraryName(event.target.value)}
              placeholder={t("settings.storage.defaultNamePlaceholder")}
            />
          </label>
          <label>
            <span>{t("common.labels.path")}</span>
            <input
              value={newLibraryPath}
              onChange={(event) => setNewLibraryPath(event.target.value)}
              placeholder={snapshot.recommendedLibraryPath}
            />
          </label>
          <button
            className="button button--primary"
            disabled={!newLibraryPath.trim()}
            onClick={async () => {
              await addLibrary(
                newLibraryName.trim() || t("settings.storage.defaultNamePlaceholder"),
                newLibraryPath
              );
              setNewLibraryName("");
              setNewLibraryPath("");
            }}
            type="button"
          >
            {t("common.actions.addLibrary")}
          </button>
        </div>

        <div className="library-list">
          {snapshot.config.libraries.map((library) => (
            <article key={library.id} className="library-row">
              <div className="library-row__main">
                <div className="library-row__name">
                  <input
                    value={libraryNames[library.id] ?? library.name}
                    onChange={(event) =>
                      setLibraryNames((current) => ({
                        ...current,
                        [library.id]: event.target.value
                      }))
                    }
                  />
                  {library.isDefault && <span className="default-chip">{t("settings.storage.defaultChip")}</span>}
                  <StatusBadge status={library.status} type="library" />
                </div>
                <small>{library.path}</small>
                <small>
                  {t("settings.storage.lastSeen", {
                    date: formatDate(library.lastSeenAt, locale, t)
                  })}
                </small>
              </div>
              <div className="library-row__actions">
                <button
                  className="button button--ghost"
                  onClick={() => renameLibrary(library.id, libraryNames[library.id] ?? library.name)}
                  type="button"
                >
                  {t("settings.storage.saveLibrary")}
                </button>
                {!library.isDefault && (
                  <button className="button button--ghost" onClick={() => setDefaultLibrary(library.id)} type="button">
                    {t("common.actions.makeDefault")}
                  </button>
                )}
                <button
                  className="icon-button"
                  onClick={() => removeLibrary(library.id)}
                  type="button"
                  aria-label={t("settings.storage.removeAria")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">{t("settings.maintenance.eyebrow")}</p>
            <h2>{t("settings.maintenance.title")}</h2>
          </div>
          <button
            className="button button--primary"
            onClick={() =>
              updatePreferences(
                prefs.checkLauncherUpdatesOnStart,
                prefs.checkGameUpdatesOnStart,
                prefs.askForLibraryEachInstall,
                prefs.createDesktopShortcuts,
                prefs.keepDownloadCache
              )
            }
            type="button"
          >
            <Save size={16} />
            {t("common.actions.save")}
          </button>
        </div>

        <div className="toggle-grid">
          {[
            "checkLauncherUpdatesOnStart",
            "checkGameUpdatesOnStart",
            "askForLibraryEachInstall",
            "createDesktopShortcuts",
            "keepDownloadCache"
          ].map((key) => (
            <label key={key} className="toggle-row">
              <input
                type="checkbox"
                checked={Boolean(prefs[key as keyof typeof prefs])}
                onChange={(event) =>
                  setDraftPreferences((current) => ({
                    ...(current ?? preferences),
                    [key]: event.target.checked
                  }))
                }
              />
              <span>{t(`settings.maintenance.toggles.${key}`)}</span>
            </label>
          ))}
        </div>

        <div className="action-row">
          <button
            className="button button--secondary"
            disabled={busyAction === "check-launcher-update" || busyAction === "install-launcher-update"}
            onClick={checkLauncherUpdates}
            type="button"
          >
            <RefreshCw size={16} />
            {busyAction === "check-launcher-update"
              ? t("settings.maintenance.checkLauncherBusy")
              : t("common.actions.checkLauncher")}
          </button>
          <button
            className="button button--primary"
            disabled={busyAction === "check-launcher-update" || busyAction === "install-launcher-update"}
            onClick={installLauncherUpdate}
            type="button"
          >
            <RefreshCw size={16} />
            {busyAction === "install-launcher-update"
              ? t("settings.maintenance.updateLauncherBusy")
              : t("common.actions.updateLauncher")}
          </button>
          <button
            className="button button--secondary"
            disabled={busyAction === "item-update-check"}
            onClick={checkItemUpdates}
            type="button"
          >
            <RefreshCw size={16} />
            {busyAction === "item-update-check"
              ? t("common.actions.checkingShort")
              : t("common.actions.checkLibraryItems")}
          </button>
        </div>
        <GameRefreshPanel feedback={gameRefreshFeedback} />
        <LauncherUpdatePanel progress={updateProgress} />
      </section>

      <section className="settings-section">
        <div>
          <p className="eyebrow">{t("settings.privacy.eyebrow")}</p>
          <h2>{t("settings.privacy.title")}</h2>
        </div>
        <div className="privacy-panel">
          <ShieldCheck size={24} />
          <div>
            <strong>{t("settings.privacy.headline")}</strong>
            <p>{t("settings.privacy.body")}</p>
          </div>
        </div>
        <dl className="spec-list spec-list--stacked">
          <div>
            <dt>{t("common.labels.data")}</dt>
            <dd>{snapshot.dataDir}</dd>
          </div>
          <div>
            <dt>{t("common.labels.cache")}</dt>
            <dd>{snapshot.cacheDir}</dd>
          </div>
          <div>
            <dt>{t("common.labels.logs")}</dt>
            <dd>{snapshot.logsDir}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
