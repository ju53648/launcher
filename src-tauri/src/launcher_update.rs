use chrono::Utc;

use crate::{
    models::{LauncherReleaseManifest, LauncherUpdateState, ManifestSourceType},
    storage::{CommandError, LauncherRuntime, Result},
};

pub async fn check_launcher_updates(runtime: &LauncherRuntime) -> Result<LauncherUpdateState> {
    let config = runtime.load_config()?;
    let source = config
        .manifest_sources
        .iter()
        .find(|source| {
            source.enabled
                && source.url.is_some()
                && matches!(
                    source.source_type,
                    ManifestSourceType::GitHubReleases | ManifestSourceType::CustomHttp
                )
        })
        .cloned();

    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let mut update_state = LauncherUpdateState {
        current_version: current_version.clone(),
        latest_version: None,
        update_available: false,
        checked_at: Some(Utc::now()),
        release_url: None,
        notes: vec![],
        error: None,
    };

    let Some(source) = source else {
        update_state.notes.push(
            "No remote update source is enabled. Configure a GitHub Releases manifest when ready."
                .into(),
        );
        store_state(runtime, &update_state)?;
        return Ok(update_state);
    };

    let url = source.url.expect("checked above");
    let release_manifest = fetch_release_manifest(&url).await?;
    update_state.latest_version = Some(release_manifest.version.clone());
    update_state.update_available =
        is_version_newer(&release_manifest.version, &current_version).unwrap_or(false);
    update_state.release_url = Some(release_manifest.release_url);
    update_state.notes = release_manifest.notes;
    store_state(runtime, &update_state)?;

    Ok(update_state)
}

async fn fetch_release_manifest(url: &str) -> Result<LauncherReleaseManifest> {
    let response = reqwest::get(url)
        .await
        .map_err(|err| CommandError::Network(format!("Update check failed: {err}")))?;

    if !response.status().is_success() {
        return Err(CommandError::Network(format!(
            "Update check failed with HTTP {}",
            response.status()
        )));
    }

    let body = response
        .text()
        .await
        .map_err(|err| CommandError::Network(format!("Invalid update manifest payload: {err}")))?;

    if let Ok(manifest) = serde_json::from_str::<LauncherReleaseManifest>(&body) {
        return Ok(manifest);
    }

    parse_tauri_latest_manifest(&body)
}

fn parse_tauri_latest_manifest(raw: &str) -> Result<LauncherReleaseManifest> {
    let value: serde_json::Value = serde_json::from_str(raw)
        .map_err(|err| CommandError::Network(format!("Invalid update manifest: {err}")))?;

    let version = value
        .get("version")
        .and_then(|entry| entry.as_str())
        .ok_or_else(|| CommandError::Network("Update manifest is missing version".into()))?
        .to_string();

    let release_url = value
        .get("releaseUrl")
        .and_then(|entry| entry.as_str())
        .map(ToString::to_string)
        .or_else(|| {
            value
                .get("platforms")
                .and_then(|platforms| platforms.as_object())
                .and_then(|platforms| {
                    platforms
                        .values()
                        .find_map(|platform| platform.get("url").and_then(|url| url.as_str()))
                })
                .map(ToString::to_string)
        })
        .ok_or_else(|| CommandError::Network("Update manifest is missing release URL".into()))?;

    let notes = if let Some(items) = value
        .get("notesList")
        .and_then(|entry| entry.as_array())
        .or_else(|| value.get("notes_list").and_then(|entry| entry.as_array()))
    {
        items
            .iter()
            .filter_map(|entry| entry.as_str().map(ToString::to_string))
            .collect::<Vec<_>>()
    } else if let Some(items) = value.get("notes").and_then(|entry| entry.as_array()) {
        items
            .iter()
            .filter_map(|entry| entry.as_str().map(ToString::to_string))
            .collect::<Vec<_>>()
    } else if let Some(note) = value.get("notes").and_then(|entry| entry.as_str()) {
        vec![note.to_string()]
    } else {
        vec![]
    };

    Ok(LauncherReleaseManifest {
        version,
        release_url,
        notes,
    })
}

fn store_state(runtime: &LauncherRuntime, state: &LauncherUpdateState) -> Result<()> {
    let mut guard = runtime
        .launcher_update
        .lock()
        .map_err(|_| CommandError::Storage("Launcher update state is locked".into()))?;
    *guard = state.clone();
    Ok(())
}

fn is_version_newer(candidate: &str, current: &str) -> Option<bool> {
    let parse = |value: &str| -> Option<Vec<u64>> {
        value
            .trim_start_matches('v')
            .split('.')
            .map(|part| part.parse::<u64>().ok())
            .collect()
    };
    let candidate_parts = parse(candidate)?;
    let current_parts = parse(current)?;
    let max_len = candidate_parts.len().max(current_parts.len());

    for index in 0..max_len {
        let candidate_value = *candidate_parts.get(index).unwrap_or(&0);
        let current_value = *current_parts.get(index).unwrap_or(&0);
        if candidate_value > current_value {
            return Some(true);
        }
        if candidate_value < current_value {
            return Some(false);
        }
    }

    Some(false)
}
