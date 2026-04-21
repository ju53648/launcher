import { formatBytes, itemTypeLabel } from "../domain/format";
import { getTagLabel, sortTagsByWeight } from "../domain/tags";
import type { RecommendationEntry } from "../domain/selectors";
import { useI18n } from "../i18n";

export function RecommendationSection({
  eyebrow,
  title,
  description,
  entries,
  onOpen
}: {
  eyebrow: string;
  title: string;
  description?: string;
  entries: RecommendationEntry[];
  onOpen: (itemId: string) => void;
}) {
  const { locale, t } = useI18n();

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="recommendations-panel">
      <div className="section-toolbar">
        <div className="recommendations-panel__copy">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <div className="recommendation-grid">
        {entries.map((entry) => {
          const matchedTags =
            entry.matches.length > 0
              ? entry.matches.map((match) => match.id)
              : sortTagsByWeight(entry.item.catalog.tags).map((tag) => tag.id);
          const visibleTags = matchedTags.slice(0, 3).map((tagId) => getTagLabel(tagId, t));

          return (
            <button
              key={entry.item.catalog.id}
              className="recommendation-card"
              onClick={() => onOpen(entry.item.catalog.id)}
              type="button"
            >
              <small>
                {entry.item.catalog.developer} / {itemTypeLabel(entry.item.catalog.itemType, t)}
              </small>
              <strong>{entry.item.catalog.name}</strong>
              <span>{t("common.labels.matchingTags", { tags: visibleTags.join(" / ") })}</span>
              <div className="recommendation-card__meta">
                <em>{entry.item.manifest ? `v${entry.item.manifest.version}` : t("shop.card.unavailable")}</em>
                <em>{formatBytes(entry.item.manifest?.installSizeBytes ?? 0, locale)}</em>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
