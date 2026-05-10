export const LAUNCHER_THEME_IDS = ["aurora", "sunset", "ocean"] as const;
export const LAUNCHER_AVATAR_IDS = ["signal", "ember", "scout", "nova"] as const;
export const LAUNCHER_STYLE_PRESET_IDS = ["future", "midnight", "ice", "retro"] as const;
export const LAUNCHER_FONT_STYLE_IDS = ["jakarta", "rounded", "mono"] as const;
export const LAUNCHER_SURFACE_STYLE_IDS = ["soft", "glass", "solid"] as const;
export const LAUNCHER_DENSITY_IDS = ["cozy", "compact"] as const;
export const LAUNCHER_MOTION_LEVEL_IDS = ["calm", "normal", "expressive"] as const;

export type LauncherThemeId = (typeof LAUNCHER_THEME_IDS)[number];
export type LauncherAvatarId = (typeof LAUNCHER_AVATAR_IDS)[number];
export type LauncherStylePresetId = (typeof LAUNCHER_STYLE_PRESET_IDS)[number];
export type LauncherFontStyleId = (typeof LAUNCHER_FONT_STYLE_IDS)[number];
export type LauncherSurfaceStyleId = (typeof LAUNCHER_SURFACE_STYLE_IDS)[number];
export type LauncherDensityId = (typeof LAUNCHER_DENSITY_IDS)[number];
export type LauncherMotionLevelId = (typeof LAUNCHER_MOTION_LEVEL_IDS)[number];

export interface LauncherStylePreferences {
  version: 1;
  presetId: LauncherStylePresetId;
  fontStyle: LauncherFontStyleId;
  density: LauncherDensityId;
  surfaceStyle: LauncherSurfaceStyleId;
  motionLevel: LauncherMotionLevelId;
  radiusScale: number;
  contrastBoost: number;
}

export const DEFAULT_LAUNCHER_STYLE: LauncherStylePreferences = {
  version: 1,
  presetId: "future",
  fontStyle: "jakarta",
  density: "cozy",
  surfaceStyle: "soft",
  motionLevel: "normal",
  radiusScale: 1,
  contrastBoost: 1
};

export const PRESET_DEFAULTS: Record<LauncherStylePresetId, Partial<LauncherStylePreferences>> = {
  future: { presetId: "future", fontStyle: "jakarta", radiusScale: 1, contrastBoost: 1 },
  midnight: { presetId: "midnight", fontStyle: "mono", radiusScale: 0.95, contrastBoost: 1.1 },
  ice: { presetId: "ice", fontStyle: "rounded", radiusScale: 1.2, contrastBoost: 0.95 },
  retro: { presetId: "retro", fontStyle: "mono", radiusScale: 0.85, contrastBoost: 1.2 }
};

export const DISPLAY_NAME_COOLDOWN_DAYS = 30;

export function isLauncherThemeId(value: unknown): value is LauncherThemeId {
  return typeof value === "string" && LAUNCHER_THEME_IDS.includes(value as LauncherThemeId);
}

export function isLauncherAvatarId(value: unknown): value is LauncherAvatarId {
  return typeof value === "string" && LAUNCHER_AVATAR_IDS.includes(value as LauncherAvatarId);
}

export function isLauncherStylePresetId(value: unknown): value is LauncherStylePresetId {
  return typeof value === "string" && LAUNCHER_STYLE_PRESET_IDS.includes(value as LauncherStylePresetId);
}

export function isLauncherFontStyleId(value: unknown): value is LauncherFontStyleId {
  return typeof value === "string" && LAUNCHER_FONT_STYLE_IDS.includes(value as LauncherFontStyleId);
}

export function isLauncherSurfaceStyleId(value: unknown): value is LauncherSurfaceStyleId {
  return typeof value === "string" && LAUNCHER_SURFACE_STYLE_IDS.includes(value as LauncherSurfaceStyleId);
}

