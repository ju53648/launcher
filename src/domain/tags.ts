import type { Translate } from "./format";
import type { ContentTag, TagCategoryId, TagWeight } from "./types";

type TagInput = ContentTag | string | null | undefined;

export interface TagDefinition {
  id: string;
  category: TagCategoryId;
}

export const TAG_CATEGORY_ORDER: TagCategoryId[] = ["gameplay", "world", "systems"];

export const TAG_DEFINITIONS: Record<string, TagDefinition> = {
  arcade: { id: "arcade", category: "gameplay" },
  survival: { id: "survival", category: "gameplay" },
  horror: { id: "horror", category: "gameplay" },
  shooter: { id: "shooter", category: "gameplay" },
  sandbox: { id: "sandbox", category: "gameplay" },
  open_world: { id: "open_world", category: "world" },
  island: { id: "island", category: "world" },
  forest: { id: "forest", category: "world" },
  city: { id: "city", category: "world" },
  lab: { id: "lab", category: "world" },
  crafting: { id: "crafting", category: "systems" },
  building: { id: "building", category: "systems" },
  exploration: { id: "exploration", category: "systems" },
  utility: { id: "utility", category: "systems" },
  narrative: { id: "narrative", category: "systems" },
  offline: { id: "offline", category: "systems" },
  local_first: { id: "local_first", category: "systems" }
};

export function normalizeTagId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function normalizeTagWeight(value: number | null | undefined): TagWeight {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 3) return 3;
    if (value >= 2) return 2;
  }
  return 1;
}

export function normalizeContentTags(tags: TagInput[] | null | undefined): ContentTag[] {
  if (!Array.isArray(tags)) return [];

  const normalized = new Map<string, ContentTag>();
  for (const entry of tags) {
    const tag = toContentTag(entry);
    if (!tag) continue;

    const existing = normalized.get(tag.id);
    if (!existing || tag.weight > existing.weight) {
      normalized.set(tag.id, tag);
    }
  }

  return sortTagsByWeight([...normalized.values()]);
}

export function sortTagsByWeight(tags: ContentTag[]) {
  return [...tags].sort(
    (left, right) => right.weight - left.weight || left.id.localeCompare(right.id)
  );
}

export function getTagDefinition(id: string) {
  return TAG_DEFINITIONS[normalizeTagId(id)] ?? null;
}

export function getTagCategory(id: string) {
  return getTagDefinition(id)?.category ?? null;
}

export function getTagCategoryLabel(category: TagCategoryId, t: Translate) {
  return t(`taxonomy.categories.${category}`);
}

export function getTagLabel(id: string, t: Translate) {
  return t(`taxonomy.tags.${normalizeTagId(id)}`);
}

function toContentTag(entry: TagInput): ContentTag | null {
  if (!entry) return null;

  if (typeof entry === "string") {
    const id = normalizeTagId(entry);
    return id ? { id, weight: 1 } : null;
  }

  const id = typeof entry.id === "string" ? normalizeTagId(entry.id) : "";
  if (!id) return null;

  return {
    id,
    weight: normalizeTagWeight(entry.weight)
  };
}
