import { ExternalLink, MessageCircle, Play, Rss, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { resolveCatalogImageSrc } from "../domain/media";
import { getProfileScopedStorageKey } from "../domain/profileStorage";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";
import { socialPlatforms } from "./socialsConfig";

const sectionOrder = ["community", "content"] as const;
const SOCIALS_TAB_STORAGE_KEY = "lumorix.socials.lastTab";

export function SocialsView() {
  const { t } = useI18n();
  const { snapshot, activeProfileId } = useLauncher();
  const [tab, setTab] = useState<"community" | "feed">(() => loadStoredSocialsTab(activeProfileId));

  useEffect(() => {
    setTab(loadStoredSocialsTab(activeProfileId));
  }, [activeProfileId]);

  useEffect(() => {
    window.localStorage.setItem(getProfileScopedStorageKey(SOCIALS_TAB_STORAGE_KEY, activeProfileId), tab);
  }, [activeProfileId, tab]);

  const feedEntries = useMemo(() => {
    if (!snapshot) return [];
    const entries: Array<{
      itemId: string;
      itemName: string;
      iconSrc: string | null;
      version: string;
      date: string;
      items: string[];
    }> = [];

    for (const item of snapshot.items) {
      const changelog = item.manifest?.changelog ?? [];
      for (const entry of changelog) {
        entries.push({
          itemId: item.catalog.id,
          itemName: item.catalog.name,
          iconSrc: resolveCatalogImageSrc(
            item.catalog.iconImage,
            item.manifest?.version ?? item.catalog.releaseDate
          ),
          version: entry.version,
          date: entry.date,
          items: entry.items
        });
      }
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  }, [snapshot]);

  const sections = sectionOrder
    .map((section) => ({
      section,
      items: socialPlatforms.filter((platform) => platform.section === section)
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="socials-layout">
      <section className="socials-header">
        <div>
          <p className="eyebrow">{t("socials.header.title")}</p>
          <h2>{t("socials.header.title")}</h2>
          <p>{t("socials.header.subtitle")}</p>
        </div>
        <div className="tab-row">
          <button
            className={`tab-btn ${tab === "community" ? "is-active" : ""}`}
            onClick={() => setTab("community")}
            type="button"
          >
            {t("socials.tabs.community")}
          </button>
          <button
            className={`tab-btn ${tab === "feed" ? "is-active" : ""}`}
            onClick={() => setTab("feed")}
            type="button"
          >
            <Rss size={14} />
            {t("socials.tabs.feed")}
            {feedEntries.length > 0 && <em>{feedEntries.length}</em>}
          </button>
        </div>
      </section>

      {tab === "community" && sections.map(({ section, items }) => (
        <section key={section} className="socials-section">
          <div className="section-toolbar section-toolbar--compact">
            <div>
              <p className="eyebrow">{t(`socials.sections.${section}.eyebrow`)}</p>
              <h3>{t(`socials.sections.${section}.title`)}</h3>
            </div>
          </div>

          <div className="socials-grid">
            {items.map((platform) => (
              <article key={platform.id} className="social-card">
                <div className="social-card__icon">{renderPlatformIcon(platform.id)}</div>
                <div className="social-card__copy">
                  <h4>{platform.name}</h4>
                  <p>{platform.description}</p>
                </div>
                <a
                  className="button button--secondary"
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                  {t("common.actions.open")}
                </a>
              </article>
            ))}
          </div>
        </section>
      ))}

      {tab === "feed" && (
        <section className="feed-section">
          {feedEntries.length === 0 ? (
            <p className="muted">{t("feed.empty")}</p>
          ) : (
            <div className="feed-timeline">
              {feedEntries.map((entry, i) => (
                <div key={`${entry.itemId}-${entry.version}-${i}`} className="feed-entry">
                  <div className="feed-entry__aside">
                    {entry.iconSrc ? (
                      <img src={entry.iconSrc} alt="" className="feed-entry__icon" />
                    ) : (
                      <span className="feed-entry__icon feed-entry__icon--fallback">
                        {entry.itemName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="feed-entry__line" />
                  </div>
                  <div className="feed-entry__body">
                    <div className="feed-entry__meta">
                      <strong>{entry.itemName}</strong>
                      <span className="badge">
                        <Tag size={11} />
                        v{entry.version}
                      </span>
                      <span className="muted">{entry.date}</span>
                    </div>
                    <ul className="feed-entry__list">
                      {entry.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function loadStoredSocialsTab(activeProfileId: string): "community" | "feed" {
  const stored =
    window.localStorage.getItem(getProfileScopedStorageKey(SOCIALS_TAB_STORAGE_KEY, activeProfileId)) ??
    window.localStorage.getItem(SOCIALS_TAB_STORAGE_KEY);
  return stored === "feed" ? "feed" : "community";
}

function renderPlatformIcon(platformId: "discord" | "youtube") {
  if (platformId === "discord") {
    return <MessageCircle size={22} />;
  }

  return <Play size={22} />;
}

