use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use chrono::Utc;
use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

use crate::{
    libraries::probe_libraries,
    manifest::load_all_manifests,
    models::{
        GameLibraryEntry, GameOwnershipStatus, GameStatus, GameUpdateInfo, GameView,
        InstallBehavior, InstallJob, InstalledGame, InstalledGamesDb, InstalledStatus,
        LauncherConfig, LauncherSnapshot, LauncherUpdateState, ManifestSourceConfig,
        ManifestSourceType, PrivacyConfig,
    },
    paths,
};

pub type Result<T> = std::result::Result<T, CommandError>;

#[derive(Debug, Error)]
pub enum CommandError {
    #[error("Storage error: {0}")]
    Storage(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Manifest error: {0}")]
    Manifest(String),
    #[error("Install error: {0}")]
    Install(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Process error: {0}")]
    Process(String),
}

impl serde::Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        #[derive(Serialize)]
        struct ErrorBody {
            code: &'static str,
            message: String,
        }

        let code = match self {
            CommandError::Storage(_) => "storage",
            CommandError::Validation(_) => "validation",
            CommandError::Manifest(_) => "manifest",
            CommandError::Install(_) => "install",
            CommandError::Network(_) => "network",
            CommandError::Process(_) => "process",
        };

        ErrorBody {
            code,
            message: self.to_string(),
        }
        .serialize(serializer)
    }
}

#[derive(Clone)]
pub struct LauncherRuntime {
    pub data_dir: PathBuf,
    pub cache_dir: PathBuf,
    pub logs_dir: PathBuf,
    pub manifests_dir: PathBuf,
    pub config_path: PathBuf,
    pub installed_db_path: PathBuf,
    pub jobs: Arc<Mutex<Vec<InstallJob>>>,
    pub launcher_update: Arc<Mutex<LauncherUpdateState>>,
}

impl LauncherRuntime {
    pub fn initialize() -> Result<Self> {
        let data_dir = paths::app_data_dir()?;
        let cache_dir = data_dir.join("Cache");
        let logs_dir = data_dir.join("Logs");
        let manifests_dir = data_dir.join("Manifests");

        fs::create_dir_all(&data_dir)
            .map_err(|err| CommandError::Storage(format!("Could not create data directory: {err}")))?;
        fs::create_dir_all(&cache_dir).map_err(|err| {
            CommandError::Storage(format!("Could not create cache directory: {err}"))
        })?;
        fs::create_dir_all(&logs_dir)
            .map_err(|err| CommandError::Storage(format!("Could not create log directory: {err}")))?;
        fs::create_dir_all(&manifests_dir).map_err(|err| {
            CommandError::Storage(format!("Could not create manifest directory: {err}"))
        })?;

        Ok(Self {
            config_path: data_dir.join("launcher-config.json"),
            installed_db_path: data_dir.join("installed-games.json"),
            data_dir,
            cache_dir,
            logs_dir,
            manifests_dir,
            jobs: Arc::new(Mutex::new(Vec::new())),
            launcher_update: Arc::new(Mutex::new(LauncherUpdateState {
                current_version: env!("CARGO_PKG_VERSION").into(),
                latest_version: None,
                update_available: false,
                checked_at: None,
                release_url: None,
                notes: vec![],
                error: None,
            })),
        })
    }

    pub fn load_config(&self) -> Result<LauncherConfig> {
        if !self.config_path.exists() {
            let config = default_config();
            self.save_config(&config)?;
            self.append_log("INFO", "Created default launcher config");
            return Ok(config);
        }

        match read_json(&self.config_path) {
            Ok(config) => Ok(config),
            Err(err) => {
                self.append_log(
                    "WARN",
                    &format!("Config file was unreadable; backing it up and using defaults: {err}"),
                );
                backup_invalid_json(&self.config_path);
                let config = default_config();
                self.save_config(&config)?;
                Ok(config)
            }
        }
    }

    pub fn save_config(&self, config: &LauncherConfig) -> Result<()> {
        write_json(&self.config_path, config)
    }

