import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { localizeSnapshotContent } from "../i18n/content";
import {
  coerceLocale,
  toCanonicalLocale,
  useI18n,
  type SupportedLocale
} from "../i18n";
import { normalizeLauncherSnapshot } from "../domain/normalize";
import type {
  InstallJob,
  LauncherError,
  LauncherSnapshot
} from "../domain/types";
import {
  checkLauncherUpdate,
  downloadAndInstallLauncherUpdate,
  type LauncherUpdateProgress
} from "../services/appUpdater";
import { launcherApi } from "../services/launcherApi";
import {
  DISPLAY_NAME_COOLDOWN_DAYS,
  isLauncherAvatarId,
  isLauncherThemeId,
  type LauncherAvatarId,
  type LauncherThemeId,
  type Profile,
  type ProfilesState,
  createProfile as makeProfile,
  loadProfilesState,
  saveProfilesState
} from "../domain/personalization";

export interface GameRefreshSummary {
  gamesChecked: number;
  updatesFound: number;
  brokenInstallsDetected: number;
  newContentFound: number;
}

export interface GameRefreshFeedback {
  phase: "idle" | "checking" | "completed" | "error";
  checkedAt: string | null;
  summary: GameRefreshSummary | null;
  errorMessage: string | null;
}

export interface LauncherPersonalization {
  displayName: string;
  themeId: LauncherThemeId;
  avatarId: LauncherAvatarId;
  favoriteItemId: string | null;
  nameUpdatedAt: string | null;
  canEditDisplayName: boolean;
  nextDisplayNameChangeAt: string | null;
  accentColor: string | null;
}

interface LauncherContextValue {
  snapshot: LauncherSnapshot | null;
  loading: boolean;
  busyAction: string | null;
  error: LauncherError | null;
  updateProgress: LauncherUpdateProgress;
  gameRefreshFeedback: GameRefreshFeedback;
  personalization: LauncherPersonalization;
  profiles: Profile[];
  activeProfileId: string;
  clearError: () => void;
  refresh: () => Promise<void>;
  saveDisplayName: (name: string) => Promise<void>;
  setLauncherTheme: (themeId: LauncherThemeId) => Promise<void>;
  setLauncherAvatar: (avatarId: LauncherAvatarId) => Promise<void>;
  setFavoriteItem: (itemId: string | null) => Promise<void>;
  setAccentColor: (color: string | null) => Promise<void>;
  createNewProfile: (displayName: string) => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  completeOnboarding: (libraryPath: string | null) => Promise<void>;
  addLibrary: (name: string, path: string) => Promise<void>;
  renameLibrary: (libraryId: string, name: string) => Promise<void>;
  removeLibrary: (libraryId: string) => Promise<void>;
  setDefaultLibrary: (libraryId: string) => Promise<void>;
  addItemToLibrary: (itemId: string) => Promise<void>;
  removeItemFromLibrary: (itemId: string) => Promise<void>;
  updatePreferences: (
    checkLauncherUpdatesOnStart: boolean,
    checkGameUpdatesOnStart: boolean,
    askForLibraryEachInstall: boolean,
    createDesktopShortcuts: boolean,
    keepDownloadCache: boolean
  ) => Promise<void>;
  installItem: (itemId: string, libraryId: string | null) => Promise<InstallJob | null>;
  updateItem: (itemId: string) => Promise<InstallJob | null>;
  repairItem: (itemId: string) => Promise<InstallJob | null>;
  moveInstallItem: (itemId: string, targetLibraryId: string) => Promise<InstallJob | null>;
  uninstallItem: (itemId: string) => Promise<void>;
  launchItem: (itemId: string) => Promise<void>;
  closeItem: (itemId: string) => Promise<void>;
  openInstallFolder: (itemId: string) => Promise<void>;
  checkLauncherUpdates: () => Promise<void>;
  installLauncherUpdate: () => Promise<void>;
  checkItemUpdates: () => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  clearCompletedJobs: () => Promise<void>;
  setLanguagePreference: (language: SupportedLocale) => Promise<void>;
}

const LauncherContext = createContext<LauncherContextValue | undefined>(undefined);

const PERSONALIZATION_STORAGE_KEY = "lumorix.launcher.personalization";
const DISPLAY_NAME_COOLDOWN_MS = DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

