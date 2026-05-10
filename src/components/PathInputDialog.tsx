import { FolderSearch, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "../i18n";

export function PathInputDialog({
  initialValue,
  title,
  body,
  hint,
  confirmLabel,
  onClose,
  onConfirm
}: {
  initialValue: string;
  title: string;
  body: string;
  hint: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (path: string) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const trimmedValue = value.trim();

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal path-input-dialog" role="dialog" aria-modal="true" aria-labelledby="path-dialog-title">
        <button
          className="icon-button modal__close"
          onClick={onClose}
          type="button"
          aria-label={t("accessibility.closeModal")}
        >
          <X size={18} />
        </button>

        <div className="confirm-dialog__header">
          <span className="confirm-dialog__icon">
            <FolderSearch size={18} />
          </span>
          <div className="path-input-dialog__copy">
            <p className="eyebrow">{t("onboarding.eyebrow")}</p>
            <h2 id="path-dialog-title">{title}</h2>
            <p>{body}</p>
          </div>
        </div>

        <label className="path-input-dialog__field">
          <span>{t("common.labels.path")}</span>
          <input
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || !trimmedValue) {
                return;
              }
              event.preventDefault();
              onConfirm(trimmedValue);
            }}
            placeholder={t("common.labels.path")}
            value={value}
          />
        </label>

        <p className="path-input-dialog__hint">{hint}</p>

        <div className="modal__actions">
          <button className="button button--ghost" onClick={onClose} type="button">
            {t("common.actions.cancel")}
          </button>
          <button
            className="button button--primary"
            disabled={!trimmedValue}
            onClick={() => onConfirm(trimmedValue)}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
