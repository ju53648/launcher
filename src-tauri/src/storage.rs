use std::{
    collections::BTreeMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use chrono::Utc;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;

use crate::{
    libraries::probe_libraries,
    manifest::load_all_manifests,
    models::{
        CatalogItemRecord, CatalogItemType, CollectionEntry, CollectionStateDb, ContentManifest,
        ContentStateFlags, ContentTag, ContentUpdateInfo, ContentView, InstallBehavior, InstallJob,
        InstalledItem, InstalledItemsDb, InstalledStatus, ItemCollectionStatus,
        ItemInstallState, LauncherConfig, LauncherSnapshot, LauncherUpdateState,
        ManifestSourceConfig, ManifestSourceType, PrivacyConfig,
    },
    paths,
};

const RETIRED_ITEM_ID_A: &[u8] = &[
    99, 111, 109, 46, 108, 117, 109, 111, 114, 105, 120, 46, 115, 105, 103, 110, 97, 108, 45,
    108, 97, 98,
];
const RETIRED_ITEM_ID_B: &[u8] = &[
    99, 111, 109, 46, 108, 117, 109, 111, 114, 105, 120, 46, 112, 114, 111, 106, 101, 99, 116,
    45, 97, 116, 108, 97, 115,
];

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
    pub collection_db_path: PathBuf,
    pub installed_items_path: PathBuf,
    pub legacy_installed_db_path: PathBuf,
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
            collection_db_path: data_dir.join("content-collection.json"),
            installed_items_path: data_dir.join("installed-items.json"),
            legacy_installed_db_path: data_dir.join("installed-games.json"),
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

    pub fn load_collection_db(&self) -> Result<CollectionStateDb> {
        if !self.collection_db_path.exists() {
            let db = default_collection_db();
            self.save_collection_db(&db)?;
            self.append_log("INFO", "Created default collection state database");
            return Ok(db);
        }

        match read_json(&self.collection_db_path) {
            Ok(db) => Ok(db),
            Err(err) => {
                self.append_log(
                    "WARN",
                    &format!(
                        "Collection state database was unreadable; backing it up and using defaults: {err}"
                    ),
                );
                backup_invalid_json(&self.collection_db_path);
                let db = default_collection_db();
                self.save_collection_db(&db)?;
                Ok(db)
            }
        }
    }

    pub fn save_collection_db(&self, db: &CollectionStateDb) -> Result<()> {
        write_json(&self.collection_db_path, db)
    }

    pub fn load_installed_db(&self) -> Result<InstalledItemsDb> {
        if !self.installed_items_path.exists() {
            let db = default_installed_items_db();
            self.save_installed_db(&db)?;
            self.append_log("INFO", "Created default installed items database");
            return Ok(db);
        }

        match read_json(&self.installed_items_path) {
            Ok(db) => Ok(db),
            Err(err) => {
                self.append_log(
                    "WARN",
                    &format!(
                        "Installed items database was unreadable; backing it up and using defaults: {err}"
                    ),
                );
                backup_invalid_json(&self.installed_items_path);
                let db = default_installed_items_db();
                self.save_installed_db(&db)?;
                Ok(db)
            }
        }
    }

    pub fn save_installed_db(&self, db: &InstalledItemsDb) -> Result<()> {
        write_json(&self.installed_items_path, db)
    }

    pub fn update_installed_item(
        &self,
        item: InstalledItem,
        manifest: &ContentManifest,
    ) -> Result<()> {
        self.upsert_collection_entry_from_manifest(manifest, true)?;

        let mut db = self.load_installed_db()?;
        if let Some(existing) = db.items.iter_mut().find(|entry| entry.item_id == item.item_id) {
            *existing = item;
        } else {
            db.items.push(item);
        }
        self.save_installed_db(&db)
    }

    pub fn remove_installed_item(&self, item_id: &str) -> Result<()> {
        let mut db = self.load_installed_db()?;
        db.items.retain(|item| item.item_id != item_id);
        self.save_installed_db(&db)
    }

    pub fn add_item_to_library(&self, manifest: &ContentManifest) -> Result<()> {
        self.upsert_collection_entry_from_manifest(manifest, true)
    }

    pub fn remove_item_from_library(&self, item_id: &str) -> Result<()> {
        let jobs = self
            .jobs
            .lock()
            .map_err(|_| CommandError::Storage("Install job state is locked".into()))?;
        if jobs.iter().any(|job| {
            job.item_id == item_id
                && matches!(job.status, crate::models::JobStatus::Queued | crate::models::JobStatus::Running)
        }) {
            return Err(CommandError::Validation(
                "Wait for the active transfer to finish before removing this item".into(),
            ));
        }
        drop(jobs);

        let installed_db = self.load_installed_db()?;
        if installed_db.items.iter().any(|item| item.item_id == item_id) {
            return Err(CommandError::Validation(
                "Installed items must be uninstalled before removal".into(),
            ));
        }

        let mut db = self.load_collection_db()?;
        let before = db.entries.len();
        db.entries.retain(|entry| entry.item_id != item_id);
        if before == db.entries.len() {
            return Err(CommandError::Validation("Item is not in the library".into()));
        }

        self.save_collection_db(&db)
    }

    pub fn record_item_error(
        &self,
        item_id: &str,
        catalog: Option<&CatalogItemRecord>,
        error: &str,
    ) -> Result<()> {
        let mut db = self.load_collection_db()?;
        if let Some(entry) = db.entries.iter_mut().find(|entry| entry.item_id == item_id) {
            entry.last_error = Some(error.into());
            entry.last_error_at = Some(Utc::now());
            if let Some(catalog) = catalog {
                entry.catalog = catalog.clone();
            }
        } else {
            db.entries.push(CollectionEntry {
                item_id: item_id.into(),
                discoverable: catalog.is_some(),
                added_at: Utc::now(),
                last_used_at: None,
                last_error: Some(error.into()),
                last_error_at: Some(Utc::now()),
                catalog: catalog.cloned().unwrap_or_else(|| placeholder_catalog_record(item_id)),
            });
        }
        self.save_collection_db(&db)
    }

    pub fn clear_item_error(&self, item_id: &str) -> Result<()> {
        let mut db = self.load_collection_db()?;
        if let Some(entry) = db.entries.iter_mut().find(|entry| entry.item_id == item_id) {
            entry.last_error = None;
            entry.last_error_at = None;
            self.save_collection_db(&db)?;
        }
        Ok(())
    }

    pub fn mark_item_used(&self, item_id: &str) -> Result<()> {
        let mut collection_changed = false;
        let mut collection_db = self.load_collection_db()?;
        if let Some(entry) = collection_db.entries.iter_mut().find(|entry| entry.item_id == item_id) {
            entry.last_used_at = Some(Utc::now());
            collection_changed = true;
        }
        if collection_changed {
            self.save_collection_db(&collection_db)?;
        }

        let mut installed_changed = false;
        let mut installed_db = self.load_installed_db()?;
        if let Some(item) = installed_db.items.iter_mut().find(|entry| entry.item_id == item_id) {
            item.last_launched_at = Some(Utc::now());
            item.last_error = None;
            installed_changed = true;
        }
        if installed_changed {
            self.save_installed_db(&installed_db)?;
        }

        self.clear_item_error(item_id)
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
        self.migrate_legacy_state(&manifests)?;

        let mut collection_db = self.load_collection_db()?;
        let mut installed_db = self.load_installed_db()?;
        let collection_pruned = purge_retired_collection_entries(&mut collection_db);
        let installed_pruned = purge_retired_installed_items(&mut installed_db);
        if collection_pruned {
            self.save_collection_db(&collection_db)?;
        }
        if installed_pruned {
            self.save_installed_db(&installed_db)?;
        }
        let mut collection_changed = sync_collection_with_manifests(&mut collection_db, &manifests);

        for installed in &installed_db.items {
            if collection_db
                .entries
                .iter()
                .any(|entry| entry.item_id == installed.item_id)
            {
                continue;
            }

            let manifest = manifests.iter().find(|entry| entry.id == installed.item_id);
            collection_db.entries.push(CollectionEntry {
                item_id: installed.item_id.clone(),
                discoverable: manifest.is_some(),
                added_at: installed.installed_at,
                last_used_at: installed.last_launched_at,
                last_error: installed.last_error.clone(),
                last_error_at: installed
                    .last_error
                    .as_ref()
                    .and(
                        installed
                            .last_verified_at
                            .clone()
                            .or(Some(installed.installed_at)),
                    ),
                catalog: manifest
                    .map(summary_from_manifest)
                    .unwrap_or_else(|| placeholder_catalog_record(&installed.item_id)),
            });
            collection_changed = true;
        }

        if collection_changed {
            self.save_collection_db(&collection_db)?;
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

        let manifest_map = manifests
            .into_iter()
            .map(|manifest| (manifest.id.clone(), manifest))
            .collect::<BTreeMap<_, _>>();
        let collection_map = collection_db
            .entries
            .into_iter()
            .map(|entry| (entry.item_id.clone(), entry))
            .collect::<BTreeMap<_, _>>();
        let installed_map = installed_db
            .items
            .into_iter()
            .map(|item| (item.item_id.clone(), item))
            .collect::<BTreeMap<_, _>>();

        let mut item_ids = manifest_map.keys().cloned().collect::<Vec<_>>();
        for item_id in collection_map.keys() {
            if !item_ids.iter().any(|existing| existing == item_id) {
                item_ids.push(item_id.clone());
            }
        }
        for item_id in installed_map.keys() {
            if !item_ids.iter().any(|existing| existing == item_id) {
                item_ids.push(item_id.clone());
            }
        }

        let mut items = item_ids
            .into_iter()
            .map(|item_id| {
                let manifest = manifest_map.get(&item_id).cloned();
                let collection_entry = collection_map.get(&item_id).cloned();
                let installed = installed_map.get(&item_id).cloned();
                let active_job = jobs
                    .iter()
                    .find(|job| {
                        job.item_id == item_id
                            && matches!(
                                job.status,
                                crate::models::JobStatus::Queued | crate::models::JobStatus::Running
                            )
                    })
                    .cloned();

                let catalog = manifest
                    .as_ref()
                    .map(summary_from_manifest)
                    .or_else(|| collection_entry.as_ref().map(|entry| entry.catalog.clone()))
                    .unwrap_or_else(|| placeholder_catalog_record(&item_id));

                let available_update = manifest.as_ref().and_then(|manifest| {
                    installed.as_ref().and_then(|item| {
                        if item.installed_version != manifest.version {
                            Some(ContentUpdateInfo {
                                current_version: item.installed_version.clone(),
                                available_version: manifest.version.clone(),
                                changelog: manifest.changelog.clone(),
                            })
                        } else {
                            None
                        }
                    })
                });

                let error = installed
                    .as_ref()
                    .is_some_and(|item| item.status == InstalledStatus::Broken)
                    || collection_entry
                        .as_ref()
                        .is_some_and(|entry| entry.last_error.is_some());
                let install_state = if active_job.is_some() {
                    ItemInstallState::Installing
                } else if error {
                    ItemInstallState::Error
                } else if available_update.is_some() {
                    ItemInstallState::UpdateAvailable
                } else if installed.is_some() {
                    ItemInstallState::Installed
                } else {
                    ItemInstallState::NotInstalled
                };
                let collection_status = if error {
                    ItemCollectionStatus::Error
                } else if available_update.is_some() {
                    ItemCollectionStatus::UpdateAvailable
                } else if installed.is_some() {
                    ItemCollectionStatus::Installed
                } else if collection_entry.is_some() {
                    ItemCollectionStatus::Added
                } else {
                    ItemCollectionStatus::NotAdded
                };
                let state = ContentStateFlags {
                    discoverable: manifest.is_some(),
                    added: collection_entry.is_some(),
                    installed: installed.is_some(),
                    update_available: available_update.is_some(),
                    error,
                };
                let last_error = installed
                    .as_ref()
                    .and_then(|item| item.last_error.clone())
                    .or_else(|| collection_entry.as_ref().and_then(|entry| entry.last_error.clone()));

                ContentView {
                    catalog,
                    manifest,
                    state,
                    install_state,
                    collection_status,
                    installed,
                    collection_entry,
                    active_job,
                    available_update,
                    last_error,
                }
            })
            .collect::<Vec<_>>();

        items.sort_by(|left, right| {
            left.catalog
                .name
                .to_lowercase()
                .cmp(&right.catalog.name.to_lowercase())
        });

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
            items,
            jobs,
            launcher_update: update_state,
        })
    }

    pub fn upsert_collection_entry_from_manifest(
        &self,
        manifest: &ContentManifest,
        clear_error: bool,
    ) -> Result<()> {
        let mut db = self.load_collection_db()?;
        let next_catalog = summary_from_manifest(manifest);
        if let Some(entry) = db.entries.iter_mut().find(|entry| entry.item_id == manifest.id) {
            entry.discoverable = true;
            entry.catalog = next_catalog;
            if clear_error {
                entry.last_error = None;
                entry.last_error_at = None;
            }
        } else {
            db.entries.push(CollectionEntry {
                item_id: manifest.id.clone(),
                discoverable: true,
                added_at: Utc::now(),
                last_used_at: None,
                last_error: None,
                last_error_at: None,
                catalog: next_catalog,
            });
        }
        self.save_collection_db(&db)
    }

    fn migrate_legacy_state(&self, manifests: &[ContentManifest]) -> Result<()> {
        if self.collection_db_path.exists() || self.installed_items_path.exists() {
            return Ok(());
        }

        if !self.legacy_installed_db_path.exists() {
            return Ok(());
        }

        let legacy = match read_json::<LegacyInstalledGamesDb>(&self.legacy_installed_db_path) {
            Ok(legacy) => legacy,
            Err(err) => {
                self.append_log(
                    "WARN",
                    &format!(
                        "Legacy installed state was unreadable; backing it up and starting fresh: {err}"
                    ),
                );
                backup_invalid_json(&self.legacy_installed_db_path);
                self.save_collection_db(&default_collection_db())?;
                self.save_installed_db(&default_installed_items_db())?;
                return Ok(());
            }
        };

        let manifest_map = manifests
            .iter()
            .map(|manifest| (manifest.id.as_str(), manifest))
            .collect::<BTreeMap<_, _>>();

        let mut collection_entries = legacy
            .library_entries
            .into_iter()
            .filter(|entry| !is_retired_item_id(&entry.item_id))
            .map(|entry| {
                let manifest = manifest_map.get(entry.item_id.as_str()).copied();
                CollectionEntry {
                    item_id: entry.item_id.clone(),
                    discoverable: manifest.is_some(),
                    added_at: entry.added_at,
                    last_used_at: None,
                    last_error: None,
                    last_error_at: None,
                    catalog: manifest
                        .map(summary_from_manifest)
                        .unwrap_or_else(|| placeholder_catalog_record(&entry.item_id)),
                }
            })
            .collect::<Vec<_>>();

        let installed_items = legacy
            .games
            .into_iter()
            .filter(|item| !is_retired_item_id(&item.item_id))
            .map(|item| InstalledItem {
                item_id: item.item_id.clone(),
                installed_version: item.installed_version,
                library_id: item.library_id,
                install_path: item.install_path,
                installed_at: item.installed_at,
                last_verified_at: item.last_verified_at,
                last_launched_at: None,
                size_on_disk_bytes: item.size_on_disk_bytes,
                status: item.status,
                last_error: item.last_error.clone(),
            })
            .collect::<Vec<_>>();

        for item in &installed_items {
            if collection_entries
                .iter()
                .any(|entry| entry.item_id == item.item_id)
            {
                continue;
            }

            let manifest = manifest_map.get(item.item_id.as_str()).copied();
            collection_entries.push(CollectionEntry {
                item_id: item.item_id.clone(),
                discoverable: manifest.is_some(),
                added_at: item.installed_at,
                last_used_at: None,
                last_error: item.last_error.clone(),
                last_error_at: item
                    .last_error
                    .as_ref()
                    .and(item.last_verified_at.clone().or(Some(item.installed_at))),
                catalog: manifest
                    .map(summary_from_manifest)
                    .unwrap_or_else(|| placeholder_catalog_record(&item.item_id)),
            });
        }

        self.save_collection_db(&CollectionStateDb {
            entries: collection_entries,
        })?;
        self.save_installed_db(&InstalledItemsDb {
            items: installed_items,
        })?;
        self.append_log("INFO", "Migrated legacy installed-games.json into split state files");
        Ok(())
    }
}

