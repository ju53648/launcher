import { Check, FolderOpen, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { PathInputDialog } from "../components/PathInputDialog";
import { SUPPORTED_LOCALES, useI18n } from "../i18n";
import { chooseDirectory, isTauriRuntime } from "../services/tauri";
import { useLauncher } from "../store/LauncherStore";

export function OnboardingView() {
  const { t, locale, setLocale } = useI18n();
  const { snapshot, completeOnboarding, busyAction } = useLauncher();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isPathDialogOpen, setIsPathDialogOpen] = useState(false);

  if (!snapshot) return null;

  const recommendedLibraryPath = snapshot.recommendedLibraryPath;
  const targetPath = selectedPath ?? recommendedLibraryPath;
  const runningInTauri = isTauriRuntime();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || busyAction === "complete-onboarding" || isPathDialogOpen) {
        return;
      }
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLButtonElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      void completeOnboarding(selectedPath);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busyAction, completeOnboarding, isPathDialogOpen, selectedPath]);

  async function handleChoosePath() {
    if (!runningInTauri) {
      setIsPathDialogOpen(true);
      return;
    }

    const path = await chooseDirectory({
      title: t("common.actions.chooseFolder"),
      prompt: t("common.labels.path"),
      defaultPath: recommendedLibraryPath
    });
    if (path) {
      setSelectedPath(path);
    }
  }

  return (
    <>
      <main className="onboarding">
        <section className="onboarding__panel">
          <div className="brand onboarding__brand">
            <span className="brand__mark">LX</span>
            <span>
              <strong>{t("common.brandName")}</strong>
              <small>{t("common.brandProduct")}</small>
            </span>
          </div>

          <div className="onboarding__lang-picker">
            {SUPPORTED_LOCALES.map((l) => (
              <button
                key={l}
                className={`button button--ghost onboarding__lang-btn${locale === l ? " onboarding__lang-btn--active" : ""}`}
                onClick={() => setLocale(l)}
                type="button"
              >
                {t(`common.languages.${l}`)}
              </button>
            ))}
          </div>

          <div className="onboarding__copy">
            <p className="eyebrow">{t("onboarding.eyebrow")}</p>
            <h1>{t("onboarding.title")}</h1>
            <p>{t("onboarding.body")}</p>
          </div>

          <div className="setup-path">
            <span>{t("common.labels.primaryLibrary")}</span>
            <strong>{targetPath}</strong>
            {!runningInTauri ? (
              <p className="setup-path__hint">{t("onboarding.webPathDialog.hint")}</p>
            ) : null}
            <div className="setup-path__actions">
              <button
                className="button button--secondary"
                onClick={() => {
                  void handleChoosePath();
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
      {isPathDialogOpen ? (
        <PathInputDialog
          body={t("onboarding.webPathDialog.body")}
          confirmLabel={t("onboarding.webPathDialog.confirm")}
          hint={t("onboarding.webPathDialog.hint")}
          initialValue={targetPath}
          onClose={() => setIsPathDialogOpen(false)}
          onConfirm={(path) => {
            setSelectedPath(path);
            setIsPathDialogOpen(false);
          }}
          title={t("onboarding.webPathDialog.title")}
        />
      ) : null}
    </>
  );
}
