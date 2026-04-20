import { Check, FolderOpen, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { chooseDirectory } from "../services/tauri";
import { useLauncher } from "../store/LauncherStore";

export function OnboardingView() {
  const { snapshot, completeOnboarding, busyAction } = useLauncher();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  if (!snapshot) return null;

  const targetPath = selectedPath ?? snapshot.recommendedLibraryPath;

  return (
    <main className="onboarding">
      <section className="onboarding__panel">
        <div className="brand onboarding__brand">
          <span className="brand__mark">LX</span>
          <span>
            <strong>Lumorix</strong>
            <small>Launcher</small>
          </span>
        </div>

        <div className="onboarding__copy">
          <p className="eyebrow">First setup</p>
          <h1>Your games stay on your machine.</h1>
          <p>
            Choose where Lumorix installs games. No account, no cloud lock-in, no hidden
            analytics. Network access is reserved for manifests, downloads and explicit update
            checks.
          </p>
        </div>

        <div className="setup-path">
          <span>Primary library</span>
          <strong>{targetPath}</strong>
          <div className="setup-path__actions">
            <button
              className="button button--secondary"
              onClick={async () => {
                const path = await chooseDirectory();
                if (path) setSelectedPath(path);
              }}
              type="button"
            >
              <FolderOpen size={16} />
              Choose folder
            </button>
            <button className="button button--ghost" onClick={() => setSelectedPath(null)} type="button">
              Use recommended
            </button>
          </div>
        </div>

        <div className="privacy-points">
          {[
            "Local config and install metadata",
            "Multiple libraries can be added later",
            "Optional, user-triggered update checks"
          ].map((item) => (
            <span key={item}>
              <Check size={16} />
              {item}
            </span>
          ))}
        </div>

        <button
          className="button button--primary button--wide"
          disabled={busyAction === "complete-onboarding"}
          onClick={() => completeOnboarding(selectedPath)}
          type="button"
        >
          <ShieldCheck size={17} />
          Enter Lumorix
        </button>
      </section>
    </main>
  );
}