fn summary_from_manifest(manifest: &ContentManifest) -> CatalogItemRecord {
    CatalogItemRecord {
        id: manifest.id.clone(),
        item_type: manifest.item_type.clone(),
        name: manifest.name.clone(),
        description: manifest.description.clone(),
        developer: manifest.developer.clone(),
        release_date: manifest.release_date.clone(),
        categories: if manifest.categories.is_empty() {
            vec![default_category_for_type(&manifest.item_type)]
        } else {
            manifest.categories.clone()
        },
        tags: manifest.tags.clone(),
        cover_image: manifest.cover_image.clone(),
        banner_image: manifest.banner_image.clone(),
        icon_image: manifest.icon_image.clone(),
    }
}

fn placeholder_catalog_record(item_id: &str) -> CatalogItemRecord {
    CatalogItemRecord {
        id: item_id.into(),
        item_type: CatalogItemType::Game,
        name: fallback_item_name(item_id),
        description: "This item remains in your library, but its catalog page is no longer available.".into(),
        developer: "Lumorix".into(),
        release_date: String::new(),
        categories: vec![default_category_for_type(&CatalogItemType::Game)],
        tags: vec![ContentTag {
            id: "offline".into(),
            weight: 1,
        }],
        cover_image: String::new(),
        banner_image: String::new(),
        icon_image: String::new(),
    }
}

