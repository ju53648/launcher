import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import type { InstallJob, LauncherError, LauncherSnapshot } from "../domain/types";
import {
  downloadAndInstallLauncherUpdate,
  type LauncherUpdateProgress
} from "../services/appUpdater";
import { launcherApi } from "../services/launcherApi";

interface LauncherContextValue {
  snapshot: LauncherSnapshot | null;
  loading: boolean;
  busyAction: string | null;
  error: LauncherError | null;
  updateProgress: LauncherUpdateProgress;
  clearError: () => void;
  refresh: () => Promise<void>;
  completeOnboarding: (libraryPath: string | null) => Promise<void>;
  addLibrary: (name: string, path: string) => Promise<void>;
  renameLibrary: (libraryId: string, name: string) => Promise<void>;
  removeLibrary: (libraryId: string) => Promise<void>;
  setDefaultLibrary: (libraryId: string) => Promise<void>;
  updatePreferences: (
    checkLauncherUpdatesOnStart: boolean,
    checkGameUpdatesOnStart: boolean,
    askForLibraryEachInstall: boolean,
    createDesktopShortcuts: boolean,
    keepDownloadCache: boolean
  ) => Promise<void>;
  installGame: (gameId: string, libraryId: string | null) => Promise<InstallJob | null>;
  updateGame: (gameId: string) => Promise<InstallJob | null>;
  repairGame: (gameId: string) => Promise<InstallJob | null>;
  uninstallGame: (gameId: string) => Promise<void>;
  launchGame: (gameId: string) => Promise<void>;
  openInstallFolder: (gameId: string) => Promise<void>;
  checkLauncherUpdates: () => Promise<void>;
  installLauncherUpdate: () => Promise<void>;
  checkGameUpdates: () => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  clearCompletedJobs: () => Promise<void>;
}

const LauncherContext = createContext<LauncherContextValue | undefined>(undefined);

export function LauncherProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LauncherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<LauncherError | null>(null);
  const [updateProgress, setUpdateProgress] = useState<LauncherUpdateProgress>({
    status: "idle",
    progress: 0,
    message: "No update action running."
  });

  const runSnapshotAction = useCallback(
    async (label: string, action: () => Promise<LauncherSnapshot>) => {
      setBusyAction(label);
      setError(null);
      try {
        const next = await action();
        setSnapshot(next);
      } catch (caught) {
        setError(normalizeError(caught));
      } finally {
        setBusyAction(null);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    try {
      const next = await launcherApi.getSnapshot();
      setSnapshot(next);
    } catch (caught) {
      setError(normalizeError(caught));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      try {
        const next = await launcherApi.bootstrap();
        if (!cancelled) setSnapshot(next);
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

  const value = useMemo<LauncherContextValue>(
    () => ({
      snapshot,
      loading,
      busyAction,
      error,
      updateProgress,
      clearError: () => setError(null),
      refresh,
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
      installGame: async (gameId, libraryId) =>
        runJobAction("install-game", () => launcherApi.startInstallGame(gameId, libraryId)),
      updateGame: async (gameId) =>
        runJobAction("update-game", () => launcherApi.startUpdateGame(gameId)),
      repairGame: async (gameId) =>
        runJobAction("repair-game", () => launcherApi.repairGame(gameId)),
      uninstallGame: (gameId) =>
        runSnapshotAction("uninstall-game", () => launcherApi.uninstallGame(gameId)),
      launchGame: (gameId) => runCommandAction("launch-game", () => launcherApi.launchGame(gameId)),
      openInstallFolder: (gameId) =>
        runCommandAction("open-folder", () => launcherApi.openInstallFolder(gameId)),
      checkLauncherUpdates: () =>
        runSnapshotAction("launcher-update-check", () => launcherApi.checkLauncherUpdates()),
      installLauncherUpdate: async () => {
        setBusyAction("install-launcher-update");
        setError(null);
        try {
          await downloadAndInstallLauncherUpdate(setUpdateProgress);
          await refresh();
        } catch (caught) {
          const normalized = normalizeError(caught);
          setUpdateProgress({
            status: "error",
            progress: 0,
            message: normalized.message
          });
          setError(normalized);
        } finally {
          setBusyAction(null);
        }
      },
      checkGameUpdates: () =>
        runSnapshotAction("game-update-check", () => launcherApi.checkGameUpdates()),
      cancelJob: (jobId) => runSnapshotAction("cancel-job", () => launcherApi.cancelJob(jobId)),
      clearCompletedJobs: () =>
        runSnapshotAction("clear-completed-jobs", () => launcherApi.clearCompletedJobs())
    }),
    [busyAction, error, loading, refresh, runSnapshotAction, snapshot, updateProgress]
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
