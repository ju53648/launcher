use std::{collections::{BTreeMap, BTreeSet}, fs};

use url::Url;

use crate::{
    models::{ContentManifest, DownloadSource, InstallStrategy},
    paths::{folder_name_is_safe, safe_join},
    storage::{CommandError, LauncherRuntime, Result},
};

const EMBEDDED_MANIFESTS: &[&str] = &[
    include_str!("../manifests/lumorix-dropdash.json"),
    include_str!("../manifests/signal-lab.json"),
    include_str!("../manifests/project-atlas.json"),
];

#[derive(Debug, Clone)]
pub struct ManifestCatalog {
    pub manifests: Vec<ContentManifest>,
    pub errors: Vec<String>,
}

pub fn load_all_manifests(runtime: &LauncherRuntime) -> ManifestCatalog {
    let mut manifests = BTreeMap::<String, ContentManifest>::new();
    let mut errors = Vec::<String>::new();

    for (index, raw) in EMBEDDED_MANIFESTS.iter().enumerate() {
        match parse_manifest(raw).and_then(|manifest| {
            validate_manifest(&manifest)?;
            Ok(manifest)
        }) {
            Ok(manifest) => {
                manifests.insert(manifest.id.clone(), manifest);
            }
            Err(err) => record_manifest_error(
                runtime,
                &mut errors,
                format!("Embedded manifest #{index} is invalid: {err}"),
            ),
        }
    }

    if runtime.manifests_dir.exists() {
        let entries = match fs::read_dir(&runtime.manifests_dir) {
            Ok(entries) => entries,
            Err(err) => {
                record_manifest_error(
                    runtime,
                    &mut errors,
                    format!(
                        "Could not read manifest directory {}: {err}",
                        runtime.manifests_dir.display()
                    ),
                );
                let mut values: Vec<ContentManifest> = manifests.into_values().collect();
                values.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
                return ManifestCatalog {
                    manifests: values,
                    errors,
                };
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path
                .extension()
                .and_then(|ext| ext.to_str())
                .is_some_and(|ext| ext.eq_ignore_ascii_case("json"))
            {
                let label = path.display().to_string();
                match fs::read_to_string(&path)
                    .map_err(|err| CommandError::Manifest(format!("Could not read {label}: {err}")))
                    .and_then(|raw| {
                        parse_manifest(&raw).and_then(|manifest| {
                            validate_manifest(&manifest)?;
                            Ok(manifest)
                        })
                    }) {
                    Ok(manifest) => {
                        manifests.insert(manifest.id.clone(), manifest);
                    }
                    Err(err) => record_manifest_error(
                        runtime,
                        &mut errors,
                        format!("Manifest {label} is invalid: {err}"),
                    ),
                }
            }
        }
    }

    let mut values: Vec<ContentManifest> = manifests.into_values().collect();
    values.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    ManifestCatalog {
        manifests: values,
        errors,
    }
}

pub fn find_manifest(runtime: &LauncherRuntime, item_id: &str) -> Result<ContentManifest> {
    let catalog = load_all_manifests(runtime);
    catalog
        .manifests
        .into_iter()
        .find(|manifest| manifest.id == item_id)
        .ok_or_else(|| CommandError::Manifest(format!("Unknown item id: {item_id}")))
}

fn parse_manifest(raw: &str) -> Result<ContentManifest> {
    serde_json::from_str(raw)
        .map_err(|err| CommandError::Manifest(format!("Manifest JSON is invalid: {err}")))
}

fn record_manifest_error(runtime: &LauncherRuntime, errors: &mut Vec<String>, message: String) {
    runtime.append_log("WARN", &message);
    errors.push(message);
}

pub fn validate_manifest(manifest: &ContentManifest) -> Result<()> {
    if manifest.id.trim().is_empty() || manifest.name.trim().is_empty() {
        return Err(CommandError::Manifest(
            "Manifest id and name are required".into(),
        ));
    }

    if !folder_name_is_safe(&manifest.default_install_folder) {
        return Err(CommandError::Manifest(format!(
            "Unsafe default install folder in manifest {}",
            manifest.id
        )));
    }

    let mut seen_tags = BTreeSet::new();
    for tag in &manifest.tags {
        if tag.id.trim().is_empty() {
            return Err(CommandError::Manifest(format!(
                "Manifest {} contains a tag with an empty id",
                manifest.id
            )));
        }

        if !(1..=3).contains(&tag.weight) {
            return Err(CommandError::Manifest(format!(
                "Manifest {} contains tag '{}' with unsupported weight {}",
                manifest.id, tag.id, tag.weight
            )));
        }

        if !seen_tags.insert(tag.id.as_str()) {
            return Err(CommandError::Manifest(format!(
                "Manifest {} defines tag '{}' more than once",
                manifest.id, tag.id
            )));
        }
    }

    let install_root = std::path::Path::new("C:\\LumorixValidation");
    safe_join(install_root, &manifest.executable)?;

    match &manifest.install_strategy {
        InstallStrategy::Synthetic {
            executable_template,
            content_files,
        } => {
            if executable_template.trim().is_empty() {
                return Err(CommandError::Manifest(format!(
                    "Synthetic install strategy for {} has an empty executable template",
                    manifest.id
                )));
            }

            for file in content_files {
                safe_join(install_root, &file.path)?;
            }
        }
        InstallStrategy::ZipArchive { .. } => {}
    }

    match &manifest.download {
        DownloadSource::LocalSynthetic { integrity } => {
            if integrity.trim().is_empty() {
                return Err(CommandError::Manifest(format!(
                    "Synthetic source for {} needs an integrity label",
                    manifest.id
                )));
            }
        }
        DownloadSource::HttpArchive { url, sha256, .. } => {
            Url::parse(url)
                .map_err(|err| CommandError::Manifest(format!("Invalid download URL: {err}")))?;
            if sha256.len() != 64 || !sha256.chars().all(|ch| ch.is_ascii_hexdigit()) {
                return Err(CommandError::Manifest(format!(
                    "Invalid sha256 in manifest {}",
                    manifest.id
                )));
            }
        }
    }

    Ok(())
}
