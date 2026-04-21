import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import type {
  CommandOk,
  InstallJob,
  LauncherSnapshot,
  LauncherError
} from "../domain/types";

export const isTauriRuntime = () => Boolean(window.__TAURI_INTERNALS__);

export async function callCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw normalizeTauriError(error);
  }
}

export async function chooseDirectory(): Promise<string | null> {
  if (!isTauriRuntime()) {
    return window.prompt("Library folder path", "C:\\Lumorix\\Games");
  }

  const selected = await open({
    directory: true,
    multiple: false,
    title: "Choose Lumorix library folder"
  });

  return typeof selected === "string" ? selected : null;
}

export const tauriApi = {
  bootstrap: () => callCommand<LauncherSnapshot>("bootstrap"),
  getSnapshot: () => callCommand<LauncherSnapshot>("get_snapshot"),
  completeOnboarding: (libraryPath: string | null) =>
    callCommand<LauncherSnapshot>("complete_onboarding", { libraryPath }),
  addLibrary: (name: string, path: string) =>
    callCommand<LauncherSnapshot>("add_library", { name, path }),
  renameLibrary: (libraryId: string, name: string) =>
    callCommand<LauncherSnapshot>("rename_library", { libraryId, name }),
  removeLibrary: (libraryId: string) =>
    callCommand<LauncherSnapshot>("remove_library", { libraryId }),
  setDefaultLibrary: (libraryId: string) =>
    callCommand<LauncherSnapshot>("set_default_library", { libraryId }),
  addItemToLibrary: (itemId: string) =>
    callCommand<LauncherSnapshot>("add_item_to_library", { itemId }),
  updatePreferences: (
    checkLauncherUpdatesOnStart: boolean,
    checkGameUpdatesOnStart: boolean,
    askForLibraryEachInstall: boolean,
    createDesktopShortcuts: boolean,
    keepDownloadCache: boolean
  ) =>
    callCommand<LauncherSnapshot>("update_preferences", {
      checkLauncherUpdatesOnStart,
      checkGameUpdatesOnStart,
      askForLibraryEachInstall,
      createDesktopShortcuts,
      keepDownloadCache
    }),
  startInstallItem: (itemId: string, libraryId: string | null) =>
    callCommand<InstallJob>("start_install_item", { itemId, libraryId }),
  startUpdateItem: (itemId: string) =>
    callCommand<InstallJob>("start_update_item", { itemId }),
  repairItem: (itemId: string) => callCommand<InstallJob>("repair_item", { itemId }),
  moveInstallItem: (itemId: string, targetLibraryId: string) =>
    callCommand<InstallJob>("move_install_item", { itemId, targetLibraryId }),
  uninstallItem: (itemId: string) =>
    callCommand<LauncherSnapshot>("uninstall_item", { itemId }),
  launchItem: (itemId: string) => callCommand<CommandOk>("launch_item", { itemId }),
  openInstallFolder: (itemId: string) =>
    callCommand<CommandOk>("open_install_folder", { itemId }),
  checkLauncherUpdates: () => callCommand<LauncherSnapshot>("check_launcher_updates"),
  checkItemUpdates: () => callCommand<LauncherSnapshot>("check_item_updates"),
  cancelJob: (jobId: string) => callCommand<LauncherSnapshot>("cancel_job", { jobId }),
  clearCompletedJobs: () => callCommand<LauncherSnapshot>("clear_completed_jobs")
};

export function normalizeTauriError(error: unknown): LauncherError {
  if (typeof error === "object" && error && "message" in error) {
    return error as LauncherError;
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return { message: "Unknown launcher error" };
}