    pub fn load_installed_db(&self) -> Result<InstalledGamesDb> {
        if !self.installed_db_path.exists() {
            let db = InstalledGamesDb {
                games: vec![],
                library_entries: vec![],
            };
            self.save_installed_db(&db)?;
            self.append_log("INFO", "Created default installed games database");
            return Ok(db);
        }

        match read_json(&self.installed_db_path) {
            Ok(db) => Ok(db),
            Err(err) => {
                self.append_log(
                    "WARN",
                    &format!(
                        "Installed games database was unreadable; backing it up and using defaults: {err}"
                    ),
                );
                backup_invalid_json(&self.installed_db_path);
                let db = InstalledGamesDb {
                    games: vec![],
                    library_entries: vec![],
                };
                self.save_installed_db(&db)?;
                Ok(db)
            }
        }
    }

    pub fn save_installed_db(&self, db: &InstalledGamesDb) -> Result<()> {
        write_json(&self.installed_db_path, db)
    }

    pub fn update_installed_game(&self, game: InstalledGame) -> Result<()> {
        let mut db = self.load_installed_db()?;
        add_library_entry_if_missing(&mut db, &game.game_id);
        if let Some(existing) = db.games.iter_mut().find(|entry| entry.game_id == game.game_id) {
            *existing = game;
        } else {
            db.games.push(game);
        }
        self.save_installed_db(&db)
    }

    pub fn remove_installed_game(&self, game_id: &str) -> Result<()> {
        let mut db = self.load_installed_db()?;
        db.games.retain(|game| game.game_id != game_id);
        self.save_installed_db(&db)
    }

    pub fn add_game_to_library(&self, game_id: &str) -> Result<()> {
        let mut db = self.load_installed_db()?;
        add_library_entry_if_missing(&mut db, game_id);
        self.save_installed_db(&db)
    }

    pub fn append_log(&self, level: &str, message: &str) {
        let file_name = format!("lumorix-{}.log", Utc::now().format("%Y-%m-%d"));
        let path = self.logs_dir.join(file_name);
        let line = format!("{} [{}] {}\n", Utc::now().to_rfc3339(), level, message);
        if let Ok(mut file) = fs::OpenOptions::new().append(true).create(true).open(path) {
            let _ = file.write_all(line.as_bytes());
        }
    }

    pub fn build_snapshot(&self) -> Result<LauncherSnapshot> {
        let mut config = self.load_config()?;
        probe_libraries(&mut config);
        self.save_config(&config)?;

        let manifest_catalog = load_all_manifests(self);
        let manifest_errors = manifest_catalog.errors;
        let manifests = manifest_catalog.manifests;
        let mut installed_db = self.load_installed_db()?;
        let mut db_migrated = false;
        let installed_game_ids: Vec<String> = installed_db
            .games
            .iter()
            .map(|game| game.game_id.clone())
            .collect();
        for game_id in installed_game_ids {
            db_migrated |= add_library_entry_if_missing(&mut installed_db, &game_id);
        }
        if db_migrated {
            self.save_installed_db(&installed_db)?;
        }
        let jobs = self
            .jobs
            .lock()
            .map_err(|_| CommandError::Storage("Install job state is locked".into()))?
            .clone();
        let update_state = self
            .launcher_update
            .lock()
            .map_err(|_| CommandError::Storage("Launcher update state is locked".into()))?
            .clone();

        let games = manifests
            .into_iter()
            .map(|manifest| {
                let installed = installed_db
                    .games
                    .iter()
                    .find(|game| game.game_id == manifest.id)
                    .cloned();
                let library_entry = installed_db
                    .library_entries
                    .iter()
                    .find(|entry| entry.game_id == manifest.id)
                    .cloned();
                let active_job = jobs
                    .iter()
                    .find(|job| {
                        job.game_id == manifest.id
                            && matches!(
                                job.status,
                                crate::models::JobStatus::Queued | crate::models::JobStatus::Running
                            )
                    })
                    .cloned();

                let available_update = installed.as_ref().and_then(|game| {
                    if game.installed_version != manifest.version {
                        Some(GameUpdateInfo {
                            current_version: game.installed_version.clone(),
                            available_version: manifest.version.clone(),
                            changelog: manifest.changelog.clone(),
                        })
                    } else {
                        None
                    }
                });

                let status = if active_job.is_some() {
                    GameStatus::Installing
                } else if installed
                    .as_ref()
                    .is_some_and(|game| game.status == InstalledStatus::Broken)
                {
                    GameStatus::Error
                } else if available_update.is_some() {
                    GameStatus::UpdateAvailable
                } else if installed.is_some() {
                    GameStatus::Installed
                } else {
                    GameStatus::NotInstalled
                };
                let ownership_status = if installed
                    .as_ref()
                    .is_some_and(|game| game.status == InstalledStatus::Broken)
                {
                    GameOwnershipStatus::Error
                } else if available_update.is_some() {
                    GameOwnershipStatus::UpdateAvailable
                } else if installed.is_some() {
                    GameOwnershipStatus::Installed
                } else if library_entry.is_some() {
                    GameOwnershipStatus::Added
                } else {
                    GameOwnershipStatus::NotAdded
                };

                GameView {
                    manifest,
                    status,
                    ownership_status,
                    installed,
                    library_entry,
                    active_job,
                    available_update,
                }
            })
            .collect();

        Ok(LauncherSnapshot {
            app_version: env!("CARGO_PKG_VERSION").into(),
            data_dir: self.data_dir.to_string_lossy().into_owned(),
            cache_dir: self.cache_dir.to_string_lossy().into_owned(),
            logs_dir: self.logs_dir.to_string_lossy().into_owned(),
            recommended_library_path: paths::recommended_library_path()?
                .to_string_lossy()
                .into_owned(),
            manifest_errors,
            config,
            games,
            jobs,
            launcher_update: update_state,
        })
    }
}

