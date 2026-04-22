import { ExternalLink, MessageCircle, Play } from "lucide-react";

import { useI18n } from "../i18n";
import { socialPlatforms } from "./socialsConfig";

const sectionOrder = ["community", "content"] as const;

export function SocialsView() {
  const { t } = useI18n();

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
      </section>

      {sections.map(({ section, items }) => (
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
    </div>
  );
}

function renderPlatformIcon(platformId: "discord" | "youtube") {
  if (platformId === "discord") {
    return <MessageCircle size={22} />;
  }

  return <Play size={22} />;
}
