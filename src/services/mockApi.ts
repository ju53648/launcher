import type {
  CollectionEntry,
  CommandOk,
  ContentManifest,
  ContentStateFlags,
  ContentUpdateInfo,
  ContentView,
  InstallJob,
  InstalledItem,
  ItemCollectionStatus,
  ItemInstallState,
  LauncherSnapshot,
  LibraryFolder
} from "../domain/types";
import { releaseInfo } from "../releaseInfo";

const now = () => new Date().toISOString();

const catalog: ContentManifest[] = [
  {
    id: "com.lumorix.dropdash",
    itemType: "game",
    name: "Lumorix DropDash",
    version: "1.0.0",
    description:
      "A tiny offline arcade test title for validating installs, launches, repairs, and uninstall flows.",
    developer: "Lumorix",
    releaseDate: "2026-04-20",
    categories: ["Arcade", "Offline"],
    tags: ["Arcade", "Offline", "Test Title"],
    coverImage: "/assets/games/lumorix-dropdash-cover.svg",
    bannerImage: "/assets/games/lumorix-dropdash-banner.svg",
    iconImage: "/assets/games/lumorix-dropdash-icon.svg",
    executable: "bin\\launch.cmd",
    installSizeBytes: 16768,
    defaultInstallFolder: "Lumorix DropDash",
    supportedActions: ["install", "launch", "repair", "uninstall", "openFolder"],
    installStrategy: {
      kind: "synthetic",
      executableTemplate:
        "@echo off\nsetlocal\nset \"GAME_ROOT=%~dp0..\"\nstart \"\" \"%GAME_ROOT%\\index.html\"\n",
      contentFiles: []
    },
    download: {
      kind: "localSynthetic",
      integrity: "embedded-lumorix-dropdash-1.0.0"
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-04-20",
        items: [
          "Initial mock release.",
          "Offline arcade loop for install and launch validation."
        ]
      }
    ]
  },
  {
    id: "com.lumorix.signal-lab",
    itemType: "tool",
    name: "Signal Lab",
    version: "0.9.2",
    description:
      "A compact local utility for testing Lumorix tool distribution, updates, and collection behavior.",
    developer: "Lumorix",
    releaseDate: "2026-04-18",
    categories: ["Creator Tools", "Utilities"],
    tags: ["Tool", "Utility", "Local-first"],
    coverImage: "",
    bannerImage: "",
    iconImage: "",
    executable: "bin\\launch.cmd",
    installSizeBytes: 8512,
    defaultInstallFolder: "Signal Lab",
    supportedActions: ["install", "launch", "repair", "uninstall", "openFolder"],
    installStrategy: {
      kind: "synthetic",
      executableTemplate: "@echo off\necho Signal Lab mock tool\npause\n",
      contentFiles: []
    },
    download: {
      kind: "localSynthetic",
      integrity: "embedded-signal-lab-0.9.2"
    },
    changelog: [
      {
        version: "0.9.2",
        date: "2026-04-18",
        items: ["Adds a lightweight local utility manifest for Shop and Library testing."]
      }
    ]
  },
  {
    id: "com.lumorix.project-atlas",
    itemType: "project",
    name: "Project Atlas",
    version: "0.4.0",
    description:
      "A Lumorix project package placeholder that helps validate future non-game content in the same launcher shell.",
    developer: "Lumorix",
    releaseDate: "2026-04-16",
    categories: ["Projects", "Prototype"],
    tags: ["Project", "Prototype", "Narrative"],
    coverImage: "",
    bannerImage: "",
    iconImage: "",
    executable: "bin\\launch.cmd",
    installSizeBytes: 12288,
    defaultInstallFolder: "Project Atlas",
    supportedActions: ["install", "launch", "repair", "uninstall", "openFolder"],
    installStrategy: {
      kind: "synthetic",
      executableTemplate: "@echo off\necho Project Atlas mock package\npause\n",
      contentFiles: []
    },
    download: {
      kind: "localSynthetic",
      integrity: "embedded-project-atlas-0.4.0"
    },
    changelog: [
      {
        version: "0.4.0",
        date: "2026-04-16",
        items: ["Adds a project-type package to exercise the future-proof content model."]
      }
    ]
  }
];

let collectionEntries = loadCollectionEntries();
let installedItems = loadInstalledItems();
let state = loadState();

function loadCollectionEntries(): CollectionEntry[] {
  const saved = localStorage.getItem("lumorix.mock.collectionEntries");
  return saved ? (JSON.parse(saved) as CollectionEntry[]) : [];
}

function loadInstalledItems(): InstalledItem[] {
  const saved = localStorage.getItem("lumorix.mock.installedItems");
  return saved ? (JSON.parse(saved) as InstalledItem[]) : [];
}

