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
  LauncherLanguage,
  LauncherSnapshot,
  LibraryFolder
} from "../domain/types";
import { setEmbeddedGameId } from "../domain/embeddedGameSession";
import { normalizeContentTags } from "../domain/tags";
import { releaseInfo } from "../releaseInfo";

const now = () => new Date().toISOString();
const RETIRED_ITEM_IDS = new Set([buildRetiredItemIdA(), buildRetiredItemIdB()]);

function buildMockManifest({
  id,
  slug,
  name,
  version,
  description,
  releaseDate,
  categories,
  tags,
  executable,
  installSizeBytes,
  defaultInstallFolder,
  changelog
}: {
  id: string;
  slug: string;
  name: string;
  version: string;
  description: string;
  releaseDate: string;
  categories: string[];
  tags: ContentManifest["tags"];
  executable: string;
  installSizeBytes: number;
  defaultInstallFolder: string;
  changelog: ContentManifest["changelog"];
}): ContentManifest {
  return {
    id,
    itemType: "game",
    platform: "desktop",
    name,
    version,
    description,
    developer: "Lumorix",
    releaseDate,
    categories,
    tags,
    coverImage: `/assets/games/${slug}-cover.svg`,
    bannerImage: `/assets/games/${slug}-banner.svg`,
    iconImage: `/assets/games/${slug}-icon.svg`,
    executable,
    installSizeBytes,
    defaultInstallFolder,
    supportedActions: ["install", "launch", "repair", "uninstall", "openFolder"],
    installStrategy: {
      kind: "synthetic",
      executableTemplate:
        "@echo off\nsetlocal\nset \"GAME_ROOT=%~dp0..\"\nstart \"\" \"%GAME_ROOT%\\index.html\"\n",
      contentFiles: []
    },
    download: {
      kind: "localSynthetic",
      integrity: `embedded-${slug}-${version}`
    },
    changelog
  };
}

