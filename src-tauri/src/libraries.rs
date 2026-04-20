use std::{fs, path::Path};

use chrono::Utc;
use uuid::Uuid;

use crate::{
    models::{InstalledGamesDb, LibraryFolder, LibraryStatus, LauncherConfig},
    paths::validate_library_path,
    storage::{CommandError, Result},
};

pub fn probe_libraries(config: &mut LauncherConfig) {
    for library in &mut config.libraries {
        let path = Path::new(&library.path);
        if !path.exists() {
            library.status = LibraryStatus::Missing;
            continue;
        }

        let marker = path.join(".lumorix-library");
        match fs::create_dir_all(path).and_then(|_| {
            if !marker.exists() {
                fs::write(&marker, "Lumorix Launcher library folder\n")?;
            }
            fs::metadata(path).map(|_| ())
        }) {
            Ok(_) => {
                library.status = LibraryStatus::Available;
                library.last_seen_at = Some(Utc::now());
            }
            Err(_) => {
                library.status = LibraryStatus::Inaccessible;
            }
        }
    }
}

pub fn create_library(name: String, path: String, is_default: bool) -> Result<LibraryFolder> {
    let path = validate_library_path(&path)?;
    fs::create_dir_all(&path).map_err(|err| {
        CommandError::Validation(format!("Could not create library folder {}: {err}", path.display()))
    })?;

    let marker = path.join(".lumorix-library");
    fs::write(&marker, "Lumorix Launcher library folder\n").map_err(|err| {
        CommandError::Validation(format!(
            "Could not write Lumorix marker in {}: {err}",
            path.display()
        ))
    })?;

    Ok(LibraryFolder {
        id: Uuid::new_v4().to_string(),
        name: normalize_library_name(&name),
        path: path.to_string_lossy().into_owned(),
        is_default,
        created_at: Utc::now(),
        last_seen_at: Some(Utc::now()),
        status: LibraryStatus::Available,
    })
}

pub fn ensure_unique_library_path(config: &LauncherConfig, path: &str) -> Result<()> {
    let normalized = validate_library_path(path)?.to_string_lossy().to_lowercase();
    let duplicate = config
        .libraries
        .iter()
        .any(|library| library.path.to_lowercase() == normalized);

    if duplicate {
        return Err(CommandError::Validation(
            "This folder is already registered as a Lumorix library".into(),
        ));
    }

    Ok(())
}

pub fn ensure_library_is_removable(db: &InstalledGamesDb, library_id: &str) -> Result<()> {
    if db.games.iter().any(|game| game.library_id == library_id) {
        return Err(CommandError::Validation(
            "Move or uninstall games from this library before removing it".into(),
        ));
    }

    Ok(())
}

pub fn normalize_default_library(config: &mut LauncherConfig) {
    if config.libraries.is_empty() {
        config.default_library_id = None;
        return;
    }

    let default_id = config
        .default_library_id
        .clone()
        .filter(|id| config.libraries.iter().any(|library| library.id == *id))
        .or_else(|| config.libraries.first().map(|library| library.id.clone()));

    config.default_library_id = default_id.clone();
    for library in &mut config.libraries {
        library.is_default = default_id.as_ref().is_some_and(|id| *id == library.id);
    }
}

pub fn normalize_library_name(name: &str) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        "Lumorix Library".into()
    } else {
        trimmed.chars().take(48).collect()
    }
}
