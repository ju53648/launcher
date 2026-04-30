use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::PathBuf,
};

use chrono::Utc;
use serde::Deserialize;

use crate::{
    manifest::{missing_required_install_paths, validate_manifest},
    models::{ContentManifest, InstalledStatus, ManifestSourceType},
    storage::{CommandError, LauncherRuntime, Result},
};

#[derive(Debug, Clone, Default)]
pub struct GameCatalogRefreshReport {
    pub sources_checked: usize,
    pub manifests_written: usize,
    pub source_errors: Vec<String>,
}

pub async fn refresh_game_catalog(runtime: &LauncherRuntime) -> Result<GameCatalogRefreshReport> {
    let config = runtime.load_config()?;
    let mut report = GameCatalogRefreshReport::default();

    for source in config.manifest_sources {
        if !source.enabled || matches!(source.source_type, ManifestSourceType::Embedded) {
            continue;
        }

        let Some(url) = source.url else {
            continue;
        };

        report.sources_checked += 1;
        match fetch_source_manifests(&url).await {
            Ok(manifests) => match write_source_manifests(runtime, &source.id, &manifests) {
                Ok(written) => {
                    report.manifests_written += written;
                    runtime.append_log(
                        "INFO",
                        &format!(
                            "Refreshed game catalog source '{}' with {written} manifests",
                            source.name
                        ),
                    );
                }
                Err(err) => report.source_errors.push(format!(
                    "Could not apply game catalog source '{}' ({url}): {err}",
                    source.name
                )),
            },
            Err(err) => report.source_errors.push(format!(
                "Could not fetch game catalog source '{}' ({url}): {err}",
                source.name
            )),
        }
    }

    Ok(report)
}

pub fn verify_installed_game_health(runtime: &LauncherRuntime) -> Result<usize> {
    let manifests = crate::manifest::load_all_manifests(runtime)
        .manifests
        .into_iter()
        .map(|manifest| (manifest.id.clone(), manifest))
        .collect::<BTreeMap<_, _>>();

    let mut db = runtime.load_installed_db()?;
    let mut changed = 0usize;

    for installed in &mut db.items {
        let Some(manifest) = manifests.get(&installed.item_id) else {
            continue;
        };

        let install_path = PathBuf::from(&installed.install_path);
        let install_exists = install_path.exists();
        let missing_paths = if install_exists {
            missing_required_install_paths(manifest, &install_path)?
        } else {
            vec![manifest.executable.clone()]
        };

        let next_status = if install_exists && missing_paths.is_empty() {
            InstalledStatus::Installed
        } else {
            InstalledStatus::Broken
        };

        let next_error = if matches!(next_status, InstalledStatus::Broken) {
            Some(format!(
                "Installed item is missing required files: {}",
                missing_paths.join(", ")
            ))
        } else {
            None
        };

        if installed.status != next_status || installed.last_error != next_error {
            installed.status = next_status;
            installed.last_error = next_error;
            changed += 1;
        }

        installed.last_verified_at = Some(Utc::now());
    }

    if changed > 0 {
        runtime.save_installed_db(&db)?;
    } else {
        // Persist verification timestamps even when status is unchanged.
        runtime.save_installed_db(&db)?;
    }

    Ok(changed)
}

async fn fetch_source_manifests(url: &str) -> Result<Vec<ContentManifest>> {
    let body = fetch_text_uncached(url, "game catalog source").await?;
    parse_catalog_payload(&body).await
}

async fn fetch_text_uncached(url: &str, label: &str) -> Result<String> {
    let request_url = with_cache_buster(url);
    let client = reqwest::Client::new();
    let response = client
        .get(&request_url)
        .header(reqwest::header::CACHE_CONTROL, "no-cache, no-store, max-age=0")
        .header(reqwest::header::PRAGMA, "no-cache")
        .send()
        .await
        .map_err(|err| CommandError::Network(format!("Could not fetch {label}: {err}")))?;

    let status = response.status();
    if !status.is_success() {
        return Err(CommandError::Network(format!(
            "{} returned HTTP status {}",
            label,
            status.as_u16()
        )));
    }

    response
        .text()
        .await
        .map_err(|err| CommandError::Network(format!("Could not read {label} payload: {err}")))
}

