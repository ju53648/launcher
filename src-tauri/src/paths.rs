use std::path::{Path, PathBuf};

use crate::storage::{CommandError, Result};

pub fn app_data_dir() -> Result<PathBuf> {
    dirs::data_local_dir()
        .map(|dir| dir.join("Lumorix Launcher"))
        .ok_or_else(|| CommandError::Storage("Could not resolve local app data directory".into()))
}

pub fn recommended_library_path() -> Result<PathBuf> {
    dirs::data_local_dir()
        .map(|dir| dir.join("Lumorix").join("Games"))
        .ok_or_else(|| CommandError::Storage("Could not resolve recommended library path".into()))
}

pub fn validate_library_path(raw: &str) -> Result<PathBuf> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(CommandError::Validation("Library path cannot be empty".into()));
    }

    if trimmed.chars().any(|ch| matches!(ch, '<' | '>' | '"' | '|' | '?' | '*')) {
        return Err(CommandError::Validation(
            "Library path contains characters that are invalid on Windows".into(),
        ));
    }

    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err(CommandError::Validation(
            "Library path must be an absolute path".into(),
        ));
    }

    Ok(path)
}

pub fn safe_join(base: &Path, relative: &str) -> Result<PathBuf> {
    let relative_path = Path::new(relative);
    if relative_path.is_absolute() {
        return Err(CommandError::Validation(
            "Manifest paths must be relative to the install root".into(),
        ));
    }

    let mut safe = PathBuf::new();
    for component in relative_path.components() {
        match component {
            std::path::Component::Normal(part) => safe.push(part),
            _ => {
                return Err(CommandError::Validation(format!(
                    "Unsafe relative path in manifest: {relative}"
                )));
            }
        }
    }

    Ok(base.join(safe))
}

pub fn folder_name_is_safe(name: &str) -> bool {
    !name.trim().is_empty()
        && !name.contains("..")
        && !name
            .chars()
            .any(|ch| matches!(ch, '\\' | '/' | ':' | '<' | '>' | '"' | '|' | '?' | '*'))
}