const catalog: ContentManifest[] = [
  {
    id: "com.lumorix.dropdash",
    itemType: "game",
    platform: "desktop",
    name: "Lumorix DropDash",
    version: "1.0.0",
    description:
      "A compact offline arcade release for validating installs, launches, repairs, and uninstall flows across the launcher.",
    developer: "Lumorix",
    releaseDate: "2026-04-20",
    categories: ["Arcade", "Offline"],
    tags: [
      { id: "arcade", weight: 3 },
      { id: "offline", weight: 3 },
      { id: "city", weight: 1 },
      { id: "exploration", weight: 1 }
    ],
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
          "Initial launcher-ready release.",
          "Offline arcade loop for install and launch validation."
        ]
      }
    ]
  },
  {
    id: "com.lumorix.echo-protocol",
    itemType: "game",
    platform: "desktop",
    name: "Echo Protocol",
    version: "0.1.0",
    description:
      "A psychological mystery game where choices rewrite memory, facts and identity.",
    developer: "Lumorix",
    releaseDate: "2026-04-28",
    categories: ["Mystery", "Thriller", "Story"],
    tags: [
      { id: "horror", weight: 3 },
      { id: "narrative", weight: 3 },
      { id: "offline", weight: 3 },
      { id: "exploration", weight: 2 }
    ],
    coverImage: "/assets/games/echo-protocol-cover.svg",
    bannerImage: "/assets/games/echo-protocol-banner.svg",
    iconImage: "/assets/games/echo-protocol-icon.svg",
    executable: "bin\\launch.cmd",
    installSizeBytes: 32768,
    defaultInstallFolder: "Echo Protocol",
    supportedActions: ["install", "launch", "repair", "uninstall", "openFolder"],
    installStrategy: {
      kind: "synthetic",
      executableTemplate:
        "@echo off\nsetlocal\nset \"GAME_ROOT=%~dp0..\"\nstart \"\" \"%GAME_ROOT%\\index.html\"\n",
      contentFiles: []
    },
    download: {
      kind: "localSynthetic",
      integrity: "embedded-echo-protocol-0.1.0"
    },
    changelog: [
      {
        version: "0.1.0",
        date: "2026-04-28",
        items: [
          "Initial launcher-ready release of Echo Protocol.",
          "Adds branching scenes, choices and multiple endings.",
          "Implements local save/continue and reality-shift text changes."
        ]
      }
    ]
  },
  buildMockManifest({
    id: "com.lumorix.frostline-courier",
    slug: "frostline-courier",
    name: "Frostline Courier",
    version: "1.3.2",
    description:
      "Route fragile cargo through whiteout corridors, ration heat, and keep the convoy alive one risky delivery at a time.",
    releaseDate: "2026-05-02",
    categories: ["Survival", "Logistics", "Snow"],
    tags: [
      { id: "survival", weight: 3 },
      { id: "exploration", weight: 2 },
      { id: "offline", weight: 3 },
      { id: "open_world", weight: 1 }
    ],
    executable: "runtime\\FrostlineCourier.exe",
    installSizeBytes: 842_137_600,
    defaultInstallFolder: "Frostline Courier",
    changelog: [
      {
        version: "1.3.2",
        date: "2026-05-02",
        items: [
          "Adds storm-routing modifiers and a cleaner cargo risk readout.",
          "Improves recovery pacing after failed deliveries."
        ]
      }
    ]
  }),
  buildMockManifest({
    id: "com.lumorix.glass-garden",
    slug: "glass-garden",
    name: "Glass Garden",
    version: "1.1.0",
    description:
      "Grow a crystalline sanctuary, balance light and soil chemistry, and sculpt a slow-burn world that reacts to every planting choice.",
    releaseDate: "2026-05-05",
    categories: ["Sandbox", "Builder", "Calm"],
    tags: [
      { id: "sandbox", weight: 3 },
      { id: "building", weight: 3 },
      { id: "crafting", weight: 2 },
      { id: "offline", weight: 3 }
    ],
    executable: "runtime\\GlassGarden.exe",
    installSizeBytes: 695_205_888,
    defaultInstallFolder: "Glass Garden",
    changelog: [
      {
        version: "1.1.0",
        date: "2026-05-05",
        items: [
          "Introduces bloom chains that reward careful biome planning.",
          "Polishes ambient growth feedback and greenhouse readability."
        ]
      }
    ]
  }),
  buildMockManifest({
    id: "com.lumorix.graveyard-shift",
    slug: "graveyard-shift",
    name: "Graveyard Shift",
    version: "0.9.6",
    description:
      "Work the cemetery after midnight, survive what should stay buried, and decide which rituals are worth the cost of seeing dawn.",
    releaseDate: "2026-04-30",
    categories: ["Horror", "Survival", "Night Shift"],
    tags: [
      { id: "horror", weight: 3 },
      { id: "survival", weight: 3 },
      { id: "offline", weight: 3 },
      { id: "exploration", weight: 2 }
    ],
    executable: "runtime\\GraveyardShift.exe",
    installSizeBytes: 918_552_576,
    defaultInstallFolder: "Graveyard Shift",
    changelog: [
      {
        version: "0.9.6",
        date: "2026-04-30",
        items: [
          "Rebalances panic spikes so the late-game dread feels earned, not random.",
          "Sharpens creature silhouettes during low-light encounters."
        ]
      }
    ]
  }),
  buildMockManifest({
    id: "com.lumorix.neon-circuit",
    slug: "neon-circuit",
    name: "Neon Circuit",
    version: "1.4.1",
    description:
      "A velocity-first shooter set above a sleepless megacity, built around lane swaps, precision bursts, and clean arcade flow.",
    releaseDate: "2026-05-07",
    categories: ["Shooter", "Arcade", "Cyberpunk"],
    tags: [
      { id: "shooter", weight: 3 },
      { id: "arcade", weight: 3 },
      { id: "city", weight: 2 },
      { id: "offline", weight: 3 }
    ],
    executable: "runtime\\NeonCircuit.exe",
    installSizeBytes: 603_979_776,
    defaultInstallFolder: "Neon Circuit",
    changelog: [
      {
        version: "1.4.1",
        date: "2026-05-07",
        items: [
          "Tightens hit feedback and score chaining during high-speed sections.",
          "Adds a cleaner route preview before boss transitions."
        ]
      }
    ]
  }),
  buildMockManifest({
    id: "com.lumorix.pocket-heist",
    slug: "pocket-heist",
    name: "Pocket Heist",
    version: "1.0.4",
    description:
      "Scout tiny urban sandboxes, improvise silent entries, and turn near-disasters into stylish getaways before the block wakes up.",
    releaseDate: "2026-05-01",
    categories: ["Stealth", "Sandbox", "City"],
    tags: [
      { id: "sandbox", weight: 3 },
      { id: "city", weight: 2 },
      { id: "exploration", weight: 2 },
      { id: "offline", weight: 3 }
    ],
    executable: "runtime\\PocketHeist.exe",
    installSizeBytes: 512_753_664,
    defaultInstallFolder: "Pocket Heist",
    changelog: [
      {
        version: "1.0.4",
        date: "2026-05-01",
        items: [
          "Improves patrol readability and getaway timing in dense districts.",
          "Speeds up restarts so stealth iteration feels immediate."
        ]
      }
    ]
  }),
  buildMockManifest({
    id: "com.lumorix.tempo-trashfire",
    slug: "tempo-trashfire",
    name: "Tempo Trashfire",
    version: "0.8.9",
    description:
      "Keep a collapsing gig alive with rhythm-driven repairs, panic management, and just enough style to survive another chorus.",
    releaseDate: "2026-04-27",
    categories: ["Rhythm", "Arcade", "Comedy"],
    tags: [
      { id: "arcade", weight: 3 },
      { id: "narrative", weight: 2 },
      { id: "offline", weight: 3 },
      { id: "city", weight: 1 }
    ],
    executable: "runtime\\TempoTrashfire.exe",
    installSizeBytes: 438_304_768,
    defaultInstallFolder: "Tempo Trashfire",
    changelog: [
      {
        version: "0.8.9",
        date: "2026-04-27",
        items: [
          "Pushes beat windows toward a snappier arcade feel.",
          "Adds stronger crowd-state feedback when a run starts to implode."
        ]
      }
    ]
  }),
  buildMockManifest({
    id: "com.lumorix.velvet-rook",
    slug: "velvet-rook",
    name: "Velvet Rook",
    version: "1.2.0",
    description:
      "Unpack a velvet-draped conspiracy through social duels, curated clues, and elegant city spaces that hide more than they show.",
    releaseDate: "2026-05-03",
    categories: ["Narrative", "Mystery", "City"],
    tags: [
      { id: "narrative", weight: 3 },
      { id: "city", weight: 2 },
      { id: "exploration", weight: 2 },
      { id: "offline", weight: 3 }
    ],
    executable: "runtime\\VelvetRook.exe",
    installSizeBytes: 774_111_232,
    defaultInstallFolder: "Velvet Rook",
    changelog: [
      {
        version: "1.2.0",
        date: "2026-05-03",
        items: [
          "Expands clue-linking clarity during high-suspicion conversations.",
          "Refines chapter transitions to hold tension between investigations."
        ]
      }
    ]
  }),
  buildMockManifest({
    id: "com.lumorix.word-reactor",
    slug: "word-reactor",
    name: "Word Reactor",
    version: "1.0.7",
    description:
      "Chain unstable words under lab pressure, juggle heat and timing, and turn a language puzzle into an escalating score attack.",
    releaseDate: "2026-05-06",
    categories: ["Puzzle", "Arcade", "Lab"],
    tags: [
      { id: "arcade", weight: 3 },
      { id: "utility", weight: 2 },
      { id: "offline", weight: 3 },
      { id: "lab", weight: 2 }
    ],
    executable: "runtime\\WordReactor.exe",
    installSizeBytes: 286_261_248,
    defaultInstallFolder: "Word Reactor",
    changelog: [
      {
        version: "1.0.7",
        date: "2026-05-06",
        items: [
          "Improves combo legibility during fast chain reactions.",
          "Retunes reactor overheat pacing to create better comeback windows."
        ]
      }
    ]
  })
];