export function isLauncherDensityId(value: unknown): value is LauncherDensityId {
  return typeof value === "string" && LAUNCHER_DENSITY_IDS.includes(value as LauncherDensityId);
}

export function isLauncherMotionLevelId(value: unknown): value is LauncherMotionLevelId {
  return typeof value === "string" && LAUNCHER_MOTION_LEVEL_IDS.includes(value as LauncherMotionLevelId);
}

export function normalizeLauncherStyle(
  value: Partial<LauncherStylePreferences> | null | undefined
): LauncherStylePreferences {
  const radiusScale = typeof value?.radiusScale === "number" ? value.radiusScale : DEFAULT_LAUNCHER_STYLE.radiusScale;
  const contrastBoost = typeof value?.contrastBoost === "number" ? value.contrastBoost : DEFAULT_LAUNCHER_STYLE.contrastBoost;

  return {
    version: 1,
    presetId: isLauncherStylePresetId(value?.presetId) ? value.presetId : DEFAULT_LAUNCHER_STYLE.presetId,
    fontStyle: isLauncherFontStyleId(value?.fontStyle) ? value.fontStyle : DEFAULT_LAUNCHER_STYLE.fontStyle,
    density: isLauncherDensityId(value?.density) ? value.density : DEFAULT_LAUNCHER_STYLE.density,
    surfaceStyle: isLauncherSurfaceStyleId(value?.surfaceStyle) ? value.surfaceStyle : DEFAULT_LAUNCHER_STYLE.surfaceStyle,
    motionLevel: isLauncherMotionLevelId(value?.motionLevel) ? value.motionLevel : DEFAULT_LAUNCHER_STYLE.motionLevel,
    radiusScale: Math.max(0.85, Math.min(1.45, radiusScale)),
    contrastBoost: Math.max(0.9, Math.min(1.3, contrastBoost))
  };
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export const PROFILES_STORAGE_KEY = "lumorix.launcher.profiles";
export const ACTIVE_PROFILE_KEY = "lumorix.launcher.activeProfile";

export interface Profile {
  id: string;
  displayName: string;
  avatarId: LauncherAvatarId;
  themeId: LauncherThemeId;
  style: LauncherStylePreferences;
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
  themeId: LauncherThemeId = "aurora",
  style?: Partial<LauncherStylePreferences>
): Profile {
  return {
    id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    displayName: displayName.trim().slice(0, 32),
    avatarId,
    themeId,
    style: normalizeLauncherStyle(style),
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
    const parsedProfiles = JSON.parse(profilesRaw) as Profile[];
    if (!Array.isArray(parsedProfiles) || parsedProfiles.length === 0) return null;
    const profiles = parsedProfiles.map((profile) => ({
      ...profile,
      style: normalizeLauncherStyle(profile.style)
    }));
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

// ─── Style Profile Export/Import ─────────────────────────────────────────────

export interface ExportedStyleProfile {
  version: 1;
  profileName: string;
  createdAt: string;
  style: LauncherStylePreferences;
}

export function exportStyleProfile(
  style: LauncherStylePreferences,
  profileName: string = "Lumorix Style"
): string {
  const exported: ExportedStyleProfile = {
    version: 1,
    profileName: profileName.trim().slice(0, 64),
    createdAt: new Date().toISOString(),
    style
  };
  return JSON.stringify(exported, null, 2);
}

export function importStyleProfile(jsonString: string): LauncherStylePreferences {
  try {
    const imported = JSON.parse(jsonString) as unknown;
    
    // Validate structure
    if (!imported || typeof imported !== "object") {
      throw new Error("Invalid JSON format");
    }
    
    const data = imported as Record<string, unknown>;
    
    // Check if it's an ExportedStyleProfile or direct LauncherStylePreferences
    const styleData = data.style ? (data.style as Record<string, unknown>) : data;
    
    // Validate and normalize the style
    const normalized = normalizeLauncherStyle(styleData as Partial<LauncherStylePreferences>);
    return normalized;
  } catch (error) {
    throw new Error(`Failed to import style profile: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}