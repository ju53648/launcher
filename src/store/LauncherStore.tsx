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

interface LauncherContextValue {
  snapshot: LauncherSnapshot | null;
  loading: boolean;
  busyAction: string | null;
  error: LauncherError | null;
  updateProgress: LauncherUpdateProgress;
  gameRefreshFeedback: GameRefreshFeedback;
  clearError: () => void;
  refresh: () => Promise<void>;
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

export function LauncherProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useI18n();
  const initialLocale = useRef(locale);
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
      clearError: () => setError(null),
      refresh,
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
      updateProgress,
      locale,
      snapshot,
      publishSnapshot,
      setLocale
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
