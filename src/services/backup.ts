import type { LauncherSnapshot } from "../domain/types";
import { isTauriRuntime } from "./tauri";

export interface BackupMeta {
  lastBackupAt: string | null;
}

const BACKUP_META_KEY = "lumorix.backup.meta";

export function getBackupMeta(): BackupMeta {
  try {
    const raw = window.localStorage.getItem(BACKUP_META_KEY);
    return raw ? (JSON.parse(raw) as BackupMeta) : { lastBackupAt: null };
  } catch {
    return { lastBackupAt: null };
  }
}

function setBackupMeta(meta: BackupMeta) {
  try {
    window.localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

function buildBackupPayload(snapshot: LauncherSnapshot) {
  return {
    exportedAt: new Date().toISOString(),
    version: "1",
    config: {
      language: snapshot.config.language,
      libraries: snapshot.config.libraries,
      defaultLibraryId: snapshot.config.defaultLibraryId,
      preferences: {
        checkLauncherUpdatesOnStart: snapshot.config.checkLauncherUpdatesOnStart,
        checkGameUpdatesOnStart: snapshot.config.checkGameUpdatesOnStart,
        installBehavior: snapshot.config.installBehavior
      }
    },
    items: snapshot.items
      .filter((item) => item.state.added || item.state.installed)
      .map((item) => ({
        id: item.catalog.id,
        name: item.catalog.name,
        installedAt: item.installed?.installedAt ?? null,
        lastLaunchedAt: item.installed?.lastLaunchedAt ?? null,
        totalPlaytimeMinutes: item.collectionEntry?.totalPlaytimeMinutes ?? 0,
        installState: item.installState ?? null
      }))
  };
}

export async function exportBackup(snapshot: LauncherSnapshot): Promise<void> {
  const payload = buildBackupPayload(snapshot);
  const json = JSON.stringify(payload, null, 2);
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `lumorix-backup-${dateTag}.json`;

  if (isTauriRuntime()) {
    try {
      // Use runtime-evaluated import so Vite dev server doesn't try to pre-resolve
      // this optional dependency during browser-first development.
      const loadOptionalModule = new Function("specifier", "return import(specifier);") as (
        specifier: string
      ) => Promise<any>;
      const fsModule = await loadOptionalModule("@tauri-apps/plugin-fs");
      const { writeTextFile, BaseDirectory, mkdir } = fsModule;
      await mkdir("lumorix/backups", { baseDir: BaseDirectory.AppConfig, recursive: true });
      await writeTextFile(`lumorix/backups/${filename}`, json, {
        baseDir: BaseDirectory.AppConfig
      });
      setBackupMeta({ lastBackupAt: new Date().toISOString() });
      return;
    } catch (e) {
      console.warn("[backup] Tauri write failed, falling back to browser download", e);
    }
  }

  // Browser / fallback: trigger download
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setBackupMeta({ lastBackupAt: new Date().toISOString() });
}
