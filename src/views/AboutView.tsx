import { Download, ExternalLink, ShieldCheck } from "lucide-react";

import { LauncherUpdatePanel } from "../components/LauncherUpdatePanel";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../domain/format";
import { localizeReleaseInfo } from "../i18n/content";
import { useI18n } from "../i18n";
import { releaseInfo } from "../releaseInfo";
import { useLauncher } from "../store/LauncherStore";

export function AboutView() {
  const { locale, t } = useI18n();
  const { snapshot, busyAction, checkLauncherUpdates, installLauncherUpdate, updateProgress } =
    useLauncher();
  if (!snapshot) return null;
  const localizedReleaseInfo = localizeReleaseInfo(releaseInfo, locale);

  return (
    <div className="about-layout">
      <section className="about-hero">
        <div className="brand about-hero__brand">
          <span className="brand__mark">LX</span>
          <span>
            <strong>{t("common.brandName")}</strong>
            <small>{`${t("common.brandProduct")} v${snapshot.appVersion}`}</small>
          </span>
        </div>
        <p>{t("about.hero.body")}</p>
        <div className="action-row">
          <button
            className="button button--secondary"
            disabled={
              busyAction === "check-launcher-update" || busyAction === "install-launcher-update"
            }
            onClick={checkLauncherUpdates}
            type="button"
          >
            {busyAction === "check-launcher-update"
              ? t("common.actions.checkingShort")
              : t("common.actions.checkForUpdates")}
          </button>
          <button
            className="button button--primary"
            disabled={
              busyAction === "check-launcher-update" || busyAction === "install-launcher-update"
            }
            onClick={installLauncherUpdate}
            type="button"
          >
            <Download size={16} />
            {busyAction === "install-launcher-update"
              ? t("common.actions.updatingShort")
              : t("common.actions.downloadAndInstall")}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">{t("about.updateState.eyebrow")}</p>
            <h2>{t("about.updateState.title")}</h2>
          </div>
          <StatusBadge
            status={snapshot.launcherUpdate.updateAvailable ? "updateAvailable" : "installed"}
          />
        </div>
        <dl className="spec-list">
          <div>
            <dt>{t("common.labels.current")}</dt>
            <dd>v{snapshot.launcherUpdate.currentVersion}</dd>
          </div>
          <div>
            <dt>{t("common.labels.latest")}</dt>
            <dd>{snapshot.launcherUpdate.latestVersion ?? t("common.noRemoteSource")}</dd>
          </div>
          <div>
            <dt>{t("common.labels.checked")}</dt>
            <dd>{formatDate(snapshot.launcherUpdate.checkedAt, locale, t)}</dd>
          </div>
        </dl>
        {snapshot.launcherUpdate.releaseUrl && (
          <a
            className="button button--secondary"
            href={snapshot.launcherUpdate.releaseUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
            {t("common.labels.releaseNotes")}
          </a>
        )}
        {snapshot.launcherUpdate.error && (
          <p className="field-error">{snapshot.launcherUpdate.error}</p>
        )}
        <LauncherUpdatePanel progress={updateProgress} />
      </section>

      <section className="settings-section">
        <div>
          <p className="eyebrow">{t("about.productChangelog.eyebrow")}</p>
          <h2>v{localizedReleaseInfo.version}</h2>
        </div>
        <div className="changelog-entry">
          <strong>{localizedReleaseInfo.title}</strong>
          <span>{formatDate(localizedReleaseInfo.date, locale, t)}</span>
          <ul>
            {localizedReleaseInfo.notes.map((note) => (
              <li key={`${localizedReleaseInfo.version}-${note}`}>{note}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="settings-section">
        <div className="privacy-panel">
          <ShieldCheck size={24} />
          <div>
            <strong>{t("about.privacy.title")}</strong>
            <p>{t("about.privacy.body")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
