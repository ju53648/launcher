import {
  Check,
  Database,
  Download,
  FolderPlus,
  Languages,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  UserRound,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PathInputDialog } from "../components/PathInputDialog";
import { LauncherAvatar } from "../components/LauncherAvatar";
import { StatusBadge } from "../components/StatusBadge";
import { LauncherUpdatePanel } from "../components/LauncherUpdatePanel";
import { GameRefreshPanel } from "../components/GameRefreshPanel";
import {
  LAUNCHER_AVATAR_IDS,
  LAUNCHER_DENSITY_IDS,
  LAUNCHER_FONT_STYLE_IDS,
  LAUNCHER_MOTION_LEVEL_IDS,
  LAUNCHER_SURFACE_STYLE_IDS,
  LAUNCHER_STYLE_PRESET_IDS,
  LAUNCHER_THEME_IDS,
  type LauncherStylePreferences,
  PRESET_DEFAULTS,
  exportStyleProfile,
  importStyleProfile
} from "../domain/personalization";
import { formatDate } from "../domain/format";
import { getLibraryItems } from "../domain/selectors";
import { loadColorMode, saveColorMode, type ColorMode } from "../domain/colorMode";
import type { LauncherSnapshot } from "../domain/types";
import { SUPPORTED_LOCALES, useI18n } from "../i18n";
import { exportBackup, getBackupMeta } from "../services/backup";
import { chooseDirectory, isTauriRuntime } from "../services/tauri";
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
    gameRefreshFeedback,
    personalization,
    saveDisplayName,
    setLauncherTheme,
    setLauncherAvatar,
    setFavoriteItem,
    setAccentColor,
    updateStylePreferences,
    profiles,
    activeProfileId,
    switchProfile,
    createNewProfile,
    deleteProfile
  } = useLauncher();
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryPath, setNewLibraryPath] = useState("");
  const [isLibraryPathDialogOpen, setIsLibraryPathDialogOpen] = useState(false);
  const [libraryNames, setLibraryNames] = useState<Record<string, string>>({});
  const [displayNameDraft, setDisplayNameDraft] = useState(personalization.displayName);
  const [newProfileName, setNewProfileName] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>(() => loadColorMode());
  const [importError, setImportError] = useState<string | null>(null);

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

  useEffect(() => {
    setDisplayNameDraft(personalization.displayName);
  }, [personalization.displayName]);

  if (!snapshot || !preferences) return null;

  const runningInTauri = isTauriRuntime();
  const recommendedLibraryPath = snapshot.recommendedLibraryPath;
  const prefs = draftPreferences ?? preferences;
  const favoriteOptions = getLibraryItems(snapshot)
    .filter((item) => item.catalog.itemType === "game")
    .sort((left, right) => left.catalog.name.localeCompare(right.catalog.name));
  const displayNameLocked = Boolean(personalization.displayName) && !personalization.canEditDisplayName;
  const canSaveDisplayName =
    displayNameDraft.trim().length > 0 &&
    displayNameDraft.trim() !== personalization.displayName &&
    !displayNameLocked;
  const languageOptions = SUPPORTED_LOCALES.map((value) => ({
    value,
    label: t(`common.languages.${value}`),
    isNovelty: value === "shakespeare"
  }));

  const stylePresetLabels: Record<string, { name: string; description: string }> = {
    future: { name: "Future Core", description: "Kräftiger Glow, moderne Tiefe." },
    midnight: { name: "Midnight Ops", description: "Ruhiger, dichter, kontrastreicher." },
    ice: { name: "Ice Glass", description: "Helleres Neon, klarere Kanten." },
    retro: { name: "Retro Grid", description: "Wärmere Paneele, softer Vibe." }
  };

  const fontStyleLabels: Record<string, string> = {
    jakarta: "Plus Jakarta",
    rounded: "Rounded",
    mono: "Tech Mono"
  };

  function applySuggestedLibraryPath(path: string) {
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return;
    }

    setNewLibraryPath(trimmedPath);
    if (!newLibraryName.trim()) {
      setNewLibraryName(suggestLibraryNameFromPath(trimmedPath, t("settings.storage.defaultNamePlaceholder")));
    }
  }

  async function handleChooseLibraryPath() {
    if (!runningInTauri) {
      setIsLibraryPathDialogOpen(true);
      return;
    }

    const path = await chooseDirectory({
      title: t("common.actions.chooseFolder"),
      prompt: t("common.labels.path"),
      defaultPath: recommendedLibraryPath
    });
    if (path) {
      applySuggestedLibraryPath(path);
    }
  }

  function handleExportStyle() {
    const json = exportStyleProfile(personalization.style, personalization.displayName || "Lumorix Style");
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumorix-style-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportStyle(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const imported = importStyleProfile(jsonString);
        void updateStylePreferences(imported);
        setImportError(null);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : "Failed to import style profile");
        setTimeout(() => setImportError(null), 3000);
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be imported again
    event.target.value = "";
  }

  function handleResetPreset(presetId: LauncherStylePreferences["presetId"]) {
    const defaults = PRESET_DEFAULTS[presetId];
    if (defaults) {
      void updateStylePreferences(defaults);
    }
  }

  return (
    <>
      <div className="settings-layout">
        <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">{t("settings.personalization.eyebrow")}</p>
            <h2>{t("settings.personalization.title")}</h2>
            <p className="muted">{t("settings.personalization.description")}</p>
          </div>
          <Palette size={18} />
        </div>

        <div className="identity-grid">
          <div className="identity-card">
            <div className="identity-card__header">
              <UserRound size={18} />
              <div>
                <strong>{t("settings.personalization.nameTitle")}</strong>
                <p className="muted">{t("settings.personalization.nameDescription")}</p>
              </div>
            </div>

            <label className="identity-field">
              <span>{t("common.labels.name")}</span>
              <input
                disabled={displayNameLocked}
                maxLength={32}
                value={displayNameDraft}
                onChange={(event) => setDisplayNameDraft(event.target.value)}
                placeholder={t("settings.personalization.namePlaceholder")}
              />
            </label>

            <p className="muted">
              {personalization.displayName
                ? displayNameLocked
                  ? t("settings.personalization.nameLockedUntil", {
                      date: formatDate(personalization.nextDisplayNameChangeAt, locale, t)
                    })
                  : t("settings.personalization.nameReady")
                : t("settings.personalization.nameMissing")}
            </p>

            <div className="identity-card__actions">
              <button
                className="button button--primary"
                disabled={!canSaveDisplayName}
                onClick={() => {
                  void saveDisplayName(displayNameDraft).catch(() => undefined);
                }}
                type="button"
              >
                <Save size={16} />
                {t("settings.personalization.saveName")}
              </button>
            </div>
          </div>

          <div className="identity-card">
            <div className="identity-card__header">
              <Palette size={18} />
              <div>
                <strong>{t("settings.personalization.themeTitle")}</strong>
                <p className="muted">{t("settings.personalization.themeDescription")}</p>
              </div>
            </div>

            <div className="theme-grid">
              {LAUNCHER_THEME_IDS.map((themeId) => {
                const active = personalization.themeId === themeId;
                return (
                  <button
                    key={themeId}
                    className={`theme-option ${active ? "is-active" : ""}`}
                    onClick={() => {
                      void setLauncherTheme(themeId);
                    }}
                    type="button"
                    aria-pressed={active}
                  >
                    <span className={`theme-swatch theme-swatch--${themeId}`} aria-hidden="true" />
                    <strong>{t(`settings.personalization.themes.${themeId}.name`)}</strong>
                    <small>{t(`settings.personalization.themes.${themeId}.description`)}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="identity-card identity-card--wide">
            <div className="identity-card__header">
              <Palette size={18} />
              <div>
                <strong>{t("settings.personalization.avatarTitle")}</strong>
                <p className="muted">{t("settings.personalization.avatarDescription")}</p>
              </div>
            </div>

            <div className="avatar-grid">
              {LAUNCHER_AVATAR_IDS.map((avatarId) => {
                const active = personalization.avatarId === avatarId;
                return (
                  <button
                    key={avatarId}
                    className={`avatar-option ${active ? "is-active" : ""}`}
                    onClick={() => {
                      void setLauncherAvatar(avatarId);
                    }}
                    type="button"
                    aria-pressed={active}
                  >
                    <LauncherAvatar avatarId={avatarId} size="lg" />
                    <strong>{t(`settings.personalization.avatars.${avatarId}.name`)}</strong>
                    <small>{t(`settings.personalization.avatars.${avatarId}.description`)}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="identity-card identity-card--wide">
            <div className="identity-card__header">
              <Palette size={18} />
              <div>
                <strong>{t("settings.personalization.favoriteTitle")}</strong>
                <p className="muted">{t("settings.personalization.favoriteDescription")}</p>
              </div>
            </div>

            <label className="identity-field">
              <span>{t("settings.personalization.favoriteLabel")}</span>
              <select
                value={personalization.favoriteItemId ?? ""}
                onChange={(event) => {
                  void setFavoriteItem(event.target.value || null);
                }}
              >
                <option value="">{t("settings.personalization.favoriteNone")}</option>
                {favoriteOptions.map((item) => (
                  <option key={item.catalog.id} value={item.catalog.id}>
                    {item.catalog.name}
                  </option>
                ))}
              </select>
            </label>

            <p className="muted">
              {favoriteOptions.length > 0
                ? t("settings.personalization.favoriteHint")
                : t("settings.personalization.favoriteEmpty")}
            </p>
          </div>

          <div className="identity-card identity-card--wide">
            <div className="identity-card__header">
              <Palette size={18} />
              <div>
                <strong>{t("settings.personalization.accentColor.title")}</strong>
                <p className="muted">{t("settings.personalization.accentColor.description")}</p>
              </div>
            </div>
            <div className="accent-picker">
              <input
                type="color"
                className="accent-picker__input"
                value={personalization.accentColor ?? "#a78bfa"}
                onChange={(e) => void setAccentColor(e.target.value)}
                aria-label={t("settings.personalization.accentColor.title")}
              />
              <span className="accent-picker__hex">{personalization.accentColor ?? t("settings.personalization.accentColor.default")}</span>
              {personalization.accentColor && (
                <button
                  className="button button--ghost"
                  onClick={() => void setAccentColor(null)}
                  type="button"
                >
                  {t("settings.personalization.accentColor.reset")}
                </button>
              )}
            </div>
          </div>

          <div className="identity-card identity-card--wide">
            <div className="identity-card__header">
              <Palette size={18} />
              <div>
                <strong>Future Style Lab</strong>
                <p className="muted">Mehr Optionen für die Zukunft: Presets, Dichte, Oberfläche, Motion und Feintuning.</p>
              </div>
            </div>

            <div className="style-lab-actions">
              <button
                className="button button--secondary button--small"
                type="button"
                onClick={handleExportStyle}
                title="Export current style as JSON"
              >
                <Download size={16} />
                Export
              </button>
              <label className="button button--secondary button--small" style={{ cursor: "pointer" }}>
                <Upload size={16} />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportStyle}
                  style={{ display: "none" }}
                />
              </label>
              {importError && (
                <div className="style-import-error">
                  {importError}
                </div>
              )}
            </div>

            <div className="style-preset-grid">
              {LAUNCHER_STYLE_PRESET_IDS.map((presetId) => {
                const active = personalization.style.presetId === presetId;
                const preset = stylePresetLabels[presetId] ?? { name: presetId, description: "" };
                return (
                  <div key={presetId} className="style-preset-container">
                    <button
                      className={`style-preset-option ${active ? "is-active" : ""}`}
                      type="button"
                      onClick={() => {
                        void updateStylePreferences({ presetId });
                      }}
                      aria-pressed={active}
                    >
                      <strong>{preset.name}</strong>
                      <small>{preset.description}</small>
                    </button>
                    <button
                      className="style-preset-reset"
                      type="button"
                      onClick={() => handleResetPreset(presetId)}
                      title={`Reset ${preset.name} to defaults`}
                      aria-label={`Reset ${preset.name}`}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="style-controls-grid">
              <label className="identity-field">
                <span>Font</span>
                <select
                  value={personalization.style.fontStyle}
                  onChange={(event) => {
                    void updateStylePreferences({ fontStyle: event.target.value as LauncherStylePreferences["fontStyle"] });
                  }}
                >
                  {LAUNCHER_FONT_STYLE_IDS.map((fontStyle) => (
                    <option key={fontStyle} value={fontStyle}>
                      {fontStyleLabels[fontStyle] ?? fontStyle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="identity-field">
                <span>Density</span>
                <select
                  value={personalization.style.density}
                  onChange={(event) => {
                    void updateStylePreferences({ density: event.target.value as LauncherStylePreferences["density"] });
                  }}
                >
                  {LAUNCHER_DENSITY_IDS.map((density) => (
                    <option key={density} value={density}>
                      {density === "compact" ? "Compact" : "Cozy"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="identity-field">
                <span>Surface</span>
                <select
                  value={personalization.style.surfaceStyle}
                  onChange={(event) => {
                    void updateStylePreferences({ surfaceStyle: event.target.value as LauncherStylePreferences["surfaceStyle"] });
                  }}
                >
                  {LAUNCHER_SURFACE_STYLE_IDS.map((surfaceStyle) => (
                    <option key={surfaceStyle} value={surfaceStyle}>
                      {surfaceStyle === "glass" ? "Glass" : surfaceStyle === "solid" ? "Solid" : "Soft"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="identity-field">
                <span>Motion</span>
                <select
                  value={personalization.style.motionLevel}
                  onChange={(event) => {
                    void updateStylePreferences({ motionLevel: event.target.value as LauncherStylePreferences["motionLevel"] });
                  }}
                >
                  {LAUNCHER_MOTION_LEVEL_IDS.map((motionLevel) => (
                    <option key={motionLevel} value={motionLevel}>
                      {motionLevel === "calm" ? "Calm" : motionLevel === "expressive" ? "Expressive" : "Normal"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="style-slider-grid">
              <label className="identity-field">
                <span>Radius: {personalization.style.radiusScale.toFixed(2)}x</span>
                <input
                  type="range"
                  min={0.85}
                  max={1.45}
                  step={0.01}
                  value={personalization.style.radiusScale}
                  onChange={(event) => {
                    void updateStylePreferences({ radiusScale: Number(event.target.value) });
                  }}
                />
              </label>

              <label className="identity-field">
                <span>Contrast: {personalization.style.contrastBoost.toFixed(2)}x</span>
                <input
                  type="range"
                  min={0.9}
                  max={1.3}
                  step={0.01}
                  value={personalization.style.contrastBoost}
                  onChange={(event) => {
                    void updateStylePreferences({ contrastBoost: Number(event.target.value) });
                  }}
                />
              </label>
            </div>
          </div>

          <div className="identity-card identity-card--wide">
            <div className="identity-card__header">
              <Monitor size={18} />
              <div>
                <strong>{t("settings.personalization.colorMode.title")}</strong>
                <p className="muted">{t("settings.personalization.colorMode.description")}</p>
              </div>
            </div>
            <div className="color-mode-picker" role="radiogroup" aria-label={t("settings.personalization.colorMode.title")}>
              {([
                { value: "system", icon: Monitor },
                { value: "dark", icon: Moon },
                { value: "light", icon: Sun }
              ] as const).map((option) => {
                const Icon = option.icon;
                const active = colorMode === option.value;
                return (
                  <button
                    key={option.value}
                    className={`color-mode-option ${active ? "is-active" : ""}`}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setColorMode(option.value);
                      saveColorMode(option.value);
                    }}
                  >
                    <Icon size={16} />
                    <span>{t(`settings.personalization.colorMode.${option.value}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

        <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">{t("settings.profiles.eyebrow")}</p>
            <h2>{t("settings.profiles.title")}</h2>
            <p className="muted">{t("settings.profiles.description")}</p>
          </div>
          <Users size={18} />
        </div>

        <div className="profiles-list">
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <div key={profile.id} className={`profile-settings-item ${isActive ? "is-active" : ""}`}>
                <LauncherAvatar avatarId={profile.avatarId} size="sm" />
                <div className="profile-settings-item__info">
                  <strong>{profile.displayName}</strong>
                  {isActive && (
                    <small>{t("settings.profiles.active")}</small>
                  )}
                </div>
                <div className="profile-settings-item__actions">
                  {!isActive && (
                    <button
                      className="button button--secondary"
                      onClick={() => void switchProfile(profile.id)}
                      type="button"
                    >
                      {t("settings.profiles.switchTo")}
                    </button>
                  )}
                  {profiles.length > 1 && !isActive && (
                    <button
                      className="icon-button"
                      onClick={() => void deleteProfile(profile.id)}
                      type="button"
                      aria-label={t("profiles.delete", { name: profile.displayName })}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {creatingProfile ? (
          <div className="profile-create-form" style={{ marginTop: "var(--space-4)" }}>
            <label className="identity-field">
              <span>{t("settings.profiles.newNameLabel")}</span>
              <input
                autoFocus
                maxLength={32}
                placeholder={t("profiles.newNamePlaceholder")}
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProfileName.trim()) {
                    void createNewProfile(newProfileName).then(() => {
                      setCreatingProfile(false);
                      setNewProfileName("");
                    });
                  }
                  if (e.key === "Escape") {
                    setCreatingProfile(false);
                    setNewProfileName("");
                  }
                }}
              />
            </label>
            <div className="action-row">
              <button
                className="button button--primary"
                disabled={!newProfileName.trim()}
                onClick={() => {
                  void createNewProfile(newProfileName).then(() => {
                    setCreatingProfile(false);
                    setNewProfileName("");
                  });
                }}
                type="button"
              >
                {t("profiles.create")}
              </button>
              <button
                className="button button--ghost"
                onClick={() => { setCreatingProfile(false); setNewProfileName(""); }}
                type="button"
              >
                {t("common.actions.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="button button--secondary"
            onClick={() => setCreatingProfile(true)}
            style={{ marginTop: "var(--space-4)", width: "100%" }}
            type="button"
          >
            <UserRound size={16} />
            {t("settings.profiles.addProfile")}
          </button>
        )}
      </section>

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
                  {option.isNovelty ? ` / ${t("settings.language.novelty")}` : ""}
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
              {!runningInTauri ? <p className="muted">{t("settings.storage.previewHint")}</p> : null}
            </div>
            <button
              className="button button--secondary"
              onClick={() => {
                void handleChooseLibraryPath();
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
                  newLibraryPath.trim()
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
                    <button
                      className="button button--ghost"
                      onClick={() => setDefaultLibrary(library.id)}
                      type="button"
                    >
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

      <BackupSection snapshot={snapshot} t={t} />
      </div>
      {isLibraryPathDialogOpen ? (
        <PathInputDialog
          body={t("settings.storage.webPathDialog.body")}
          confirmLabel={t("settings.storage.webPathDialog.confirm")}
          hint={t("settings.storage.webPathDialog.hint")}
          initialValue={newLibraryPath || snapshot.recommendedLibraryPath}
          onClose={() => setIsLibraryPathDialogOpen(false)}
          onConfirm={(path) => {
            applySuggestedLibraryPath(path);
            setIsLibraryPathDialogOpen(false);
          }}
          title={t("settings.storage.webPathDialog.title")}
        />
      ) : null}
    </>
  );
}

function suggestLibraryNameFromPath(path: string, fallbackName: string) {
  const segments = path
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const lastSegment = segments.at(-1);
  return lastSegment || fallbackName;
}

function BackupSection({
  snapshot,
  t
}: {
  snapshot: LauncherSnapshot;
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string;
}) {
  const { locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState(() => getBackupMeta());

  async function doBackup() {
    setBusy(true);
    try {
      await exportBackup(snapshot);
      setMeta(getBackupMeta());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-section">
      <div className="section-toolbar">
        <div>
          <p className="eyebrow">{t("backup.eyebrow")}</p>
          <h2>{t("backup.title")}</h2>
          <p className="muted">{t("backup.description")}</p>
        </div>
        <Database size={18} />
      </div>
      <div className="settings-card">
        <p className="muted">
          {meta.lastBackupAt
            ? t("backup.lastBackup", { date: formatDate(meta.lastBackupAt, locale, t) })
            : t("backup.neverBacked")}
        </p>
        <button
          className="button button--primary"
          disabled={busy}
          onClick={() => void doBackup()}
          type="button"
        >
          <Save size={16} />
          {busy ? t("backup.exporting") : t("backup.exportNow")}
        </button>
      </div>
    </section>
  );
}
