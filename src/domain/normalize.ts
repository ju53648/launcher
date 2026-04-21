import { normalizeContentTags } from "./tags";
import type {
  CatalogItemRecord,
  CollectionEntry,
  ContentManifest,
  ContentUpdateInfo,
  ContentView,
  LauncherSnapshot
} from "./types";

export function normalizeLauncherSnapshot(snapshot: LauncherSnapshot): LauncherSnapshot {
  return {
    ...snapshot,
    items: snapshot.items.map(normalizeContentView)
  };
}

function normalizeContentView(item: ContentView): ContentView {
  return {
    ...item,
    catalog: normalizeCatalogItemRecord(item.catalog),
    collectionEntry: item.collectionEntry ? normalizeCollectionEntry(item.collectionEntry) : null,
    manifest: item.manifest ? normalizeContentManifest(item.manifest) : null,
    availableUpdate: item.availableUpdate
      ? normalizeContentUpdateInfo(item.availableUpdate)
      : null
  };
}

function normalizeCollectionEntry(entry: CollectionEntry): CollectionEntry {
  return {
    ...entry,
    catalog: normalizeCatalogItemRecord(entry.catalog)
  };
}

function normalizeCatalogItemRecord(record: CatalogItemRecord): CatalogItemRecord {
  return {
    ...record,
    tags: normalizeContentTags(record.tags)
  };
}

function normalizeContentManifest(manifest: ContentManifest): ContentManifest {
  return {
    ...manifest,
    tags: normalizeContentTags(manifest.tags)
  };
}

function normalizeContentUpdateInfo(update: ContentUpdateInfo): ContentUpdateInfo {
  return {
    ...update,
    changelog: [...update.changelog]
  };
}
