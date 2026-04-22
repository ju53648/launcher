import { getTagCategory, TAG_CATEGORY_ORDER } from "./tags";
import type {
  ContentView,
  InstallJob,
  ItemAction,
  LauncherSnapshot,
  TagCategoryId
} from "./types";

export type GameStatus = "notInstalled" | "installed" | "updateAvailable" | "broken";

export interface ActivityEvent {
  id: string;
  item: ContentView;
  kind: "added" | "installed" | "updated" | "launched" | "error";
  at: string;
}

export interface RecommendationMatch {
  id: string;
  sourceWeight: number;
  itemWeight: number;
  score: number;
}

export interface RecommendationEntry {
  item: ContentView;
  score: number;
  matches: RecommendationMatch[];
}

export interface ShopTagGroup {
  category: TagCategoryId;
  tags: string[];
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
        at: item.collectionEntry.addedAt
      });
    }
    if (item.installed?.installedAt) {
      activity.push({
        id: `${item.catalog.id}:installed:${item.installed.installedAt}`,
        item,
        kind:
          item.availableUpdate?.currentVersion &&
          item.availableUpdate.currentVersion !== item.installed.installedVersion
            ? "updated"
            : "installed",
        at: item.installed.installedAt
      });
    }
    const usedAt = lastUsedAt(item);
    if (usedAt) {
      activity.push({
        id: `${item.catalog.id}:launched:${usedAt}`,
        item,
        kind: "launched",
        at: usedAt
      });
    }
    if (item.collectionEntry?.lastErrorAt) {
      activity.push({
        id: `${item.catalog.id}:error:${item.collectionEntry.lastErrorAt}`,
        item,
        kind: "error",
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

export function getShopTagGroups(snapshot: LauncherSnapshot, limitPerGroup = 6) {
  const grouped = new Map<TagCategoryId, Map<string, number>>();

  for (const category of TAG_CATEGORY_ORDER) {
    grouped.set(category, new Map<string, number>());
  }

  for (const item of getDiscoverableItems(snapshot)) {
    for (const tag of item.catalog.tags) {
      const category = getTagCategory(tag.id);
      if (!category) continue;

      const categoryTags = grouped.get(category);
      if (!categoryTags) continue;
      categoryTags.set(tag.id, (categoryTags.get(tag.id) ?? 0) + tag.weight);
    }
  }

  return TAG_CATEGORY_ORDER.map((category) => ({
    category,
    tags: [...(grouped.get(category)?.entries() ?? [])]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limitPerGroup)
      .map(([tag]) => tag)
  })).filter((group) => group.tags.length > 0);
}

export function getForYouRecommendations(snapshot: LauncherSnapshot, limit = 4) {
  const libraryItems = getLibraryItems(snapshot);
  if (libraryItems.length === 0) {
    return [];
  }

  return recommendItems(
    getDiscoverableItems(snapshot),
    buildTagProfile(libraryItems),
    new Set(libraryItems.map((item) => item.catalog.id)),
    limit
  );
}

export function getBecauseYouPlayedRecommendations(snapshot: LauncherSnapshot, limit = 3) {
  const sourceItem = getRecentlyUsedItems(snapshot, 1)[0] ?? null;
  if (!sourceItem) {
    return { sourceItem: null, recommendations: [] as RecommendationEntry[] };
  }

  const libraryIds = new Set(getLibraryItems(snapshot).map((item) => item.catalog.id));
  return {
    sourceItem,
    recommendations: recommendItems(
      getDiscoverableItems(snapshot),
      buildTagProfile([sourceItem]),
      libraryIds,
      limit
    )
  };
}

export function getSimilarItems(snapshot: LauncherSnapshot, itemId: string, limit = 3) {
  const sourceItem = snapshot.items.find((item) => item.catalog.id === itemId);
  if (!sourceItem) {
    return [];
  }

  return recommendItems(
    getDiscoverableItems(snapshot),
    buildTagProfile([sourceItem]),
    new Set([itemId]),
    limit
  );
}

export function getRecommendedItems(snapshot: LauncherSnapshot, limit = 4) {
  return getForYouRecommendations(snapshot, limit).map((entry) => entry.item);
}

export function getPrimaryDownload(snapshot: LauncherSnapshot): InstallJob | null {
  return (
    getActiveJobs(snapshot).sort((left, right) => toTime(left.startedAt) - toTime(right.startedAt))[0] ??
    null
  );
}

export function getGameStatus(item: ContentView): GameStatus {
  if (isBrokenState(item)) {
    return "broken";
  }

  if (!item.installed) {
    return "notInstalled";
  }

  if (hasUpdateAvailable(item)) {
    return "updateAvailable";
  }

  return "installed";
}

export function getPrimaryGameAction(item: ContentView): Extract<
  ItemAction,
  "install" | "launch" | "update" | "repair"
> {
  const status = getGameStatus(item);

  if (status === "broken") {
    return "repair";
  }
  if (status === "updateAvailable") {
    return "update";
  }
  if (status === "installed") {
    return "launch";
  }
  return "install";
}

function recommendItems(
  candidates: ContentView[],
  profile: Map<string, number>,
  excludedItemIds: Set<string>,
  limit: number
): RecommendationEntry[] {
  if (profile.size === 0) {
    return [];
  }

  return candidates
    .filter((item) => !excludedItemIds.has(item.catalog.id))
    .map((item) => scoreCandidate(item, profile))
    .filter((entry): entry is RecommendationEntry => entry !== null)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.item.catalog.name.localeCompare(right.item.catalog.name)
    )
    .slice(0, limit);
}

function buildTagProfile(items: ContentView[]) {
  const profile = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.catalog.tags) {
      profile.set(tag.id, (profile.get(tag.id) ?? 0) + tag.weight);
    }
  }

  return profile;
}

function scoreCandidate(
  item: ContentView,
  profile: Map<string, number>
): RecommendationEntry | null {
  const matches: RecommendationMatch[] = [];

  for (const tag of item.catalog.tags) {
    const sourceWeight = profile.get(tag.id) ?? 0;
    if (sourceWeight <= 0) {
      continue;
    }

    matches.push({
      id: tag.id,
      sourceWeight,
      itemWeight: tag.weight,
      score: sourceWeight * tag.weight
    });
  }

  matches.sort(
    (left, right) =>
      right.score - left.score ||
      right.itemWeight - left.itemWeight ||
      left.id.localeCompare(right.id)
  );

  const score = matches.reduce((total, match) => total + match.score, 0);
  if (score <= 0) {
    return null;
  }

  return {
    item,
    score,
    matches
  };
}

function lastUsedAt(item: ContentView) {
  return item.collectionEntry?.lastUsedAt ?? item.installed?.lastLaunchedAt ?? null;
}

function hasUpdateAvailable(item: ContentView) {
  if (!item.installed) {
    return false;
  }

  const installedVersion = item.installed.installedVersion;
  const available = item.availableUpdate;

  return (
    item.installState === "updateAvailable" ||
    item.state.updateAvailable ||
    (available !== null &&
      (available.currentVersion !== installedVersion ||
        available.availableVersion !== installedVersion))
  );
}

function isBrokenState(item: ContentView) {
  return (
    item.installState === "error" ||
    item.state.error ||
    item.installed?.status === "broken" ||
    Boolean(item.installed?.lastError)
  );
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  return new Date(value).getTime();
}
