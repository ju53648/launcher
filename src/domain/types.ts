export type LibraryStatus = "available" | "missing" | "inaccessible";

export type GameStatus =
  | "notInstalled"
  | "installing"
  | "installed"
  | "updateAvailable"
  | "error";

export type JobStatus = "queued" | "running" | "completed" | "cancelled" | "failed";

export type InstallPhase =
  | "queued"
  | "preparing"
  | "downloading"
  | "verifying"
  | "installing"
  | "finalizing"
  | "completed"
  | "cancelled"
  | "failed";

export type GameAction =
  | "install"
  | "launch"
  | "update"
  | "repair"
  | "uninstall"
  | "openFolder"
  | "moveInstall";

export interface LauncherConfig {
  onboardingCompleted: boolean;
  libraries: LibraryFolder[];
  defaultLibraryId: string | null;
  checkLauncherUpdatesOnStart: boolean;
  checkGameUpdatesOnStart: boolean;
  installBehavior: InstallBehavior;
  manifestSources: ManifestSourceConfig[];
  privacy: PrivacyConfig;
}

export interface InstallBehavior {
  askForLibraryEachInstall: boolean;
  createDesktopShortcuts: boolean;
  keepDownloadCache: boolean;
}

export interface PrivacyConfig {
  telemetryEnabled: boolean;
  crashUploadEnabled: boolean;
  networkAccessNote: string;
}

export interface ManifestSourceConfig {
  id: string;
  name: string;
  url: string | null;
  enabled: boolean;
  sourceType: "embedded" | "gitHubReleases" | "customHttp";
}

export interface LibraryFolder {
  id: string;
  name: string;
  path: string;
  isDefault: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  status: LibraryStatus;
}

export interface GameManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  developer: string;
  releaseDate: string;
  tags: string[];
  coverImage: string;
  bannerImage: string;
  iconImage: string;
  executable: string;
  installSizeBytes: number;
  defaultInstallFolder: string;
  supportedActions: GameAction[];
  installStrategy: InstallStrategy;
  download: DownloadSource;
  changelog: ChangelogEntry[];
}

export type InstallStrategy =
  | {
      kind: "synthetic";
      executableTemplate: string;
      contentFiles: SyntheticFile[];
    }
  | {
      kind: "zipArchive";
      rootFolder: string | null;
    };

export interface SyntheticFile {
  path: string;
  content: string;
}

export type DownloadSource =
  | {
      kind: "localSynthetic";
      integrity: string;
    }
  | {
      kind: "httpArchive";
      url: string;
      sha256: string;
      sizeBytes: number;
    };

export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

export interface InstalledGame {
  gameId: string;
  installedVersion: string;
  libraryId: string;
  installPath: string;
  installedAt: string;
  lastVerifiedAt: string | null;
  sizeOnDiskBytes: number;
  status: "installed" | "broken" | "updating";
  lastError: string | null;
}

export interface GameUpdateInfo {
  currentVersion: string;
  availableVersion: string;
  changelog: ChangelogEntry[];
}

export interface InstallJob {
  id: string;
  gameId: string;
  gameName: string;
  libraryId: string;
  phase: InstallPhase;
  status: JobStatus;
  progress: number;
  message: string;
  bytesDownloaded: number;
  bytesTotal: number;
  startedAt: string;
  updatedAt: string;
  error: string | null;
}

export interface LauncherUpdateState {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  checkedAt: string | null;
  releaseUrl: string | null;
  notes: string[];
  error: string | null;
}

export interface GameView {
  manifest: GameManifest;
  status: GameStatus;
  installed: InstalledGame | null;
  activeJob: InstallJob | null;
  availableUpdate: GameUpdateInfo | null;
}

export interface LauncherSnapshot {
  appVersion: string;
  dataDir: string;
  cacheDir: string;
  logsDir: string;
  recommendedLibraryPath: string;
  manifestErrors: string[];
  config: LauncherConfig;
  games: GameView[];
  jobs: InstallJob[];
  launcherUpdate: LauncherUpdateState;
}

export interface CommandOk {
  message: string;
}

export interface LauncherError {
  code?: string;
  message: string;
}
