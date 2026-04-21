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
  checkLauncherUpdate,
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
  addItemToLibrary: (itemId: string) => Promise<void>;
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
  openInstallFolder: (itemId: string) => Promise<void>;
  checkLauncherUpdates: () => Promise<void>;
  installLauncherUpdate: () => Promise<void>;
  checkItemUpdates: () => Promise<void>;
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

  const publishUpdateProgress = useCallback((progress: LauncherUpdateProgress) => {
    console.info("[updater]", progress.status, progress.message);
    setUpdateProgress(progress);
  }, []);

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
      addItemToLibrary: (itemId) =>
        runSnapshotAction("add-item-to-library", () => launcherApi.addItemToLibrary(itemId)),
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
            message: normalized.message
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
            message: normalized.message
          });
          setError(normalized);
        } finally {
          setBusyAction(null);
        }
      },
      checkItemUpdates: () =>
        runSnapshotAction("item-update-check", () => launcherApi.checkItemUpdates()),
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
      snapshot,
      updateProgress
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
