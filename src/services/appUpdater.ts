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
    | "restartRequired"
    | "none"
    | "error";
  progress: number;
  message: string;
  version?: string;
}

export async function downloadAndInstallLauncherUpdate(
  onProgress: (progress: LauncherUpdateProgress) => void
) {
  if (!isTauriRuntime()) {
    onProgress({
      status: "none",
      progress: 0,
      message: "In-app updates are only available in the desktop app."
    });
    return;
  }

  onProgress({
    status: "checking",
    progress: 0,
    message: "Checking signed launcher release..."
  });

  const update = await check();
  if (!update) {
    onProgress({
      status: "none",
      progress: 0,
      message: "Lumorix is up to date."
    });
    return;
  }

  onProgress({
    status: "available",
    progress: 0,
    version: update.version,
    message: `Update ${update.version} is available.`
  });

  let downloaded = 0;
  let contentLength = 0;

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
    message: "Update installed. Restarting launcher..."
  });

  try {
    await relaunch();
  } catch {
    onProgress({
      status: "restartRequired",
      progress: 100,
      version: update.version,
      message: "Update installed. Please restart Lumorix manually."
    });
  }
}
