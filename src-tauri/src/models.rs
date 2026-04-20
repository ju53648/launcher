use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherConfig {
    pub onboarding_completed: bool,
    pub libraries: Vec<LibraryFolder>,
    pub default_library_id: Option<String>,
    pub check_launcher_updates_on_start: bool,
    pub check_game_updates_on_start: bool,
    pub install_behavior: InstallBehavior,
    pub manifest_sources: Vec<ManifestSourceConfig>,
    pub privacy: PrivacyConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallBehavior {
    pub ask_for_library_each_install: bool,
    pub create_desktop_shortcuts: bool,
    pub keep_download_cache: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacyConfig {
    pub telemetry_enabled: bool,
    pub crash_upload_enabled: bool,
    pub network_access_note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestSourceConfig {
    pub id: String,
    pub name: String,
    pub url: Option<String>,
    pub enabled: bool,
    pub source_type: ManifestSourceType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ManifestSourceType {
    Embedded,
    GitHubReleases,
    CustomHttp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryFolder {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub last_seen_at: Option<DateTime<Utc>>,
    pub status: LibraryStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibraryStatus {
    Available,
    Missing,
    Inaccessible,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledGame {
    pub game_id: String,
    pub installed_version: String,
    pub library_id: String,
    pub install_path: String,
    pub installed_at: DateTime<Utc>,
    pub last_verified_at: Option<DateTime<Utc>>,
    pub size_on_disk_bytes: u64,
    pub status: InstalledStatus,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum InstalledStatus {
    Installed,
    Broken,
    Updating,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledGamesDb {
    pub games: Vec<InstalledGame>,
    #[serde(default)]
    pub library_entries: Vec<GameLibraryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLibraryEntry {
    pub game_id: String,
    pub added_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub developer: String,
    pub release_date: String,
    pub tags: Vec<String>,
    pub cover_image: String,
    pub banner_image: String,
    pub icon_image: String,
    pub executable: String,
    pub install_size_bytes: u64,
    pub default_install_folder: String,
    pub supported_actions: Vec<GameAction>,
    pub install_strategy: InstallStrategy,
    pub download: DownloadSource,
    pub changelog: Vec<ChangelogEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GameAction {
    Install,
    Launch,
    Update,
    Repair,
    Uninstall,
    OpenFolder,
    MoveInstall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum InstallStrategy {
    Synthetic {
        #[serde(rename = "executableTemplate", alias = "executable_template")]
        executable_template: String,
        #[serde(rename = "contentFiles", alias = "content_files")]
        content_files: Vec<SyntheticFile>,
    },
    ZipArchive {
        #[serde(rename = "rootFolder", alias = "root_folder")]
        root_folder: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyntheticFile {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum DownloadSource {
    LocalSynthetic {
        integrity: String,
    },
    HttpArchive {
        url: String,
        sha256: String,
        #[serde(rename = "sizeBytes", alias = "size_bytes")]
        size_bytes: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangelogEntry {
    pub version: String,
    pub date: String,
    pub items: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSnapshot {
    pub app_version: String,
    pub data_dir: String,
    pub cache_dir: String,
    pub logs_dir: String,
    pub recommended_library_path: String,
    pub manifest_errors: Vec<String>,
    pub config: LauncherConfig,
    pub games: Vec<GameView>,
    pub jobs: Vec<InstallJob>,
    pub launcher_update: LauncherUpdateState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameView {
    pub manifest: GameManifest,
    pub status: GameStatus,
    pub ownership_status: GameOwnershipStatus,
    pub installed: Option<InstalledGame>,
    pub library_entry: Option<GameLibraryEntry>,
    pub active_job: Option<InstallJob>,
    pub available_update: Option<GameUpdateInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GameStatus {
    NotInstalled,
    Installing,
    Installed,
    UpdateAvailable,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GameOwnershipStatus {
    NotAdded,
    Added,
    Installed,
    UpdateAvailable,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameUpdateInfo {
    pub current_version: String,
    pub available_version: String,
    pub changelog: Vec<ChangelogEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallJob {
    pub id: String,
    pub game_id: String,
    pub game_name: String,
    pub library_id: String,
    pub phase: InstallPhase,
    pub status: JobStatus,
    pub progress: f32,
    pub message: String,
    pub bytes_downloaded: u64,
    pub bytes_total: u64,
    pub started_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum InstallPhase {
    Queued,
    Preparing,
    Downloading,
    Verifying,
    Installing,
    Finalizing,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum JobStatus {
    Queued,
    Running,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherUpdateState {
    pub current_version: String,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub checked_at: Option<DateTime<Utc>>,
    pub release_url: Option<String>,
    pub notes: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherReleaseManifest {
    pub version: String,
    pub release_url: String,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandOk {
    pub message: String,
}
