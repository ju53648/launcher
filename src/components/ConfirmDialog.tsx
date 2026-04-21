import { AlertTriangle, X } from "lucide-react";

import { useI18n } from "../i18n";

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  tone = "danger",
  details,
  onConfirm,
  onClose
}: {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  details?: string[];
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
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
            <AlertTriangle size={18} />
          </span>
          <div>
            <p className="eyebrow">{t("library.removeDialog.eyebrow")}</p>
            <h2 id="confirm-title">{title}</h2>
            <p>{body}</p>
          </div>
        </div>

        {details?.length ? (
          <div className="confirm-dialog__details">
            {details.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
        ) : null}

        <div className="modal__actions">
          <button className="button button--ghost" onClick={onClose} type="button">
            {t("common.actions.cancel")}
          </button>
          <button
            className={`button ${tone === "danger" ? "button--danger" : "button--primary"}`}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}