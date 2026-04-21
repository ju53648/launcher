import de from "./content/de.json";
import en from "./content/en.json";
import pl from "./content/pl.json";
import type { ReleaseInfo } from "../releaseInfo";
import type { ContentView, LauncherSnapshot } from "../domain/types";
import type { SupportedLocale } from "./index";

type CanonicalContentLocale = "en" | "de" | "pl";

type LocalizedContent = {
  items: Record<
    string,
    {
      description?: string;
      categories?: string[];
      changelog?: Record<string, string[]>;
    }
  >;
  releaseInfo?: {
    title?: string;
    notes?: string[];
  };
};

const contentDictionaries: Record<CanonicalContentLocale, LocalizedContent> = {
  en: en as LocalizedContent,
  de: de as LocalizedContent,
  pl: pl as LocalizedContent
};

export function localizeSnapshotContent(
  snapshot: LauncherSnapshot | null,
  locale: SupportedLocale
) {
  if (!snapshot) return null;

  return {
    ...snapshot,
    items: snapshot.items.map((item) => localizeContentView(item, locale))
  };
}

export function localizeContentView(item: ContentView, locale: SupportedLocale): ContentView {
  const canonicalLocale: CanonicalContentLocale = locale === "shakespeare" ? "en" : locale;
  const localized = contentDictionaries[canonicalLocale].items[item.catalog.id];
  if (!localized) return item;

  return {
    ...item,
    catalog: {
      ...item.catalog,
      description: localized.description ?? item.catalog.description,
      categories: localized.categories ?? item.catalog.categories
    },
    collectionEntry: item.collectionEntry
      ? {
          ...item.collectionEntry,
          catalog: {
            ...item.collectionEntry.catalog,
            description: localized.description ?? item.collectionEntry.catalog.description,
            categories: localized.categories ?? item.collectionEntry.catalog.categories
          }
        }
      : null,
    manifest: item.manifest
      ? {
          ...item.manifest,
          description: localized.description ?? item.manifest.description,
          categories: localized.categories ?? item.manifest.categories,
          changelog: item.manifest.changelog.map((entry) => ({
            ...entry,
            items: localized.changelog?.[entry.version] ?? entry.items
          }))
        }
      : null,
    availableUpdate: item.availableUpdate
      ? {
          ...item.availableUpdate,
          changelog: item.availableUpdate.changelog.map((entry) => ({
            ...entry,
            items: localized.changelog?.[entry.version] ?? entry.items
          }))
        }
      : null
  };
}

export function localizeReleaseInfo(releaseInfo: ReleaseInfo, locale: SupportedLocale): ReleaseInfo {
  const canonicalLocale: CanonicalContentLocale = locale === "shakespeare" ? "en" : locale;
  const localized = contentDictionaries[canonicalLocale].releaseInfo;
  return {
    ...releaseInfo,
    title: localized?.title ?? releaseInfo.title,
    notes: localized?.notes ?? releaseInfo.notes
  };
}
