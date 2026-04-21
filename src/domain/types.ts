export type LibraryStatus = "available" | "missing" | "inaccessible";

export type CatalogItemType = "game" | "tool" | "project";

export type TagWeight = 1 | 2 | 3;

export type TagCategoryId = "gameplay" | "world" | "systems";

export interface ContentTag {
  id: string;
  weight: TagWeight;
}

export type ItemInstallState =
  | "notInstalled"
  | "installing"
  | "installed"
  | "updateAvailable"
  | "error";

export type ItemCollectionStatus =
  | "notAdded"
  | "added"
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

export type InstallOperation = "install" | "update" | "repair" | "move";

export type ItemAction =
  | "install"
  | "launch"
  | "update"
  | "repair"
  | "uninstall"
  | "openFolder"
  | "moveInstall";

export type LauncherLanguage = "en" | "de" | "pl";

export interface LauncherConfig {
  onboardingCompleted: boolean;
  language: LauncherLanguage | null;
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

export interface CatalogItemRecord {
  id: string;
  itemType: CatalogItemType;
  name: string;
  description: string;
  developer: string;
  releaseDate: string;
  categories: string[];
  tags: ContentTag[];
  coverImage: string;
  bannerImage: string;
  iconImage: string;
}

export interface CollectionEntry {
  itemId: string;
  discoverable: boolean;
  addedAt: string;
  lastUsedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  catalog: CatalogItemRecord;
}

export interface ContentManifest {
  id: string;
  itemType: CatalogItemType;
  name: string;
  version: string;
  description: string;
  developer: string;
  releaseDate: string;
  categories: string[];
  tags: ContentTag[];
  coverImage: string;
  bannerImage: string;
  iconImage: string;
  executable: string;
  installSizeBytes: number;
  defaultInstallFolder: string;
  supportedActions: ItemAction[];
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

export interface InstalledItem {
  itemId: string;
  installedVersion: string;
  libraryId: string;
  installPath: string;
  installedAt: string;
  lastVerifiedAt: string | null;
  lastLaunchedAt: string | null;
  sizeOnDiskBytes: number;
  status: "installed" | "broken" | "updating";
  lastError: string | null;
}

export interface ContentUpdateInfo {
  currentVersion: string;
  availableVersion: string;
  changelog: ChangelogEntry[];
}

export interface ContentStateFlags {
  discoverable: boolean;
  added: boolean;
  installed: boolean;
  updateAvailable: boolean;
  error: boolean;
}

export interface InstallJob {
  id: string;
  itemId: string;
  itemName: string;
  libraryId: string;
  operation: InstallOperation;
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

export interface ContentView {
  catalog: CatalogItemRecord;
  manifest: ContentManifest | null;
  state: ContentStateFlags;
  installState: ItemInstallState;
  collectionStatus: ItemCollectionStatus;
  installed: InstalledItem | null;
  collectionEntry: CollectionEntry | null;
  activeJob: InstallJob | null;
  availableUpdate: ContentUpdateInfo | null;
  lastError: string | null;
}

export interface LauncherSnapshot {
  appVersion: string;
  dataDir: string;
  cacheDir: string;
  logsDir: string;
  recommendedLibraryPath: string;
  manifestErrors: string[];
  config: LauncherConfig;
  items: ContentView[];
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
