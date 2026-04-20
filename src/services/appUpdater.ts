import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

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
    | "error";
  progress: number;
  message: string;
  version?: string;
}

function progressError(onProgress: (progress: LauncherUpdateProgress) => void, error: unknown): never {
  const message = errorMessage(error);
  console.error("[updater] flow failed", error);
  onProgress({
    status: "error",
    progress: 0,
    message: `Updater failed: ${message}`
  });
  throw new Error(message);
}

function errorMessage(error: unknown): string {
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
      status: "none",
      progress: 0,
      message: "In-app updates are only available in the desktop app."
    });
    return null;
  }

  onProgress({
    status: "checking",
    progress: 5,
    message: "Checking signed launcher release..."
  });

  try {
    const update = await check();
    if (!update) {
      onProgress({
        status: "none",
        progress: 100,
        message: "No update available. Lumorix is up to date."
      });
      return null;
    }

    onProgress({
      status: "available",
      progress: 100,
      version: update.version,
      message: `Update ${update.version} is available.`
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
            version: update.version,
            message: "Downloading signed update..."
          });
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          onProgress({
            status: "downloading",
            progress: contentLength > 0 ? Math.min(95, (downloaded / contentLength) * 95) : 40,
            version: update.version,
            message: "Downloading signed update..."
          });
          break;
        case "Finished":
          onProgress({
            status: "installing",
            progress: 98,
            version: update.version,
            message: "Installing update..."
          });
          break;
      }
    });

    onProgress({
      status: "installed",
      progress: 100,
      version: update.version,
      message: "Update installed. Preparing relaunch..."
    });

    onProgress({
      status: "relaunching",
      progress: 100,
      version: update.version,
      message: "Relaunching Lumorix..."
    });

    await relaunch();
  } catch (error) {
    console.error("[updater] relaunch/install failed", error);
    onProgress({
      status: "restartRequired",
      progress: 100,
      version: update.version,
      message: "Update installed, but relaunch failed. Please restart Lumorix manually."
    });
    throw error;
  }
}
