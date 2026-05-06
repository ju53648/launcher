export interface LibraryGroup {
  id: string;
  name: string;
  color: string;
  itemIds: string[];
}

const STORAGE_KEY = "lumorix.library.groups";

function resolveStorageKey(profileId?: string): string {
  return profileId ? `${STORAGE_KEY}:${profileId}` : STORAGE_KEY;
}

export function loadLibraryGroups(profileId?: string): LibraryGroup[] {
  try {
    const scopedRaw = window.localStorage.getItem(resolveStorageKey(profileId));
    const raw = scopedRaw ?? window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryGroup[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLibraryGroups(groups: LibraryGroup[], profileId?: string): void {
  try {
    window.localStorage.setItem(resolveStorageKey(profileId), JSON.stringify(groups));
  } catch {
    // ignore quota errors
  }
}

export function createLibraryGroup(name: string): LibraryGroup {
  const colors = ["#a78bfa", "#f472b6", "#34d399", "#60a5fa", "#fbbf24", "#fb923c"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim().slice(0, 40),
    color,
    itemIds: []
  };
}