interface StoredLauncherPersonalization {
  displayName?: string;
  themeId?: LauncherThemeId;
  avatarId?: LauncherAvatarId;
  favoriteItemId?: string | null;
  nameUpdatedAt?: string | null;
  accentColor?: string | null;
}

export function LauncherProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useI18n();
  const initialLocale = useRef(locale);
  const autoGameRefreshTriggered = useRef(false);
  const [snapshot, setSnapshot] = useState<LauncherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<LauncherError | null>(null);
  const [updateProgress, setUpdateProgress] = useState<LauncherUpdateProgress>({
    status: "idle",
    progress: 0
  });
  const [gameRefreshFeedback, setGameRefreshFeedback] = useState<GameRefreshFeedback>({
    phase: "idle",
    checkedAt: null,
    summary: null,
    errorMessage: null
  });
  const [personalization, setPersonalization] = useState<LauncherPersonalization>(() =>
    hydratePersonalization(loadStoredPersonalization())
  );

  // ─── Profiles ──────────────────────────────────────────────────────────────
  const [profilesState, setProfilesState] = useState<ProfilesState>(() =>
    initProfilesState(loadStoredPersonalization())
  );

  const persistProfilesState = useCallback((next: ProfilesState) => {
    setProfilesState(next);
    saveProfilesState(next.profiles, next.activeProfileId);
  }, []);

  const persistPersonalization = useCallback((next: StoredLauncherPersonalization) => {
    setPersonalization(hydratePersonalization(next));
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const publishSnapshot = useCallback((next: LauncherSnapshot) => {
    setSnapshot(normalizeLauncherSnapshot(next));
  }, []);

  const runSnapshotAction = useCallback(
    async (label: string, action: () => Promise<LauncherSnapshot>) => {
      setBusyAction(label);
      setError(null);
      try {
        const next = await action();
        publishSnapshot(next);
      } catch (caught) {
        setError(normalizeError(caught));
      } finally {
        setBusyAction(null);
      }
    },
    [publishSnapshot]
  );

  const refresh = useCallback(async () => {
    try {
      const next = await launcherApi.getSnapshot();
      publishSnapshot(next);
    } catch (caught) {
      setError(normalizeError(caught));
    }
  }, [publishSnapshot]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      try {
        const next = await launcherApi.bootstrap();
        const configuredLanguage = coerceLocale(next.config.language);
        const effectiveLocale =
          initialLocale.current === "shakespeare" && configuredLanguage === "en"
            ? "shakespeare"
            : configuredLanguage;

        if (next.config.language) {
          setLocale(effectiveLocale);
          if (!cancelled) publishSnapshot(next);
        } else {
          const initialLanguage = toCanonicalLocale(initialLocale.current);
          try {
            const persisted = await launcherApi.setLanguage(initialLanguage);
            if (!cancelled) publishSnapshot(persisted);
          } catch (persistError) {
            console.warn("[launcher] failed to persist initial language", persistError);
            if (!cancelled) {
              publishSnapshot({
                ...next,
                config: {
                  ...next.config,
                  language: initialLanguage
                }
              });
            }
          }
        }
      } catch (caught) {
        if (!cancelled) setError(normalizeError(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!snapshot?.jobs.some((job) => job.status === "queued" || job.status === "running")) {
      return;
    }
    const timer = window.setInterval(() => {
      void refresh();
    }, 700);
    return () => window.clearInterval(timer);
  }, [refresh, snapshot?.jobs]);

  useEffect(() => {
    if (!snapshot?.items.some((item) => item.isRunning)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, 2000);

    return () => window.clearInterval(timer);
  }, [refresh, snapshot?.items]);

  useEffect(() => {
    if (loading || !snapshot || autoGameRefreshTriggered.current) {
      return;
    }

    autoGameRefreshTriggered.current = true;
    if (!snapshot.config.checkGameUpdatesOnStart) {
      return;
    }

    void (async () => {
      const previousSnapshot = snapshot;
      setGameRefreshFeedback({
        phase: "checking",
        checkedAt: null,
        summary: null,
        errorMessage: null
      });

      try {
        const next = await launcherApi.checkItemUpdates();
        const normalizedNext = normalizeLauncherSnapshot(next);
        publishSnapshot(next);

        setGameRefreshFeedback({
          phase: "completed",
          checkedAt: new Date().toISOString(),
          summary: summarizeGameRefresh(previousSnapshot, normalizedNext),
          errorMessage: null
        });
      } catch (caught) {
        const normalized = normalizeError(caught);
        console.warn("[launcher] automatic game update check failed", normalized.message);
        setGameRefreshFeedback({
          phase: "error",
          checkedAt: new Date().toISOString(),
          summary: null,
          errorMessage: normalized.message
        });
      }
    })();
  }, [loading, publishSnapshot, snapshot]);

  const publishUpdateProgress = useCallback((progress: LauncherUpdateProgress) => {
    console.info("[updater]", progress.status, progress.version ?? progress.errorMessage ?? "");
    setUpdateProgress(progress);
  }, []);

  const localizedSnapshot = useMemo(
    () => localizeSnapshotContent(snapshot, locale),
    [snapshot, locale]
  );

  const value = useMemo<LauncherContextValue>(
    () => ({
      snapshot: localizedSnapshot,
      loading,
      busyAction,
      error,
      updateProgress,
      gameRefreshFeedback,
      personalization,
      profiles: profilesState.profiles,
      activeProfileId: profilesState.activeProfileId,
      clearError: () => setError(null),
      refresh,
      saveDisplayName: async (name) => {
        const trimmedName = normalizeDisplayName(name);
        const currentName = personalization.displayName;

        if (!trimmedName) {
          throw new Error("Display name cannot be empty");
        }

        if (
          currentName &&
          currentName !== trimmedName &&
          !personalization.canEditDisplayName
        ) {
          throw new Error("Display name change is currently locked");
        }

        if (currentName === trimmedName) {
          return;
        }

        const nameUpdatedAt = new Date().toISOString();
        persistPersonalization({
          displayName: trimmedName,
          themeId: personalization.themeId,
          avatarId: personalization.avatarId,
          favoriteItemId: personalization.favoriteItemId,
          nameUpdatedAt,
          accentColor: personalization.accentColor
        });
        const updated = profilesState.profiles.map((p) =>
          p.id === profilesState.activeProfileId ? { ...p, displayName: trimmedName } : p
        );
        persistProfilesState({ ...profilesState, profiles: updated });
      },
      setLauncherTheme: async (themeId) => {
        persistPersonalization({
          displayName: personalization.displayName,
          themeId,
          avatarId: personalization.avatarId,
          favoriteItemId: personalization.favoriteItemId,
          nameUpdatedAt: personalization.nameUpdatedAt,
          accentColor: personalization.accentColor
        });
        const updated = profilesState.profiles.map((p) =>
          p.id === profilesState.activeProfileId ? { ...p, themeId } : p
        );
        persistProfilesState({ ...profilesState, profiles: updated });
      },
      setLauncherAvatar: async (avatarId) => {
        persistPersonalization({
          displayName: personalization.displayName,
          themeId: personalization.themeId,
          avatarId,
          favoriteItemId: personalization.favoriteItemId,
          nameUpdatedAt: personalization.nameUpdatedAt,
          accentColor: personalization.accentColor
        });
        const updated = profilesState.profiles.map((p) =>
          p.id === profilesState.activeProfileId ? { ...p, avatarId } : p
        );
        persistProfilesState({ ...profilesState, profiles: updated });
      },
      setFavoriteItem: async (itemId) => {
        const normalized = normalizeFavoriteItemId(itemId);
        persistPersonalization({
          displayName: personalization.displayName,
          themeId: personalization.themeId,
          avatarId: personalization.avatarId,
          favoriteItemId: normalized,
          nameUpdatedAt: personalization.nameUpdatedAt,
          accentColor: personalization.accentColor
        });
        // Keep the active profile in sync
        const updated = profilesState.profiles.map((p) =>
          p.id === profilesState.activeProfileId ? { ...p, favoriteItemId: normalized } : p
        );
        persistProfilesState({ ...profilesState, profiles: updated });
      },
      setAccentColor: async (color) => {
        const normalized = normalizeAccentColor(color);
        persistPersonalization({
          displayName: personalization.displayName,
          themeId: personalization.themeId,
          avatarId: personalization.avatarId,
          favoriteItemId: personalization.favoriteItemId,
          nameUpdatedAt: personalization.nameUpdatedAt,
          accentColor: normalized
        });
      },
      createNewProfile: async (displayName) => {
        const trimmed = displayName.trim().slice(0, 32);
        if (!trimmed) throw new Error("Display name cannot be empty");
        const newProfile = makeProfile(trimmed, personalization.avatarId, personalization.themeId);
        const nextProfiles = [...profilesState.profiles, newProfile];
        persistProfilesState({ profiles: nextProfiles, activeProfileId: newProfile.id });
        persistPersonalization({
          displayName: newProfile.displayName,
          themeId: newProfile.themeId,
          avatarId: newProfile.avatarId,
          favoriteItemId: newProfile.favoriteItemId,
          nameUpdatedAt: newProfile.createdAt
        });
      },
      switchProfile: async (profileId) => {
        const target = profilesState.profiles.find((p) => p.id === profileId);
        if (!target) return;
        // Flush current personalization back into current profile before switching
        const flushed = profilesState.profiles.map((p) =>
          p.id === profilesState.activeProfileId
            ? {
                ...p,
                displayName: personalization.displayName,
                avatarId: personalization.avatarId,
                themeId: personalization.themeId,
                favoriteItemId: personalization.favoriteItemId
              }
            : p
        );
        persistProfilesState({ profiles: flushed, activeProfileId: profileId });
        persistPersonalization({
          displayName: target.displayName,
          themeId: target.themeId,
          avatarId: target.avatarId,
          favoriteItemId: target.favoriteItemId,
          nameUpdatedAt: target.createdAt
        });
      },
      deleteProfile: async (profileId) => {
        if (profilesState.profiles.length <= 1) return;
        const remaining = profilesState.profiles.filter((p) => p.id !== profileId);
        const nextActiveId =
          profilesState.activeProfileId === profileId
            ? remaining[0].id
            : profilesState.activeProfileId;
        persistProfilesState({ profiles: remaining, activeProfileId: nextActiveId });
        if (profilesState.activeProfileId === profileId) {
          const next = remaining.find((p) => p.id === nextActiveId)!;
          persistPersonalization({
            displayName: next.displayName,
            themeId: next.themeId,
            avatarId: next.avatarId,
            favoriteItemId: next.favoriteItemId,
            nameUpdatedAt: next.createdAt
          });
        }
      },
      setLanguagePreference: async (language) => {
        const previousLocale = locale;
        setLocale(language);
        setBusyAction("set-language");
        setError(null);
        try {
          const next = await launcherApi.setLanguage(toCanonicalLocale(language));
          publishSnapshot(next);
        } catch (caught) {
          setLocale(previousLocale);
          setError(normalizeError(caught));
        } finally {
          setBusyAction(null);
        }
      },
      completeOnboarding: (libraryPath) =>
        runSnapshotAction("complete-onboarding", () =>
          launcherApi.completeOnboarding(libraryPath)
        ),
      addLibrary: (name, path) =>
        runSnapshotAction("add-library", () => launcherApi.addLibrary(name, path)),
      renameLibrary: (libraryId, name) =>
        runSnapshotAction("rename-library", () => launcherApi.renameLibrary(libraryId, name)),
      removeLibrary: (libraryId) =>
        runSnapshotAction("remove-library", () => launcherApi.removeLibrary(libraryId)),
      setDefaultLibrary: (libraryId) =>
        runSnapshotAction("set-default-library", () => launcherApi.setDefaultLibrary(libraryId)),
      addItemToLibrary: (itemId) =>
        runSnapshotAction("add-item-to-library", () => launcherApi.addItemToLibrary(itemId)),
      removeItemFromLibrary: (itemId) =>
        runSnapshotAction("remove-item-from-library", () => launcherApi.removeItemFromLibrary(itemId)),
      updatePreferences: (
        checkLauncherUpdatesOnStart,
        checkGameUpdatesOnStart,
        askForLibraryEachInstall,
        createDesktopShortcuts,
        keepDownloadCache
      ) =>
        runSnapshotAction("update-preferences", () =>
          launcherApi.updatePreferences(
            checkLauncherUpdatesOnStart,
            checkGameUpdatesOnStart,
            askForLibraryEachInstall,
            createDesktopShortcuts,
            keepDownloadCache
          )
        ),
      installItem: async (itemId, libraryId) =>
        runJobAction("install-item", () => launcherApi.startInstallItem(itemId, libraryId)),
      updateItem: async (itemId) =>
        runJobAction("update-item", () => launcherApi.startUpdateItem(itemId)),
      repairItem: async (itemId) =>
        runJobAction("repair-item", () => launcherApi.repairItem(itemId)),
      moveInstallItem: async (itemId, targetLibraryId) =>
        runJobAction("move-install", () => launcherApi.moveInstallItem(itemId, targetLibraryId)),
      uninstallItem: (itemId) =>
        runSnapshotAction("uninstall-item", () => launcherApi.uninstallItem(itemId)),
      launchItem: (itemId) => runCommandAction("launch-item", () => launcherApi.launchItem(itemId)),
      closeItem: (itemId) => runCommandAction("close-item", () => launcherApi.closeItem(itemId)),
      openInstallFolder: (itemId) =>
        runCommandAction("open-folder", () => launcherApi.openInstallFolder(itemId)),
      checkLauncherUpdates: async () => {
        setBusyAction("check-launcher-update");
        setError(null);
        try {
          try {
            await launcherApi.checkLauncherUpdates();
          } catch (backgroundError) {
            console.warn("[launcher] remote update metadata check failed", backgroundError);
          }
          await checkLauncherUpdate(publishUpdateProgress);
          await refresh();
        } catch (caught) {
          const normalized = normalizeError(caught);
          publishUpdateProgress({
            status: "error",
            progress: 0,
            errorMessage: normalized.message
          });
          setError(normalized);
        } finally {
          setBusyAction(null);
        }
      },
      installLauncherUpdate: async () => {
        setBusyAction("install-launcher-update");
        setError(null);
        try {
          await downloadAndInstallLauncherUpdate(publishUpdateProgress);
          await refresh();
        } catch (caught) {
          const normalized = normalizeError(caught);
          publishUpdateProgress({
            status: "error",
            progress: 0,
            errorMessage: normalized.message
          });
          setError(normalized);
        } finally {
          setBusyAction(null);
        }
      },
      checkItemUpdates: async () => {
        const previousSnapshot = snapshot;
        setBusyAction("item-update-check");
        setError(null);
        setGameRefreshFeedback({
          phase: "checking",
          checkedAt: null,
          summary: null,
          errorMessage: null
        });

        try {
          const next = await launcherApi.checkItemUpdates();
          const normalizedNext = normalizeLauncherSnapshot(next);
          publishSnapshot(next);

          setGameRefreshFeedback({
            phase: "completed",
            checkedAt: new Date().toISOString(),
            summary: summarizeGameRefresh(previousSnapshot, normalizedNext),
            errorMessage: null
          });
        } catch (caught) {
          const normalized = normalizeError(caught);
          setError(normalized);
          setGameRefreshFeedback({
            phase: "error",
            checkedAt: new Date().toISOString(),
            summary: null,
            errorMessage: normalized.message
          });
        } finally {
          setBusyAction(null);
        }
      },
      cancelJob: (jobId) => runSnapshotAction("cancel-job", () => launcherApi.cancelJob(jobId)),
      clearCompletedJobs: () =>
        runSnapshotAction("clear-completed-jobs", () => launcherApi.clearCompletedJobs())
    }),
    [
      busyAction,
      error,
      loading,
      publishUpdateProgress,
      refresh,
      runSnapshotAction,
      localizedSnapshot,
      gameRefreshFeedback,
      personalization,
      profilesState,
      updateProgress,
      locale,
      snapshot,
      publishSnapshot,
      setLocale,
      persistPersonalization,
      persistProfilesState
    ]
  );

  async function runJobAction(label: string, action: () => Promise<InstallJob>) {
    setBusyAction(label);
    setError(null);
    try {
      const job = await action();
      await refresh();
      return job;
    } catch (caught) {
      setError(normalizeError(caught));
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function runCommandAction(label: string, action: () => Promise<unknown>) {
    setBusyAction(label);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (caught) {
      setError(normalizeError(caught));
      try {
        await refresh();
      } catch {
        // Keep original command error as primary feedback.
      }
    } finally {
      setBusyAction(null);
    }
  }

  return <LauncherContext.Provider value={value}>{children}</LauncherContext.Provider>;
}

export function useLauncher() {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error("useLauncher must be used inside LauncherProvider");
  }
  return context;
}

function normalizeError(caught: unknown): LauncherError {
  if (typeof caught === "object" && caught && "message" in caught) {
    return caught as LauncherError;
  }
  if (typeof caught === "string") {
    return { message: caught };
  }
  return { message: "Unknown launcher error" };
}

function summarizeGameRefresh(
  previousSnapshot: LauncherSnapshot | null,
  nextSnapshot: LauncherSnapshot
): GameRefreshSummary {
  const discoverableItems = nextSnapshot.items.filter((item) => item.state.discoverable);
  const previousDiscoverableIds = new Set(
    previousSnapshot?.items
      .filter((item) => item.state.discoverable)
      .map((item) => item.catalog.id) ?? []
  );

  const newContentFound = discoverableItems.filter(
    (item) => !previousDiscoverableIds.has(item.catalog.id)
  ).length;

  return {
    gamesChecked: discoverableItems.length,
    updatesFound: nextSnapshot.items.filter((item) => item.state.updateAvailable).length,
    brokenInstallsDetected: nextSnapshot.items.filter(
      (item) => item.state.installed && item.installState === "error"
    ).length,
    newContentFound
  };
}

function loadStoredPersonalization(): StoredLauncherPersonalization {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PERSONALIZATION_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as StoredLauncherPersonalization;
    return {
      displayName: normalizeDisplayName(parsed.displayName ?? ""),
      themeId: isLauncherThemeId(parsed.themeId) ? parsed.themeId : "aurora",
      avatarId: isLauncherAvatarId(parsed.avatarId) ? parsed.avatarId : "signal",
      favoriteItemId: normalizeFavoriteItemId(parsed.favoriteItemId),
      nameUpdatedAt: normalizeIsoDate(parsed.nameUpdatedAt),
      accentColor: normalizeAccentColor(parsed.accentColor)
    };
  } catch {
    return {};
  }
}

function hydratePersonalization(
  personalization: StoredLauncherPersonalization
): LauncherPersonalization {
  const displayName = normalizeDisplayName(personalization.displayName ?? "");
  const themeId = isLauncherThemeId(personalization.themeId)
    ? personalization.themeId
    : "aurora";
  const avatarId = isLauncherAvatarId(personalization.avatarId)
    ? personalization.avatarId
    : "signal";
  const favoriteItemId = normalizeFavoriteItemId(personalization.favoriteItemId);
  const nameUpdatedAt = normalizeIsoDate(personalization.nameUpdatedAt);
  const nextDisplayNameChangeAt = nameUpdatedAt
    ? new Date(new Date(nameUpdatedAt).getTime() + DISPLAY_NAME_COOLDOWN_MS).toISOString()
    : null;
  const canEditDisplayName =
    !displayName ||
    !nextDisplayNameChangeAt ||
    new Date(nextDisplayNameChangeAt).getTime() <= Date.now();

  const accentColor = normalizeAccentColor(personalization.accentColor);

  return {
    displayName,
    themeId,
    avatarId,
    favoriteItemId,
    nameUpdatedAt,
    canEditDisplayName,
    nextDisplayNameChangeAt,
    accentColor
  };
}

function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 32);
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeFavoriteItemId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeAccentColor(color: string | null | undefined): string | null {
  if (!color) return null;
  const trimmed = color.trim();
  // Accept only valid CSS hex colors (#RGB, #RRGGBB, #RGBA, #RRGGBBAA)
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * On first run, migrate existing personalization into a default profile so the
 * profile system is bootstrapped without losing the user's existing identity.
 */
function initProfilesState(stored: StoredLauncherPersonalization): ProfilesState {
  const existing = loadProfilesState();
  if (existing) return existing;

  const displayName = normalizeDisplayName(stored.displayName ?? "");
  const profile = makeProfile(
    displayName || "Player 1",
    isLauncherAvatarId(stored.avatarId) ? stored.avatarId : "signal",
    isLauncherThemeId(stored.themeId) ? stored.themeId : "aurora"
  );
  // Carry over createdAt from saved nameUpdatedAt if available
  const rawDate = stored.nameUpdatedAt ? new Date(stored.nameUpdatedAt) : null;
  const createdAt = rawDate && !Number.isNaN(rawDate.getTime())
    ? rawDate.toISOString()
    : profile.createdAt;
  const migrated: Profile = {
    ...profile,
    favoriteItemId: stored.favoriteItemId ?? null,
    createdAt
  };
  const state: ProfilesState = { profiles: [migrated], activeProfileId: migrated.id };
  saveProfilesState(state.profiles, state.activeProfileId);
  return state;
}