fn with_cache_buster(url: &str) -> String {
    let separator = if url.contains('?') { "&" } else { "?" };
    format!("{url}{separator}_lumorix_ts={}", Utc::now().timestamp_millis())
}

async fn parse_catalog_payload(raw: &str) -> Result<Vec<ContentManifest>> {
    if let Ok(single) = serde_json::from_str::<ContentManifest>(raw) {
        validate_manifest(&single)?;
        return Ok(vec![single]);
    }

    if let Ok(list) = serde_json::from_str::<Vec<ContentManifest>>(raw) {
        for manifest in &list {
            validate_manifest(manifest)?;
        }
        return Ok(list);
    }

    if let Ok(registry) = serde_json::from_str::<RemoteCatalogRegistry>(raw) {
        let mut manifests = Vec::<ContentManifest>::new();
        for entry in registry.manifests {
            match entry {
                RemoteCatalogEntry::Inline(manifest) => {
                    validate_manifest(&manifest)?;
                    manifests.push(manifest);
                }
                RemoteCatalogEntry::Reference { url } => {
                    let payload = fetch_text_uncached(&url, "referenced manifest").await?;
                    let manifest = serde_json::from_str::<ContentManifest>(&payload).map_err(|err| {
                        CommandError::Manifest(format!(
                            "Referenced manifest '{}' is invalid JSON: {err}",
                            url
                        ))
                    })?;
                    validate_manifest(&manifest)?;
                    manifests.push(manifest);
                }
            }
        }

        if manifests.is_empty() {
            return Err(CommandError::Manifest(
                "Remote catalog source did not contain any manifests".into(),
            ));
        }

        return Ok(manifests);
    }

    Err(CommandError::Manifest(
        "Unsupported game catalog payload. Expected a manifest, manifest array, or registry with 'manifests'."
            .into(),
    ))
}

fn write_source_manifests(
    runtime: &LauncherRuntime,
    source_id: &str,
    manifests: &[ContentManifest],
) -> Result<usize> {
    if manifests.is_empty() {
        return Err(CommandError::Manifest(
            "Game catalog source resolved to an empty manifest list".into(),
        ));
    }

    let prefix = format!("remote-{}-", sanitize_file_component(source_id));
    let mut names = BTreeSet::<String>::new();

    for manifest in manifests {
        validate_manifest(manifest)?;

        let name = format!(
            "{}{}.json",
            prefix,
            sanitize_file_component(&manifest.id)
        );

        if !names.insert(name.clone()) {
            return Err(CommandError::Manifest(format!(
                "Duplicate manifest id '{}' in remote source '{}'.",
                manifest.id, source_id
            )));
        }

        let path = runtime.manifests_dir.join(name);
        let raw = serde_json::to_string_pretty(manifest).map_err(|err| {
            CommandError::Storage(format!("Could not serialize remote manifest '{}': {err}", manifest.id))
        })?;

        fs::write(&path, raw).map_err(|err| {
            CommandError::Storage(format!("Could not write remote manifest {}: {err}", path.display()))
        })?;
    }

    if runtime.manifests_dir.exists() {
        let entries = fs::read_dir(&runtime.manifests_dir).map_err(|err| {
            CommandError::Storage(format!(
                "Could not read manifest directory {}: {err}",
                runtime.manifests_dir.display()
            ))
        })?;

        for entry in entries.flatten() {
            let path = entry.path();
            let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if !name.starts_with(&prefix) || !name.ends_with(".json") {
                continue;
            }
            if names.contains(name) {
                continue;
            }

            let _ = fs::remove_file(&path);
        }
    }

    Ok(manifests.len())
}

fn sanitize_file_component(raw: &str) -> String {
    let mut output = String::with_capacity(raw.len());
    let mut previous_separator = false;

    for ch in raw.chars() {
        if ch.is_ascii_alphanumeric() {
            output.push(ch.to_ascii_lowercase());
            previous_separator = false;
        } else if !previous_separator {
            output.push('-');
            previous_separator = true;
        }
    }

    output.trim_matches('-').to_string()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteCatalogRegistry {
    manifests: Vec<RemoteCatalogEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum RemoteCatalogEntry {
    Inline(ContentManifest),
    Reference { url: String },
}