fn add_library_entry_if_missing(db: &mut InstalledGamesDb, game_id: &str) -> bool {
    if db
        .library_entries
        .iter()
        .any(|entry| entry.game_id == game_id)
    {
        return false;
    }

    db.library_entries.push(GameLibraryEntry {
        game_id: game_id.into(),
        added_at: Utc::now(),
    });
    true
}

fn default_config() -> LauncherConfig {
    LauncherConfig {
        onboarding_completed: false,
        libraries: vec![],
        default_library_id: None,
        check_launcher_updates_on_start: false,
        check_game_updates_on_start: true,
        install_behavior: InstallBehavior {
            ask_for_library_each_install: true,
            create_desktop_shortcuts: false,
            keep_download_cache: true,
        },
        manifest_sources: vec![ManifestSourceConfig {
            id: "lumorix-embedded".into(),
            name: "Lumorix Embedded Catalog".into(),
            url: None,
            enabled: true,
            source_type: ManifestSourceType::Embedded,
        }],
        privacy: PrivacyConfig {
            telemetry_enabled: false,
            crash_upload_enabled: false,
            network_access_note:
                "Network is only used for manifest checks, downloads and explicit update checks."
                    .into(),
        },
    }
}

pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T> {
    let raw = fs::read_to_string(path)
        .map_err(|err| CommandError::Storage(format!("Could not read {}: {err}", path.display())))?;
    serde_json::from_str(&raw)
        .map_err(|err| CommandError::Storage(format!("Could not parse {}: {err}", path.display())))
}

pub fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            CommandError::Storage(format!("Could not create {}: {err}", parent.display()))
        })?;
    }

    let raw = serde_json::to_string_pretty(value).map_err(|err| {
        CommandError::Storage(format!("Could not serialize {}: {err}", path.display()))
    })?;

    fs::write(path, raw)
        .map_err(|err| CommandError::Storage(format!("Could not write {}: {err}", path.display())))
}

fn backup_invalid_json(path: &Path) {
    if !path.exists() {
        return;
    }

    let backup_path = path.with_extension(format!(
        "invalid-{}.json",
        Utc::now().format("%Y%m%d%H%M%S")
    ));
    let _ = fs::rename(path, backup_path);
}

pub fn directory_size(path: &Path) -> u64 {
    let mut total = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    total += directory_size(&entry_path);
                } else {
                    total += metadata.len();
                }
            }
        }
    }
    total
}