function loadState(): Omit<LauncherSnapshot, "items"> {
  const saved = localStorage.getItem("lumorix.mock.state");
  if (saved) {
    const parsed = JSON.parse(saved) as Omit<LauncherSnapshot, "items">;
    return {
      ...parsed,
      appVersion: releaseInfo.version,
      manifestErrors: parsed.manifestErrors ?? [],
      launcherUpdate: {
        ...parsed.launcherUpdate,
        currentVersion: releaseInfo.version
      }
    };
  }

  return {
    appVersion: releaseInfo.version,
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
    jobs: [],
    launcherUpdate: {
      currentVersion: releaseInfo.version,
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
  localStorage.setItem("lumorix.mock.collectionEntries", JSON.stringify(collectionEntries));
  localStorage.setItem("lumorix.mock.installedItems", JSON.stringify(installedItems));
  localStorage.setItem("lumorix.mock.state", JSON.stringify(state));
}

function buildSnapshot(): LauncherSnapshot {
  const items = buildViews();
  return {
    ...state,
    items
  };
}

function buildViews(): ContentView[] {
  const itemIds = new Set<string>([
    ...catalog.map((item) => item.id),
    ...collectionEntries.map((entry) => entry.itemId),
    ...installedItems.map((item) => item.itemId)
  ]);

  return [...itemIds]
    .map((itemId) => {
      const manifest = catalog.find((entry) => entry.id === itemId) ?? null;
      const collectionEntry = collectionEntries.find((entry) => entry.itemId === itemId) ?? null;
      const installed = installedItems.find((entry) => entry.itemId === itemId) ?? null;
      const activeJob =
        state.jobs.find(
          (job) =>
            job.itemId === itemId && (job.status === "queued" || job.status === "running")
        ) ?? null;
      const catalogRecord = manifest
        ? {
            id: manifest.id,
            itemType: manifest.itemType,
            name: manifest.name,
            description: manifest.description,
            developer: manifest.developer,
            releaseDate: manifest.releaseDate,
            categories: manifest.categories,
            tags: manifest.tags,
            coverImage: manifest.coverImage,
            bannerImage: manifest.bannerImage,
            iconImage: manifest.iconImage
          }
        : collectionEntry?.catalog ?? {
            id: itemId,
            itemType: "game",
            name: itemId,
            description: "Unavailable item",
            developer: "Lumorix",
            releaseDate: "Unavailable",
            categories: ["Unavailable"],
            tags: [],
            coverImage: "",
            bannerImage: "",
            iconImage: ""
          };

      const availableUpdate: ContentUpdateInfo | null =
        manifest && installed && installed.installedVersion !== manifest.version
          ? {
              currentVersion: installed.installedVersion,
              availableVersion: manifest.version,
              changelog: manifest.changelog
            }
          : null;
      const stateFlags: ContentStateFlags = {
        discoverable: Boolean(manifest),
        added: Boolean(collectionEntry),
        installed: Boolean(installed),
        updateAvailable: Boolean(availableUpdate),
        error: Boolean(installed?.status === "broken" || collectionEntry?.lastError)
      };
      const installState: ItemInstallState = activeJob
        ? "installing"
        : stateFlags.error
          ? "error"
          : stateFlags.updateAvailable
            ? "updateAvailable"
            : stateFlags.installed
              ? "installed"
              : "notInstalled";
      const collectionStatus: ItemCollectionStatus = stateFlags.error
        ? "error"
        : stateFlags.updateAvailable
          ? "updateAvailable"
          : stateFlags.installed
            ? "installed"
            : stateFlags.added
              ? "added"
              : "notAdded";

      return {
        catalog: catalogRecord,
        manifest,
        state: stateFlags,
        installState,
        collectionStatus,
        installed,
        collectionEntry,
        activeJob,
        availableUpdate,
        lastError: installed?.lastError ?? collectionEntry?.lastError ?? null
      };
    })
    .sort((left, right) => left.catalog.name.localeCompare(right.catalog.name));
}

function ensureCollectionEntry(itemId: string) {
  const manifest = catalog.find((entry) => entry.id === itemId);
  if (!manifest) {
    throw { message: "Item manifest is not available" };
  }

  const existing = collectionEntries.find((entry) => entry.itemId === itemId);
  if (existing) {
    existing.discoverable = true;
    existing.catalog = {
      id: manifest.id,
      itemType: manifest.itemType,
      name: manifest.name,
      description: manifest.description,
      developer: manifest.developer,
      releaseDate: manifest.releaseDate,
      categories: manifest.categories,
      tags: manifest.tags,
      coverImage: manifest.coverImage,
      bannerImage: manifest.bannerImage,
      iconImage: manifest.iconImage
    };
    existing.lastError = null;
    existing.lastErrorAt = null;
    return existing;
  }

  const entry: CollectionEntry = {
    itemId,
    discoverable: true,
    addedAt: now(),
    lastUsedAt: null,
    lastError: null,
    lastErrorAt: null,
    catalog: {
      id: manifest.id,
      itemType: manifest.itemType,
      name: manifest.name,
      description: manifest.description,
      developer: manifest.developer,
      releaseDate: manifest.releaseDate,
      categories: manifest.categories,
      tags: manifest.tags,
      coverImage: manifest.coverImage,
      bannerImage: manifest.bannerImage,
      iconImage: manifest.iconImage
    }
  };
  collectionEntries = [...collectionEntries, entry];
  return entry;
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
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (!job || job.status === "cancelled") return;

  const manifest = catalog.find((entry) => entry.id === job.itemId);
  const library = state.config.libraries.find((entry) => entry.id === job.libraryId);
  if (!manifest || !library) return;

  job.status = "completed";
  job.phase = "completed";
  job.progress = 100;
  job.message = "Ready to use";
  job.updatedAt = now();

  const existing = installedItems.find((item) => item.itemId === manifest.id);
  const nextInstall: InstalledItem = {
    itemId: manifest.id,
    installedVersion: manifest.version,
    libraryId: library.id,
    installPath: `${library.path}\\${manifest.defaultInstallFolder}`,
    installedAt: now(),
    lastVerifiedAt: now(),
    lastLaunchedAt: existing?.lastLaunchedAt ?? null,
    sizeOnDiskBytes: manifest.installSizeBytes,
    status: "installed",
    lastError: null
  };

  installedItems = [
    ...installedItems.filter((item) => item.itemId !== manifest.id),
    nextInstall
  ];

  const collectionEntry = ensureCollectionEntry(manifest.id);
  collectionEntry.lastError = null;
  collectionEntry.lastErrorAt = null;
  save();
}

function startMockJob(itemId: string, libraryId: string, operation: InstallJob["operation"]) {
  const manifest = catalog.find((entry) => entry.id === itemId);
  if (!manifest) {
    throw { message: "Item manifest is not available" };
  }

  const job: InstallJob = {
    id: crypto.randomUUID(),
    itemId,
    itemName: manifest.name,
    libraryId,
    operation,
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

  state.jobs.push(job);
  save();

  const timer = window.setInterval(() => {
    const current = state.jobs.find((entry) => entry.id === job.id);
    if (!current || current.status !== "running") {
      window.clearInterval(timer);
      return;
    }

    current.progress = Math.min(100, current.progress + 12);
    current.bytesDownloaded = Math.round((current.progress / 100) * current.bytesTotal);
    current.phase = current.progress > 70 ? "installing" : "downloading";
    current.message =
      current.progress > 70
        ? operation === "update"
          ? "Applying update files"
          : "Writing local files"
        : "Staging package";
    current.updatedAt = now();

    if (current.progress >= 100) {
      window.clearInterval(timer);
      completeJob(current.id);
    }
    save();
  }, 350);

  return job;
}

export const mockApi = {
  async bootstrap() {
    save();
    return buildSnapshot();
  },
  async getSnapshot() {
    save();
    return buildSnapshot();
  },
  async completeOnboarding(libraryPath: string | null) {
    if (state.config.libraries.length === 0) {
      const library = makeLibrary(libraryPath ?? state.recommendedLibraryPath);
      state.config.libraries = [library];
      state.config.defaultLibraryId = library.id;
    }
    state.config.onboardingCompleted = true;
    save();
    return buildSnapshot();
  },
  async addLibrary(name: string, path: string) {
    const library = makeLibrary(path);
    library.name = name;
    library.isDefault = state.config.libraries.length === 0;
    state.config.libraries.push(library);
    if (library.isDefault) state.config.defaultLibraryId = library.id;
    save();
    return buildSnapshot();
  },
  async renameLibrary(libraryId: string, name: string) {
    const library = state.config.libraries.find((entry) => entry.id === libraryId);
    if (library) library.name = name;
    save();
    return buildSnapshot();
  },
  async removeLibrary(libraryId: string) {
    state.config.libraries = state.config.libraries.filter((entry) => entry.id !== libraryId);
    if (state.config.defaultLibraryId === libraryId) {
      state.config.defaultLibraryId = state.config.libraries[0]?.id ?? null;
    }
    save();
    return buildSnapshot();
  },
  async setDefaultLibrary(libraryId: string) {
    state.config.defaultLibraryId = libraryId;
    state.config.libraries = state.config.libraries.map((library) => ({
      ...library,
      isDefault: library.id === libraryId
    }));
    save();
    return buildSnapshot();
  },
  async addItemToLibrary(itemId: string) {
    ensureCollectionEntry(itemId);
    save();
    return buildSnapshot();
  },
  async updatePreferences(
    checkLauncherUpdatesOnStart: boolean,
    checkGameUpdatesOnStart: boolean,
    askForLibraryEachInstall: boolean,
    createDesktopShortcuts: boolean,
    keepDownloadCache: boolean
  ) {
    state.config.checkLauncherUpdatesOnStart = checkLauncherUpdatesOnStart;
    state.config.checkGameUpdatesOnStart = checkGameUpdatesOnStart;
    state.config.installBehavior = {
      askForLibraryEachInstall,
      createDesktopShortcuts,
      keepDownloadCache
    };
    save();
    return buildSnapshot();
  },
  async startInstallItem(itemId: string, libraryId: string | null) {
    const selectedLibraryId = libraryId ?? state.config.defaultLibraryId;
    if (!selectedLibraryId) {
      throw { message: "No library is configured" };
    }
    ensureCollectionEntry(itemId);
    return startMockJob(itemId, selectedLibraryId, "install");
  },
  async startUpdateItem(itemId: string) {
    const installed = installedItems.find((entry) => entry.itemId === itemId);
    if (!installed) {
      throw { message: "Item is not installed" };
    }
    return startMockJob(itemId, installed.libraryId, "update");
  },
  async repairItem(itemId: string) {
    const installed = installedItems.find((entry) => entry.itemId === itemId);
    if (!installed) {
      throw { message: "Item is not installed" };
    }
    return startMockJob(itemId, installed.libraryId, "repair");
  },
  async moveInstallItem(itemId: string, targetLibraryId: string) {
    const installed = installedItems.find((entry) => entry.itemId === itemId);
    if (!installed) {
      throw { message: "Item is not installed" };
    }
    installed.libraryId = targetLibraryId;
    const targetLibrary = state.config.libraries.find((library) => library.id === targetLibraryId);
    if (targetLibrary) {
      const folderName = installed.installPath.split("\\").pop() ?? itemId;
      installed.installPath = `${targetLibrary.path}\\${folderName}`;
    }
    installed.lastVerifiedAt = now();
    save();
    return {
      id: crypto.randomUUID(),
      itemId,
      itemName: catalog.find((entry) => entry.id === itemId)?.name ?? itemId,
      libraryId: targetLibraryId,
      operation: "move",
      phase: "completed",
      status: "completed",
      progress: 100,
      message: "Move completed",
      bytesDownloaded: installed.sizeOnDiskBytes,
      bytesTotal: installed.sizeOnDiskBytes,
      startedAt: now(),
      updatedAt: now(),
      error: null
    } satisfies InstallJob;
  },
  async uninstallItem(itemId: string) {
    installedItems = installedItems.filter((entry) => entry.itemId !== itemId);
    save();
    return buildSnapshot();
  },
  async launchItem(itemId: string): Promise<CommandOk> {
    const entry = collectionEntries.find((item) => item.itemId === itemId);
    if (entry) {
      entry.lastUsedAt = now();
      entry.lastError = null;
      entry.lastErrorAt = null;
    }
    const installed = installedItems.find((item) => item.itemId === itemId);
    if (installed) {
      installed.lastLaunchedAt = now();
      installed.lastError = null;
    }
    save();
    return { message: "Mock item launch" };
  },
  async openInstallFolder(_itemId: string): Promise<CommandOk> {
    return { message: "Mock folder open" };
  },
  async checkLauncherUpdates() {
    state.appVersion = releaseInfo.version;
    state.launcherUpdate.currentVersion = releaseInfo.version;
    state.launcherUpdate.checkedAt = now();
    state.launcherUpdate.latestVersion = releaseInfo.version;
    state.launcherUpdate.updateAvailable = false;
    state.launcherUpdate.notes = [...releaseInfo.notes];
    state.launcherUpdate.error = null;
    save();
    return buildSnapshot();
  },
  async checkItemUpdates() {
    save();
    return buildSnapshot();
  },
  async cancelJob(jobId: string) {
    const job = state.jobs.find((entry) => entry.id === jobId);
    if (job) {
      job.status = "cancelled";
      job.phase = "cancelled";
      job.message = "Cancelled";
      job.updatedAt = now();
    }
    save();
    return buildSnapshot();
  },
  async clearCompletedJobs() {
    state.jobs = state.jobs.filter((job) => job.status === "running" || job.status === "queued");
    save();
    return buildSnapshot();
  }
};
