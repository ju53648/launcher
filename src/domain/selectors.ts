import type { ContentView, InstallJob, LauncherSnapshot } from "./types";

export interface ActivityEvent {
  id: string;
  item: ContentView;
  kind: "added" | "installed" | "launched" | "error";
  label: string;
  at: string;
}

export function getDiscoverableItems(snapshot: LauncherSnapshot) {
  return snapshot.items.filter((item) => item.state.discoverable);
}

export function getLibraryItems(snapshot: LauncherSnapshot) {
  return snapshot.items.filter((item) => item.state.added);
}

export function getInstalledItems(snapshot: LauncherSnapshot) {
  return snapshot.items.filter((item) => item.state.installed);
}

export function getActiveJobs(snapshot: LauncherSnapshot) {
  return snapshot.jobs.filter((job) => job.status === "queued" || job.status === "running");
}

export function getQueuedJobs(snapshot: LauncherSnapshot) {
  return snapshot.jobs.filter((job) => job.status === "queued");
}

export function getFinishedJobs(snapshot: LauncherSnapshot) {
  return snapshot.jobs
    .filter((job) => job.status !== "queued" && job.status !== "running")
    .sort((left, right) => toTime(right.updatedAt) - toTime(left.updatedAt));
}

export function getRecentlyInstalledItems(snapshot: LauncherSnapshot, limit = 4) {
  return getInstalledItems(snapshot)
    .filter((item) => item.installed?.installedAt)
    .sort((left, right) => {
      return (
        toTime(right.installed?.installedAt ?? null) - toTime(left.installed?.installedAt ?? null)
      );
    })
    .slice(0, limit);
}

export function getRecentlyUsedItems(snapshot: LauncherSnapshot, limit = 4) {
  return getLibraryItems(snapshot)
    .filter((item) => lastUsedAt(item))
    .sort((left, right) => toTime(lastUsedAt(right)) - toTime(lastUsedAt(left)))
    .slice(0, limit);
}

export function buildRecentActivity(snapshot: LauncherSnapshot, limit = 8): ActivityEvent[] {
  const events = getLibraryItems(snapshot).flatMap((item) => {
    const activity: ActivityEvent[] = [];
    if (item.collectionEntry?.addedAt) {
      activity.push({
        id: `${item.catalog.id}:added:${item.collectionEntry.addedAt}`,
        item,
        kind: "added",
        label: "Added to Library",
        at: item.collectionEntry.addedAt
      });
    }
    if (item.installed?.installedAt) {
      activity.push({
        id: `${item.catalog.id}:installed:${item.installed.installedAt}`,
        item,
        kind: "installed",
        label:
          item.availableUpdate?.currentVersion && item.availableUpdate.currentVersion !== item.installed.installedVersion
            ? "Updated locally"
            : "Installed locally",
        at: item.installed.installedAt
      });
    }
    const usedAt = lastUsedAt(item);
    if (usedAt) {
      activity.push({
        id: `${item.catalog.id}:launched:${usedAt}`,
        item,
        kind: "launched",
        label: "Opened recently",
        at: usedAt
      });
    }
    if (item.collectionEntry?.lastErrorAt) {
      activity.push({
        id: `${item.catalog.id}:error:${item.collectionEntry.lastErrorAt}`,
        item,
        kind: "error",
        label: "Needs attention",
        at: item.collectionEntry.lastErrorAt
      });
    }
    return activity;
  });

  return events.sort((left, right) => toTime(right.at) - toTime(left.at)).slice(0, limit);
}

export function getShopCategories(snapshot: LauncherSnapshot) {
  return Array.from(
    new Set(
      getDiscoverableItems(snapshot)
        .flatMap((item) => item.catalog.categories)
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));
}

export function getShopTags(snapshot: LauncherSnapshot, limit = 12) {
  const frequencies = new Map<string, number>();
  for (const item of getDiscoverableItems(snapshot)) {
    for (const tag of item.catalog.tags) {
      frequencies.set(tag, (frequencies.get(tag) ?? 0) + 1);
    }
  }

  return [...frequencies.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function getRecommendedItems(snapshot: LauncherSnapshot, limit = 4) {
  const libraryItems = getLibraryItems(snapshot);
  const discoverableItems = getDiscoverableItems(snapshot).filter((item) => !item.state.added);
  if (libraryItems.length === 0) {
    return [];
  }

  const tagWeights = new Map<string, number>();
  const categoryWeights = new Map<string, number>();
  const ownedTypes = new Set(libraryItems.map((item) => item.catalog.itemType));

  for (const item of libraryItems) {
    for (const tag of item.catalog.tags) {
      tagWeights.set(tag, (tagWeights.get(tag) ?? 0) + 1);
    }
    for (const category of item.catalog.categories) {
      categoryWeights.set(category, (categoryWeights.get(category) ?? 0) + 1);
    }
  }

  return discoverableItems
    .map((item) => ({
      item,
      score:
        item.catalog.tags.reduce((total, tag) => total + (tagWeights.get(tag) ?? 0), 0) * 2 +
        item.catalog.categories.reduce(
          (total, category) => total + (categoryWeights.get(category) ?? 0),
          0
        ) +
        (ownedTypes.has(item.catalog.itemType) ? 1 : 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.item.catalog.name.localeCompare(right.item.catalog.name)
    )
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function getPrimaryDownload(snapshot: LauncherSnapshot): InstallJob | null {
  return getActiveJobs(snapshot).sort((left, right) => toTime(left.startedAt) - toTime(right.startedAt))[0] ?? null;
}

function lastUsedAt(item: ContentView) {
  return item.collectionEntry?.lastUsedAt ?? item.installed?.lastLaunchedAt ?? null;
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  return new Date(value).getTime();
}