let collectionEntries = loadCollectionEntries();
let installedItems = loadInstalledItems();
let state = loadState();
const runningItemIds = new Set<string>();
let activeMockJobTimer: number | null = null;

function loadCollectionEntries(): CollectionEntry[] {
  const saved = localStorage.getItem("lumorix.mock.collectionEntries");
  if (!saved) return [];

  return (JSON.parse(saved) as CollectionEntry[])
    .filter((entry) => !RETIRED_ITEM_IDS.has(entry.itemId))
    .map((entry) => ({
      ...entry,
      totalPlaytimeMinutes: entry.totalPlaytimeMinutes ?? 0,
      catalog: {
        ...entry.catalog,
        platform: entry.catalog.platform ?? "desktop",
        tags: normalizeContentTags(entry.catalog.tags)
      }
    }));
}

function loadInstalledItems(): InstalledItem[] {
  const saved = localStorage.getItem("lumorix.mock.installedItems");
  return saved
    ? (JSON.parse(saved) as InstalledItem[]).filter((item) => !RETIRED_ITEM_IDS.has(item.itemId))
    : [];
}

function loadState(): Omit<LauncherSnapshot, "items"> {
  const saved = localStorage.getItem("lumorix.mock.state");
  if (saved) {
    const parsed = JSON.parse(saved) as Omit<LauncherSnapshot, "items">;
    return {
      ...parsed,
      config: {
        ...parsed.config,
        language: parsed.config.language ?? null
      },
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
      language: null,
      libraries: [],
      defaultLibraryId: null,
      checkLauncherUpdatesOnStart: false,
      checkGameUpdatesOnStart: true,
      installBehavior: {
        askForLibraryEachInstall: false,
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
        ? catalogRecordFromManifest(manifest)
        : collectionEntry?.catalog ?? {
            id: itemId,
            itemType: "game",
            platform: "desktop",
            name: itemId,
            description: "This item remains in your library, but its catalog page is no longer available.",
            developer: "Lumorix",
            releaseDate: "",
            categories: ["Games"],
            tags: [{ id: "offline", weight: 1 }],
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
        isRunning: runningItemIds.has(itemId),
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
    existing.catalog = catalogRecordFromManifest(manifest);
    existing.lastError = null;
    existing.lastErrorAt = null;
    return existing;
  }

  const entry: CollectionEntry = {
    itemId,
    discoverable: true,
    addedAt: now(),
    lastUsedAt: null,
    totalPlaytimeMinutes: 0,
    lastError: null,
    lastErrorAt: null,
    catalog: catalogRecordFromManifest(manifest)
  };
  collectionEntries = [...collectionEntries, entry];
  return entry;
}

function makeLibrary(path: string): LibraryFolder {
  return {
    id: crypto.randomUUID(),
    name: defaultLibraryName(state.config.language),
    path,
    isDefault: true,
    createdAt: now(),
    lastSeenAt: now(),
    status: "available"
  };
}

function defaultLibraryName(language: LauncherLanguage | null) {
  switch (language) {
    case "de":
      return "Hauptbibliothek";
    case "pl":
      return "Biblioteka glowna";
    default:
      return "Main Library";
  }
}

function buildRetiredItemIdA() {
  return String.fromCharCode(
    99, 111, 109, 46, 108, 117, 109, 111, 114, 105, 120, 46, 115, 105, 103, 110, 97, 108, 45,
    108, 97, 98
  );
}

function buildRetiredItemIdB() {
  return String.fromCharCode(
    99, 111, 109, 46, 108, 117, 109, 111, 114, 105, 120, 46, 112, 114, 111, 106, 101, 99, 116,
    45, 97, 116, 108, 97, 115
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw { message: "Unable to copy install path in browser preview" };
  }
}

function catalogRecordFromManifest(manifest: ContentManifest) {
  return {
    id: manifest.id,
    itemType: manifest.itemType,
    platform: manifest.platform,
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
}

function hasActiveJob(itemId: string) {
  return state.jobs.some(
    (job) => job.itemId === itemId && (job.status === "queued" || job.status === "running")
  );
}

function sortJobsByStartTime(left: InstallJob, right: InstallJob) {
  return new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime();
}

function queuedJobMessage() {
  return "Waiting for the current transfer to finish";
}

function startJobMessage(operation: InstallJob["operation"]) {
  switch (operation) {
    case "update":
      return "Preparing update package";
    case "repair":
      return "Inspecting local files";
    case "move":
      return "Preparing files for move";
    default:
      return "Preparing local package";
  }
}

function progressJobMessage(operation: InstallJob["operation"], progress: number) {
  const latePhase = progress > 70;

  switch (operation) {
    case "update":
      return latePhase ? "Applying update files" : "Staging update package";
    case "repair":
      return latePhase ? "Rewriting affected files" : "Verifying local files";
    case "move":
      return latePhase ? "Relocating installed files" : "Preparing move payload";
    default:
      return latePhase ? "Writing local files" : "Staging package";
  }
}

function completedJobMessage(operation: InstallJob["operation"]) {
  switch (operation) {
    case "update":
      return "Update completed";
    case "repair":
      return "Repair completed";
    case "move":
      return "Move completed";
    default:
      return "Ready to use";
  }
}

function failJob(job: InstallJob, message: string) {
  job.status = "failed";
  job.phase = "failed";
  job.error = message;
  job.message = message;
  job.updatedAt = now();
  save();
  resumeMockJobs();
}

function getRunningMockJob() {
  const runningJobs = [...state.jobs]
    .filter((job) => job.status === "running")
    .sort(sortJobsByStartTime);

  for (const job of runningJobs.slice(1)) {
    job.status = "queued";
    job.phase = "queued";
    job.progress = 0;
    job.bytesDownloaded = 0;
    job.message = queuedJobMessage();
    job.updatedAt = now();
  }

  return (
    runningJobs[0] ?? null
  );
}

function startJobExecution(jobId: string) {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (!job) {
    return;
  }

  job.status = "running";
  job.phase = job.progress > 70 ? "installing" : "downloading";
  job.progress = Math.max(job.progress, 3);
  job.bytesDownloaded = Math.round((job.progress / 100) * job.bytesTotal);
  job.message = startJobMessage(job.operation);
  job.updatedAt = now();
  save();

  if (activeMockJobTimer) {
    window.clearInterval(activeMockJobTimer);
  }

  activeMockJobTimer = window.setInterval(() => {
    const current = state.jobs.find((entry) => entry.id === job.id);
    if (!current || current.status !== "running") {
      if (activeMockJobTimer) {
        window.clearInterval(activeMockJobTimer);
        activeMockJobTimer = null;
      }
      resumeMockJobs();
      return;
    }

    current.progress = Math.min(100, current.progress + 12);
    current.bytesDownloaded = Math.round((current.progress / 100) * current.bytesTotal);
    current.phase = current.progress > 70 ? "installing" : "downloading";
    current.message = progressJobMessage(current.operation, current.progress);
    current.updatedAt = now();

    if (current.progress >= 100) {
      if (activeMockJobTimer) {
        window.clearInterval(activeMockJobTimer);
        activeMockJobTimer = null;
      }
      completeJob(current.id);
      return;
    }

    save();
  }, 350);
}

function resumeMockJobs() {
  if (activeMockJobTimer) {
    return;
  }

  const runningJob = getRunningMockJob();
  if (runningJob) {
    startJobExecution(runningJob.id);
    return;
  }

  const nextQueuedJob =
    [...state.jobs]
      .filter((job) => job.status === "queued")
      .sort(sortJobsByStartTime)[0] ?? null;

  if (!nextQueuedJob) {
    return;
  }

  startJobExecution(nextQueuedJob.id);
}

function completeJob(jobId: string) {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (!job || job.status === "cancelled") return;

  const manifest = catalog.find((entry) => entry.id === job.itemId);
  const library = state.config.libraries.find((entry) => entry.id === job.libraryId);
  if (!library) {
    failJob(job, "Target library is no longer available");
    return;
  }

  job.status = "completed";
  job.phase = "completed";
  job.progress = 100;
  job.message = completedJobMessage(job.operation);
  job.updatedAt = now();

  if (job.operation === "move") {
    const installed = installedItems.find((item) => item.itemId === job.itemId);
    if (!installed) {
      failJob(job, "Installed files are no longer available for this move");
      return;
    }

    const folderName = installed.installPath.split("\\").pop() ?? job.itemId;
    installed.libraryId = library.id;
    installed.installPath = `${library.path}\\${folderName}`;
    installed.lastVerifiedAt = now();
    installed.lastError = null;
    installed.status = "installed";

    const collectionEntry = ensureCollectionEntry(job.itemId);
    collectionEntry.lastError = null;
    collectionEntry.lastErrorAt = null;
    save();
    resumeMockJobs();
    return;
  }

  if (!manifest) {
    failJob(job, "Item manifest is no longer available");
    return;
  }

  const existing = installedItems.find((item) => item.itemId === manifest.id);
  if (job.operation !== "install" && !existing) {
    failJob(job, "Installed files are no longer available for this queued transfer");
    return;
  }
  const nextInstalledVersion =
    job.operation === "repair"
      ? existing?.installedVersion ?? manifest.version
      : manifest.version;
  const nextLibraryId = existing?.libraryId ?? library.id;
  const nextInstallPath =
    existing?.installPath ?? `${library.path}\\${manifest.defaultInstallFolder}`;
  const nextSizeOnDiskBytes =
    job.operation === "repair"
      ? existing?.sizeOnDiskBytes ?? manifest.installSizeBytes
      : manifest.installSizeBytes;
  const nextInstall: InstalledItem = {
    itemId: manifest.id,
    installedVersion: nextInstalledVersion,
    libraryId: nextLibraryId,
    installPath: nextInstallPath,
    installedAt: existing?.installedAt ?? now(),
    lastVerifiedAt: now(),
    lastLaunchedAt: existing?.lastLaunchedAt ?? null,
    sizeOnDiskBytes: nextSizeOnDiskBytes,
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
  resumeMockJobs();
}

function startMockJob(itemId: string, libraryId: string, operation: InstallJob["operation"]) {
  const manifest = catalog.find((entry) => entry.id === itemId);
  if (!manifest) {
    throw { message: "Item manifest is not available" };
  }

  const shouldQueue = state.jobs.some((entry) => entry.status === "running" || entry.status === "queued");
  const bytesTotal =
    operation === "move"
      ? installedItems.find((entry) => entry.itemId === itemId)?.sizeOnDiskBytes ?? manifest.installSizeBytes
      : manifest.installSizeBytes;
  const job: InstallJob = {
    id: crypto.randomUUID(),
    itemId,
    itemName: manifest.name,
    libraryId,
    operation,
    phase: shouldQueue ? "queued" : "downloading",
    status: shouldQueue ? "queued" : "running",
    progress: shouldQueue ? 0 : 3,
    message: shouldQueue ? queuedJobMessage() : startJobMessage(operation),
    bytesDownloaded: 0,
    bytesTotal,
    startedAt: now(),
    updatedAt: now(),
    error: null
  };

  state.jobs.push(job);
  save();
  resumeMockJobs();
  return job;
}

export const mockApi = {
  async bootstrap() {
    resumeMockJobs();
    save();
    return buildSnapshot();
  },
  async getSnapshot() {
    resumeMockJobs();
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
  async removeItemFromLibrary(itemId: string) {
    if (hasActiveJob(itemId)) {
      throw { message: "Wait for the active transfer to finish before removing this item" };
    }

    if (installedItems.some((entry) => entry.itemId === itemId)) {
      throw { message: "Installed items must be uninstalled before removal" };
    }

    const before = collectionEntries.length;
    collectionEntries = collectionEntries.filter((entry) => entry.itemId !== itemId);
    if (before === collectionEntries.length) {
      throw { message: "Item is not in the library" };
    }

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
  async setLanguage(language: LauncherLanguage) {
    state.config.language = language;
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

    return startMockJob(itemId, targetLibraryId, "move");
  },
  async uninstallItem(itemId: string) {
    if (runningItemIds.has(itemId)) {
      throw { message: "Close the running item before uninstalling it" };
    }

    if (hasActiveJob(itemId)) {
      throw { message: "Wait for the active transfer to finish before uninstalling this item" };
    }

    installedItems = installedItems.filter((entry) => entry.itemId !== itemId);
    save();
    return buildSnapshot();
  },
  async launchItem(itemId: string): Promise<CommandOk> {
    if (runningItemIds.has(itemId)) {
      throw { message: "Item is already running" };
    }

    const entry = collectionEntries.find((item) => item.itemId === itemId);
    if (entry) {
      entry.lastUsedAt = now();
      entry.totalPlaytimeMinutes += 1;
      entry.lastError = null;
      entry.lastErrorAt = null;
    }
    const installed = installedItems.find((item) => item.itemId === itemId);
    if (installed) {
      installed.lastLaunchedAt = now();
      installed.lastError = null;
    }
    runningItemIds.add(itemId);
    if (itemId === "com.lumorix.echo-protocol") {
      setEmbeddedGameId(itemId);
    }
    save();
    return { message: "Item launched" };
  },
  async closeItem(itemId: string): Promise<CommandOk> {
    if (!runningItemIds.has(itemId)) {
      if (itemId === "com.lumorix.echo-protocol") {
        setEmbeddedGameId(null);
      }
      save();
      return { message: "Item already closed" };
    }
    runningItemIds.delete(itemId);
    if (itemId === "com.lumorix.echo-protocol") {
      setEmbeddedGameId(null);
    }
    save();
    return { message: "Item closed" };
  },
  async openInstallFolder(itemId: string): Promise<CommandOk> {
    const installed = installedItems.find((entry) => entry.itemId === itemId);
    if (!installed) {
      throw { message: "Item is not installed" };
    }

    await copyTextToClipboard(installed.installPath);
    return { message: "Install path copied" };
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
    const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
    const checkedAt = now();

    for (const installed of installedItems) {
      installed.lastVerifiedAt = checkedAt;

      const manifest = catalogById.get(installed.itemId);
      if (!manifest) {
        installed.status = "broken";
        installed.lastError = "Catalog entry is missing for this installed item.";
        continue;
      }

      if (installed.status === "broken" && !installed.lastError) {
        installed.lastError = "Item requires repair.";
      }

      if (installed.status !== "broken") {
        installed.status = "installed";
        installed.lastError = null;
      }
    }

    save();
    return buildSnapshot();
  },
  async cancelJob(jobId: string) {
    const job = state.jobs.find((entry) => entry.id === jobId);
    if (job) {
      if (job.status === "running" && activeMockJobTimer) {
        window.clearInterval(activeMockJobTimer);
        activeMockJobTimer = null;
      }
      job.status = "cancelled";
      job.phase = "cancelled";
      job.message =
        job.bytesDownloaded > 0
          ? `Cancelled at ${Math.round(job.progress)}%`
          : "Cancelled before transfer started";
      job.updatedAt = now();
    }
    save();
    resumeMockJobs();
    return buildSnapshot();
  },
  async clearCompletedJobs() {
    state.jobs = state.jobs.filter((job) => job.status === "running" || job.status === "queued");
    save();
    return buildSnapshot();
  }
};
