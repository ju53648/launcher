export const LAUNCHER_THEME_IDS = ["aurora", "sunset", "ocean"] as const;
export const LAUNCHER_AVATAR_IDS = ["signal", "ember", "scout", "nova"] as const;

export type LauncherThemeId = (typeof LAUNCHER_THEME_IDS)[number];
export type LauncherAvatarId = (typeof LAUNCHER_AVATAR_IDS)[number];

export const DISPLAY_NAME_COOLDOWN_DAYS = 30;

export function isLauncherThemeId(value: unknown): value is LauncherThemeId {
  return typeof value === "string" && LAUNCHER_THEME_IDS.includes(value as LauncherThemeId);
}

export function isLauncherAvatarId(value: unknown): value is LauncherAvatarId {
  return typeof value === "string" && LAUNCHER_AVATAR_IDS.includes(value as LauncherAvatarId);
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export const PROFILES_STORAGE_KEY = "lumorix.launcher.profiles";
export const ACTIVE_PROFILE_KEY = "lumorix.launcher.activeProfile";

export interface Profile {
  id: string;
  displayName: string;
  avatarId: LauncherAvatarId;
  themeId: LauncherThemeId;
  favoriteItemId: string | null;
  createdAt: string;
}

export interface ProfilesState {
  profiles: Profile[];
  activeProfileId: string;
}

export function createProfile(
  displayName: string,
  avatarId: LauncherAvatarId = "signal",
  themeId: LauncherThemeId = "aurora"
): Profile {
  return {
    id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    displayName: displayName.trim().slice(0, 32),
    avatarId,
    themeId,
    favoriteItemId: null,
    createdAt: new Date().toISOString()
  };
}

export function loadProfilesState(): ProfilesState | null {
  if (typeof window === "undefined") return null;
  try {
    const profilesRaw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    const activeRaw = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!profilesRaw) return null;
    const profiles = JSON.parse(profilesRaw) as Profile[];
    if (!Array.isArray(profiles) || profiles.length === 0) return null;
    const activeProfileId = activeRaw && profiles.some((p) => p.id === activeRaw)
      ? activeRaw
      : profiles[0].id;
    return { profiles, activeProfileId };
  } catch {
    return null;
  }
}

export function saveProfilesState(profiles: Profile[], activeProfileId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  } catch {
    // storage quota or unavailable — silently ignore
  }
}