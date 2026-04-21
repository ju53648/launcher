import { X } from "lucide-react";

import type { LauncherError } from "../domain/types";
import { useI18n } from "../i18n";

export function ErrorToast({ error, onClose }: { error: LauncherError; onClose: () => void }) {
  const { t } = useI18n();

  return (
    <div className="error-toast" role="alert">
      <div>
        <strong>{error.code ? t(`errors.codes.${error.code}`) : t("errors.title")}</strong>
        <p>{error.message}</p>
      </div>
      <button className="icon-button" onClick={onClose} type="button" aria-label={t("errors.dismiss")}>
        <X size={16} />
      </button>
    </div>
  );
}