fn fallback_item_name(item_id: &str) -> String {
    item_id
        .split('.')
        .next_back()
        .filter(|segment| !segment.trim().is_empty())
        .map(|segment| {
            segment
                .split(['-', '_'])
                .filter(|part| !part.is_empty())
                .map(|part| {
                    let mut chars = part.chars();
                    let first = chars
                        .next()
                        .map(|ch| ch.to_uppercase().to_string())
                        .unwrap_or_default();
                    format!("{first}{}", chars.as_str())
                })
                .collect::<Vec<_>>()
                .join(" ")
        })
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| item_id.to_string())
}

fn default_category_for_type(item_type: &CatalogItemType) -> String {
    match item_type {
        CatalogItemType::Game => "Games".into(),
        CatalogItemType::Tool => "Tools".into(),
        CatalogItemType::Project => "Projects".into(),
    }
}

fn sync_collection_with_manifests(
    db: &mut CollectionStateDb,
    manifests: &[ContentManifest],
) -> bool {
    let manifest_map = manifests
        .iter()
        .map(|manifest| (manifest.id.as_str(), manifest))
        .collect::<BTreeMap<_, _>>();
    let mut changed = false;

    for entry in &mut db.entries {
        if let Some(manifest) = manifest_map.get(entry.item_id.as_str()).copied() {
            let next_catalog = summary_from_manifest(manifest);
            if !entry.discoverable || entry.catalog != next_catalog {
                entry.discoverable = true;
                entry.catalog = next_catalog;
                changed = true;
            }
        } else if entry.discoverable {
            entry.discoverable = false;
            changed = true;
        }
    }

    changed
}

