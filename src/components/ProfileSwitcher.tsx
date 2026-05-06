import { Check, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";
import { LauncherAvatar } from "./LauncherAvatar";

export function ProfileSwitcher() {
  const { t } = useI18n();
  const { personalization, profiles, activeProfileId, switchProfile, createNewProfile, deleteProfile } =
    useLauncher();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function handleOpen() {
    setOpen(true);
    setCreating(false);
    setNewName("");
  }

  function handleClose() {
    setOpen(false);
    setCreating(false);
    setNewName("");
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    await createNewProfile(name);
    setCreating(false);
    setNewName("");
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        handleClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={`profile-switcher ${open ? "is-open" : ""}`} ref={rootRef}>
      <button className="profile-pill" onClick={handleOpen} type="button">
        <LauncherAvatar avatarId={personalization.avatarId} size="sm" />
        <span
          className="profile-pill__name"
          title={personalization.displayName || t("profiles.unnamed")}
        >
          {abbreviateName(personalization.displayName || t("profiles.unnamed"))}
        </span>
        <span className="profile-pill__count">{profiles.length}</span>
      </button>

      {open && (
        <div className="profile-popout" role="dialog" aria-modal="false" aria-label={t("profiles.switcherTitle")}>
          <div className="profile-popout__header">
            <div>
              <p className="eyebrow">{t("profiles.eyebrow")}</p>
              <h3>{t("profiles.switcherTitle")}</h3>
            </div>
            <button className="icon-button" onClick={handleClose} type="button" aria-label={t("common.actions.close")}>
              <X size={16} />
            </button>
          </div>

          <div className="profile-list">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              const canDelete = profiles.length > 1 && !isActive;
              return (
                <div
                  key={profile.id}
                  className={`profile-list__item ${isActive ? "is-active" : ""}`}
                >
                  <button
                    className="profile-list__select"
                    onClick={() => {
                      if (!isActive) void switchProfile(profile.id);
                      setOpen(false);
                    }}
                    type="button"
                  >
                    <LauncherAvatar avatarId={profile.avatarId} size="sm" />
                    <span title={profile.displayName}>{abbreviateName(profile.displayName)}</span>
                    {isActive && <Check size={14} className="profile-list__check" />}
                  </button>
                  {canDelete && (
                    <button
                      className="icon-button profile-list__delete"
                      onClick={() => void deleteProfile(profile.id)}
                      type="button"
                      aria-label={t("profiles.delete", { name: profile.displayName })}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {creating ? (
            <div className="profile-create-form">
              <input
                ref={inputRef}
                autoFocus
                className="profile-create-form__input"
                maxLength={32}
                placeholder={t("profiles.newNamePlaceholder")}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") {
                    setCreating(false);
                    setNewName("");
                  }
                }}
              />
              <div className="action-row">
                <button
                  className="button button--primary"
                  disabled={!newName.trim()}
                  onClick={() => void handleCreate()}
                  type="button"
                >
                  {t("profiles.create")}
                </button>
                <button
                  className="button button--ghost"
                  onClick={() => {
                    setCreating(false);
                    setNewName("");
                  }}
                  type="button"
                >
                  {t("common.actions.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="button button--secondary profile-add-btn"
              onClick={() => setCreating(true)}
              type="button"
            >
              <Plus size={16} />
              {t("profiles.addProfile")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function abbreviateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 18) return trimmed;
  return `${trimmed.slice(0, 12)}...${trimmed.slice(-4)}`;
}
