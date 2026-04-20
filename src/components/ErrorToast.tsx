import { X } from "lucide-react";

import type { LauncherError } from "../domain/types";

export function ErrorToast({ error, onClose }: { error: LauncherError; onClose: () => void }) {
  return (
    <div className="error-toast" role="alert">
      <div>
        <strong>{error.code ?? "Launcher error"}</strong>
        <p>{error.message}</p>
      </div>
      <button className="icon-button" onClick={onClose} type="button" aria-label="Dismiss error">
        <X size={16} />
      </button>
    </div>
  );
}