fn purge_retired_collection_entries(db: &mut CollectionStateDb) -> bool {
    let before = db.entries.len();
    db.entries.retain(|entry| !is_retired_item_id(&entry.item_id));
    before != db.entries.len()
}

fn purge_retired_installed_items(db: &mut InstalledItemsDb) -> bool {
    let before = db.items.len();
    db.items.retain(|item| !is_retired_item_id(&item.item_id));
    before != db.items.len()
}

fn is_retired_item_id(item_id: &str) -> bool {
    item_id.as_bytes() == RETIRED_ITEM_ID_A || item_id.as_bytes() == RETIRED_ITEM_ID_B
}

fn default_collection_db() -> CollectionStateDb {
    CollectionStateDb { entries: vec![] }
}

fn default_installed_items_db() -> InstalledItemsDb {
    InstalledItemsDb { items: vec![] }
}

fn default_config() -> LauncherConfig {
    LauncherConfig {
        onboarding_completed: false,
        language: None,
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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyInstalledGamesDb {
    #[serde(default)]
    games: Vec<LegacyInstalledItem>,
    #[serde(default, alias = "libraryEntries")]
    library_entries: Vec<LegacyLibraryEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyInstalledItem {
    #[serde(alias = "gameId")]
    item_id: String,
    installed_version: String,
    library_id: String,
    install_path: String,
    installed_at: chrono::DateTime<Utc>,
    last_verified_at: Option<chrono::DateTime<Utc>>,
    size_on_disk_bytes: u64,
    status: InstalledStatus,
    last_error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyLibraryEntry {
    #[serde(alias = "gameId")]
    item_id: String,
    added_at: chrono::DateTime<Utc>,
}
