import { Palette, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

import { LAUNCHER_AVATAR_IDS, LAUNCHER_THEME_IDS } from "../domain/personalization";
import { LauncherAvatar } from "./LauncherAvatar";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

export function PersonalizationDialog({
  open,
  required,
  onClose
}: {
  open: boolean;
  required: boolean;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const { personalization, saveDisplayName, setLauncherAvatar, setLauncherTheme } = useLauncher();
  const [displayName, setDisplayName] = useState(personalization.displayName);
  const [themeId, setThemeId] = useState(personalization.themeId);
  const [avatarId, setAvatarId] = useState(personalization.avatarId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDisplayName(personalization.displayName);
    setThemeId(personalization.themeId);
    setAvatarId(personalization.avatarId);
  }, [open, personalization.avatarId, personalization.displayName, personalization.themeId]);

  if (!open) {
    return null;
  }

  const trimmedName = displayName.trim();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName) {
      return;
    }

    setSaving(true);
    try {
      await setLauncherAvatar(avatarId);
      await setLauncherTheme(themeId);
      await saveDisplayName(trimmedName);
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal personalization-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="personalization-title"
      >
        {!required && (
          <button
            className="icon-button modal__close"
            type="button"
            aria-label={t("accessibility.closeModal")}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        )}

        <div className="personalization-dialog__hero">
          <span className="eyebrow">{t("personalizationDialog.eyebrow")}</span>
          <h2 id="personalization-title">{t("personalizationDialog.title")}</h2>
          <p>{t(required ? "personalizationDialog.requiredBody" : "personalizationDialog.body")}</p>
        </div>

        <form className="personalization-dialog__form" onSubmit={handleSubmit}>
          <label className="personalization-field">
            <span>
              <UserRound size={16} />
              {t("personalizationDialog.nameLabel")}
            </span>
            <input
              autoFocus
              maxLength={32}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("personalizationDialog.namePlaceholder")}
            />
          </label>

          <div className="personalization-dialog__themes">
            <div className="personalization-dialog__themes-copy">
              <span>{t("personalizationDialog.avatarLabel")}</span>
              <p>{t("personalizationDialog.avatarBody")}</p>
            </div>
            <div className="avatar-grid">
              {LAUNCHER_AVATAR_IDS.map((option) => {
                const active = option === avatarId;
                return (
                  <button
                    key={option}
                    className={`avatar-option ${active ? "is-active" : ""}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAvatarId(option)}
                  >
                    <LauncherAvatar avatarId={option} size="lg" />
                    <strong>{t(`settings.personalization.avatars.${option}.name`)}</strong>
                    <small>{t(`settings.personalization.avatars.${option}.description`)}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="personalization-dialog__themes">
            <div className="personalization-dialog__themes-copy">
              <span>
                <Palette size={16} />
                {t("personalizationDialog.themeLabel")}
              </span>
              <p>{t("personalizationDialog.themeBody")}</p>
            </div>
            <div className="theme-grid theme-grid--dialog">
              {LAUNCHER_THEME_IDS.map((option) => {
                const active = option === themeId;
                return (
                  <button
                    key={option}
                    className={`theme-option ${active ? "is-active" : ""}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setThemeId(option)}
                  >
                    <span className={`theme-swatch theme-swatch--${option}`} aria-hidden="true" />
                    <strong>{t(`settings.personalization.themes.${option}.name`)}</strong>
                    <small>{t(`settings.personalization.themes.${option}.description`)}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="personalization-dialog__note">
            <Sparkles size={16} />
            <span>{t("personalizationDialog.note")}</span>
          </div>

          <div className="modal__actions">
            {!required && (
              <button className="button button--ghost" type="button" onClick={onClose}>
                {t("common.actions.cancel")}
              </button>
            )}
            <button className="button button--primary" disabled={!trimmedName || saving} type="submit">
              {saving ? t("personalizationDialog.saving") : t("personalizationDialog.confirm")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}