import { Check, FolderOpen, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { useI18n } from "../i18n";
import { chooseDirectory } from "../services/tauri";
import { useLauncher } from "../store/LauncherStore";

export function OnboardingView() {
  const { t } = useI18n();
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
            <strong>{t("common.brandName")}</strong>
            <small>{t("common.brandProduct")}</small>
          </span>
        </div>

        <div className="onboarding__copy">
          <p className="eyebrow">{t("onboarding.eyebrow")}</p>
          <h1>{t("onboarding.title")}</h1>
          <p>{t("onboarding.body")}</p>
        </div>

        <div className="setup-path">
          <span>{t("common.labels.primaryLibrary")}</span>
          <strong>{targetPath}</strong>
          <div className="setup-path__actions">
            <button
              className="button button--secondary"
              onClick={async () => {
                const path = await chooseDirectory({
                  title: t("common.actions.chooseFolder"),
                  prompt: t("common.labels.path"),
                  defaultPath: snapshot.recommendedLibraryPath
                });
                if (path) setSelectedPath(path);
              }}
              type="button"
            >
              <FolderOpen size={16} />
              {t("common.actions.chooseFolder")}
            </button>
            <button className="button button--ghost" onClick={() => setSelectedPath(null)} type="button">
              {t("common.actions.useRecommended")}
            </button>
          </div>
        </div>

        <div className="privacy-points">
          {[
            t("onboarding.privacyPoints.config"),
            t("onboarding.privacyPoints.libraries"),
            t("onboarding.privacyPoints.updates")
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
          {t("common.actions.enterLumorix")}
        </button>
      </section>
    </main>
  );
}
