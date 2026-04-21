import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

import type { TranslationParams } from "../i18n";
import { isTauriRuntime } from "./tauri";

export interface LauncherUpdateProgress {
  status:
    | "idle"
    | "checking"
    | "available"
    | "downloading"
    | "installing"
    | "installed"
    | "relaunching"
    | "restartRequired"
    | "none"
    | "desktopOnly"
    | "error";
  progress: number;
  version?: string;
  errorMessage?: string;
}

function progressError(onProgress: (progress: LauncherUpdateProgress) => void, error: unknown): never {
  const message = toErrorMessage(error);
  console.error("[updater] flow failed", error);
  onProgress({
    status: "error",
    progress: 0,
    errorMessage: message
  });
  throw new Error(message);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown updater error";
}

export async function checkLauncherUpdate(
  onProgress: (progress: LauncherUpdateProgress) => void
) {
  if (!isTauriRuntime()) {
    onProgress({
      status: "desktopOnly",
      progress: 0
    });
    return null;
  }

  onProgress({
    status: "checking",
    progress: 5
  });

  try {
    const update = await check();
    if (!update) {
      onProgress({
        status: "none",
        progress: 100
      });
      return null;
    }

    onProgress({
      status: "available",
      progress: 100,
      version: update.version
    });
    return update;
  } catch (error) {
    return progressError(onProgress, error);
  }
}

export async function downloadAndInstallLauncherUpdate(
  onProgress: (progress: LauncherUpdateProgress) => void
) {
  const update = await checkLauncherUpdate(onProgress);
  if (!update) {
    return;
  }

  let downloaded = 0;
  let contentLength = 0;

  try {
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength ?? 0;
          downloaded = 0;
          onProgress({
            status: "downloading",
            progress: 2,
            version: update.version
          });
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          onProgress({
            status: "downloading",
            progress: contentLength > 0 ? Math.min(95, (downloaded / contentLength) * 95) : 40,
            version: update.version
          });
          break;
        case "Finished":
          onProgress({
            status: "installing",
            progress: 98,
            version: update.version
          });
          break;
      }
    });

    onProgress({
      status: "installed",
      progress: 100,
      version: update.version
    });

    onProgress({
      status: "relaunching",
      progress: 100,
      version: update.version
    });

    await relaunch();
  } catch (error) {
    console.error("[updater] relaunch/install failed", error);
    onProgress({
      status: "restartRequired",
      progress: 100,
      version: update.version
    });
    throw error;
  }
}

export function describeLauncherUpdateProgress(
  progress: LauncherUpdateProgress,
  t: (key: string, params?: TranslationParams) => string
) {
  switch (progress.status) {
    case "checking":
      return t("updater.statuses.checking");
    case "available":
      return t("updater.statuses.available", { version: progress.version ?? "" });
    case "downloading":
      return t("updater.statuses.downloading");
    case "installing":
      return t("updater.statuses.installing");
    case "installed":
      return t("updater.statuses.installed");
    case "relaunching":
      return t("updater.statuses.relaunching");
    case "restartRequired":
      return t("updater.statuses.restartRequired");
    case "none":
      return t("updater.statuses.none");
    case "desktopOnly":
      return t("updater.statuses.desktopOnly");
    case "error":
      return t("updater.statuses.error", { message: progress.errorMessage ?? "" });
    default:
      return "";
  }
}
