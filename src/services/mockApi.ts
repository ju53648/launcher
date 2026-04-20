import type { CommandOk, GameManifest, InstallJob, LauncherSnapshot, LibraryFolder } from "../domain/types";

const now = () => new Date().toISOString();

const games: GameManifest[] = [];

let snapshot: LauncherSnapshot = loadSnapshot();

function loadSnapshot(): LauncherSnapshot {
  const saved = localStorage.getItem("lumorix.mock.snapshot");
  if (saved) {
    const parsed = JSON.parse(saved) as LauncherSnapshot;
    return {
      ...parsed,
      manifestErrors: parsed.manifestErrors ?? []
    };
  }

  return {
    appVersion: "0.1.0",
    dataDir: "C:\\Users\\Local\\AppData\\Lumorix Launcher",
    cacheDir: "C:\\Users\\Local\\AppData\\Lumorix Launcher\\Cache",
    logsDir: "C:\\Users\\Local\\AppData\\Lumorix Launcher\\Logs",
    recommendedLibraryPath: "C:\\Lumorix\\Games",
    manifestErrors: [],
    config: {
      onboardingCompleted: false,
      libraries: [],
      defaultLibraryId: null,
      checkLauncherUpdatesOnStart: false,
      checkGameUpdatesOnStart: true,
      installBehavior: {
        askForLibraryEachInstall: true,
        createDesktopShortcuts: false,
        keepDownloadCache: true
      },
      manifestSources: [
        {
          id: "mock",
          name: "Embedded Catalog",
          url: null,
          enabled: true,
          sourceType: "embedded"
        }
      ],
      privacy: {
        telemetryEnabled: false,
        crashUploadEnabled: false,
        networkAccessNote:
          "Network is only used for manifest checks, downloads and explicit update checks."
      }
    },
    games: [],
    jobs: [],
    launcherUpdate: {
      currentVersion: "0.1.0",
      latestVersion: null,
      updateAvailable: false,
      checkedAt: null,
      releaseUrl: null,
      notes: [],
      error: null
    }
  };
}

function save() {
  snapshot.games = games.map((manifest) => {
    const installed = snapshot.games.find((game) => game.manifest.id === manifest.id)?.installed ?? null;
    const activeJob =
      snapshot.jobs.find(
        (job) =>
          job.gameId === manifest.id && (job.status === "queued" || job.status === "running")
      ) ?? null;
    const status = activeJob
      ? "installing"
      : installed
        ? installed.installedVersion === manifest.version
          ? "installed"
          : "updateAvailable"
        : "notInstalled";
    return { manifest, installed, activeJob, status, availableUpdate: null };
  });
  localStorage.setItem("lumorix.mock.snapshot", JSON.stringify(snapshot));
}

function makeLibrary(path: string): LibraryFolder {
  return {
    id: crypto.randomUUID(),
    name: "Main Library",
    path,
    isDefault: true,
    createdAt: now(),
    lastSeenAt: now(),
    status: "available"
  };
}

function completeJob(jobId: string) {
  const job = snapshot.jobs.find((entry) => entry.id === jobId);
  if (!job || job.status === "cancelled") return;
  const manifest = games.find((game) => game.id === job.gameId);
  const library = snapshot.config.libraries.find((entry) => entry.id === job.libraryId);
  if (!manifest || !library) return;
  job.status = "completed";
  job.phase = "completed";
  job.progress = 100;
  job.message = "Ready to play";
  job.updatedAt = now();
  const existing = snapshot.games.find((game) => game.manifest.id === manifest.id);
  if (existing) {
    existing.installed = {
      gameId: manifest.id,
      installedVersion: manifest.version,
      libraryId: library.id,
      installPath: `${library.path}\\${manifest.defaultInstallFolder}`,
      installedAt: now(),
      lastVerifiedAt: now(),
      sizeOnDiskBytes: manifest.installSizeBytes,
      status: "installed",
      lastError: null
    };
  }
  save();
}

