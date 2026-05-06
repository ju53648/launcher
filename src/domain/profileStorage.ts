import { ACTIVE_PROFILE_KEY } from "./personalization";

const DEFAULT_PROFILE_ID = "default";

export function getActiveProfileIdFromStorage(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE_ID;
  }
  const value = window.localStorage.getItem(ACTIVE_PROFILE_KEY)?.trim();
  return value || DEFAULT_PROFILE_ID;
}

export function getProfileScopedStorageKey(baseKey: string, profileId?: string): string {
  const resolved = profileId?.trim() || getActiveProfileIdFromStorage();
  return `${baseKey}:${resolved}`;
}