export const mockApi = {
  async bootstrap() {
    save();
    return snapshot;
  },
  async getSnapshot() {
    save();
    return snapshot;
  },
  async completeOnboarding(libraryPath: string | null) {
    if (snapshot.config.libraries.length === 0) {
      const library = makeLibrary(libraryPath ?? snapshot.recommendedLibraryPath);
      snapshot.config.libraries = [library];
      snapshot.config.defaultLibraryId = library.id;
    }
    snapshot.config.onboardingCompleted = true;
    save();
    return snapshot;
  },
  async addLibrary(name: string, path: string) {
    const library = makeLibrary(path);
    library.name = name;
    library.isDefault = snapshot.config.libraries.length === 0;
    snapshot.config.libraries.push(library);
    if (library.isDefault) snapshot.config.defaultLibraryId = library.id;
    save();
    return snapshot;
  },
  async renameLibrary(libraryId: string, name: string) {
    const library = snapshot.config.libraries.find((entry) => entry.id === libraryId);
    if (library) library.name = name;
    save();
    return snapshot;
  },
  async removeLibrary(libraryId: string) {
    snapshot.config.libraries = snapshot.config.libraries.filter((entry) => entry.id !== libraryId);
    if (snapshot.config.defaultLibraryId === libraryId) {
      snapshot.config.defaultLibraryId = snapshot.config.libraries[0]?.id ?? null;
    }
    save();
    return snapshot;
  },
  async setDefaultLibrary(libraryId: string) {
    snapshot.config.defaultLibraryId = libraryId;
    snapshot.config.libraries = snapshot.config.libraries.map((library) => ({
      ...library,
      isDefault: library.id === libraryId
    }));
    save();
    return snapshot;
  },
  async updatePreferences(
    checkLauncherUpdatesOnStart: boolean,
    checkGameUpdatesOnStart: boolean,
    askForLibraryEachInstall: boolean,
    createDesktopShortcuts: boolean,
    keepDownloadCache: boolean
  ) {
    snapshot.config.checkLauncherUpdatesOnStart = checkLauncherUpdatesOnStart;
    snapshot.config.checkGameUpdatesOnStart = checkGameUpdatesOnStart;
    snapshot.config.installBehavior = {
      askForLibraryEachInstall,
      createDesktopShortcuts,
      keepDownloadCache
    };
    save();
    return snapshot;
  },
  async startInstallGame(gameId: string, libraryId: string | null) {
    const manifest = games.find((game) => game.id === gameId);
    if (!manifest) {
      throw { message: "Game manifest is not available" };
    }
    const selectedLibraryId = libraryId ?? snapshot.config.defaultLibraryId!;
    const job: InstallJob = {
      id: crypto.randomUUID(),
      gameId,
      gameName: manifest.name,
      libraryId: selectedLibraryId,
      phase: "downloading",
      status: "running",
      progress: 3,
      message: "Preparing local package",
      bytesDownloaded: 0,
      bytesTotal: manifest.installSizeBytes,
      startedAt: now(),
      updatedAt: now(),
      error: null
    };
    snapshot.jobs.push(job);
    save();
    const timer = window.setInterval(() => {
      const current = snapshot.jobs.find((entry) => entry.id === job.id);
      if (!current || current.status !== "running") {
        window.clearInterval(timer);
        return;
      }
      current.progress = Math.min(100, current.progress + 13);
      current.bytesDownloaded = Math.round((current.progress / 100) * current.bytesTotal);
      current.phase = current.progress > 70 ? "installing" : "downloading";
      current.message = current.progress > 70 ? "Writing game files" : "Staging package";
      current.updatedAt = now();
      if (current.progress >= 100) {
        window.clearInterval(timer);
        completeJob(current.id);
      }
      save();
    }, 350);
    return job;
  },
  async startUpdateGame(gameId: string) {
    return this.startInstallGame(gameId, null);
  },
  async repairGame(gameId: string) {
    return this.startInstallGame(gameId, null);
  },
  async moveInstallGame(gameId: string, targetLibraryId: string) {
    const game = snapshot.games.find((entry) => entry.manifest.id === gameId);
    if (!game?.installed) {
      throw { message: "Game is not installed" };
    }
    game.installed.libraryId = targetLibraryId;
    const targetLibrary = snapshot.config.libraries.find((library) => library.id === targetLibraryId);
    if (targetLibrary) {
      const folderName = game.installed.installPath.split("\\").pop() ?? game.manifest.defaultInstallFolder;
      game.installed.installPath = `${targetLibrary.path}\\${folderName}`;
    }
    game.installed.lastVerifiedAt = now();
    save();
    return {
      id: crypto.randomUUID(),
      gameId,
      gameName: game.manifest.name,
      libraryId: targetLibraryId,
      phase: "completed",
      status: "completed",
      progress: 100,
      message: "Move completed",
      bytesDownloaded: game.manifest.installSizeBytes,
      bytesTotal: game.manifest.installSizeBytes,
      startedAt: now(),
      updatedAt: now(),
      error: null
    } as InstallJob;
  },
  async uninstallGame(gameId: string) {
    const game = snapshot.games.find((entry) => entry.manifest.id === gameId);
    if (game) game.installed = null;
    save();
    return snapshot;
  },
  async launchGame(): Promise<CommandOk> {
    return { message: "Mock game launch" };
  },
  async openInstallFolder(): Promise<CommandOk> {
    return { message: "Mock folder open" };
  },
  async checkLauncherUpdates() {
    snapshot.launcherUpdate.checkedAt = now();
    snapshot.launcherUpdate.notes = ["No remote update source is configured."];
    save();
    return snapshot;
  },
  async checkGameUpdates() {
    save();
    return snapshot;
  },
  async cancelJob(jobId: string) {
    const job = snapshot.jobs.find((entry) => entry.id === jobId);
    if (job) {
      job.status = "cancelled";
      job.phase = "cancelled";
      job.message = "Cancelled";
      job.updatedAt = now();
    }
    save();
    return snapshot;
  },
  async clearCompletedJobs() {
    snapshot.jobs = snapshot.jobs.filter((job) => job.status === "running" || job.status === "queued");
    save();
    return snapshot;
  }
};
