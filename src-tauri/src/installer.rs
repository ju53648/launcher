use std::{
    ffi::OsString,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

use chrono::Utc;
use futures_util::StreamExt;
use reqwest::header::{ACCEPT_RANGES, CONTENT_LENGTH, CONTENT_RANGE, RANGE};
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

use crate::{
    manifest::find_manifest,
    models::{
        CatalogItemRecord, DownloadSource, InstallJob, InstallOperation, InstallPhase,
        InstallStrategy, InstalledItem, InstalledStatus, JobStatus, LibraryStatus,
    },
    paths::safe_join,
    storage::{directory_size, CommandError, LauncherRuntime, Result},
};

#[derive(Debug, Clone, Copy)]
pub enum InstallMode {
    Install,
    Update,
    Repair,
    Move,
}

pub fn start_install_job(
    runtime: &LauncherRuntime,
    item_id: String,
    library_id: String,
    mode: InstallMode,
) -> Result<InstallJob> {
    let manifest = find_manifest(runtime, &item_id)?;
    let config = runtime.load_config()?;
    let library = config
        .libraries
        .iter()
        .find(|library| library.id == library_id)
        .ok_or_else(|| CommandError::Validation("Selected library does not exist".into()))?;

    if library.status != LibraryStatus::Available {
        return Err(CommandError::Validation(format!(
            "Library '{}' is not available",
            library.name
        )));
    }

    let mut jobs = runtime
        .jobs
        .lock()
        .map_err(|_| CommandError::Storage("Install job state is locked".into()))?;

    if jobs.iter().any(|job| {
        job.item_id == item_id && matches!(job.status, JobStatus::Queued | JobStatus::Running)
    }) {
        return Err(CommandError::Install(
            "A job for this item is already running".into(),
        ));
    }

    let job = InstallJob {
        id: Uuid::new_v4().to_string(),
        item_id: item_id.clone(),
        item_name: manifest.name.clone(),
        library_id: library_id.clone(),
        operation: install_operation(mode),
        phase: InstallPhase::Queued,
        status: JobStatus::Queued,
        progress: 0.0,
        message: match mode {
            InstallMode::Install => "Install queued".into(),
            InstallMode::Update => "Update queued".into(),
            InstallMode::Repair => "Repair queued".into(),
            InstallMode::Move => "Move queued".into(),
        },
        bytes_downloaded: 0,
        bytes_total: manifest.install_size_bytes,
        started_at: Utc::now(),
        updated_at: Utc::now(),
        error: None,
    };

    jobs.push(job.clone());
    drop(jobs);

    let runtime_clone = runtime.clone();
    let job_id = job.id.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) =
            run_install_pipeline(runtime_clone.clone(), job_id.clone(), item_id, library_id, mode)
                .await
        {
            runtime_clone.append_log("ERROR", &format!("Install pipeline failed: {err}"));
            fail_job(&runtime_clone, &job_id, err.to_string());
        }
    });

    Ok(job)
}

pub fn cancel_job(runtime: &LauncherRuntime, job_id: &str) -> Result<()> {
    mutate_job(runtime, job_id, |job| {
        if matches!(job.status, JobStatus::Completed | JobStatus::Failed) {
            return;
        }
        job.status = JobStatus::Cancelled;
        job.phase = InstallPhase::Cancelled;
        job.message = "Cancelled by user".into();
        job.updated_at = Utc::now();
    })
}

pub fn clear_completed_jobs(runtime: &LauncherRuntime) -> Result<Vec<InstallJob>> {
    let mut jobs = runtime
        .jobs
        .lock()
        .map_err(|_| CommandError::Storage("Install job state is locked".into()))?;
    jobs.retain(|job| matches!(job.status, JobStatus::Queued | JobStatus::Running));
    Ok(jobs.clone())
}

pub fn verify_item(runtime: &LauncherRuntime, item_id: &str) -> Result<InstalledItem> {
    let manifest = find_manifest(runtime, item_id)?;
    let mut db = runtime.load_installed_db()?;
    let installed = db
        .items
        .iter_mut()
        .find(|item| item.item_id == item_id)
        .ok_or_else(|| CommandError::Install("Item is not installed".into()))?;

    let install_path = PathBuf::from(&installed.install_path);
    let executable_path = safe_join(&install_path, &manifest.executable)?;

    if !install_path.exists() || !executable_path.exists() {
        installed.status = InstalledStatus::Broken;
        installed.last_error = Some("Executable or install folder is missing".into());
        runtime.record_item_error(
            item_id,
            Some(&catalog_record_from_manifest(&manifest)),
            "Executable or install folder is missing",
        )?;
    } else {
        installed.status = InstalledStatus::Installed;
        installed.last_error = None;
        installed.last_verified_at = Some(Utc::now());
        installed.size_on_disk_bytes = directory_size(&install_path);
        runtime.clear_item_error(item_id)?;
    }

    let result = installed.clone();
    runtime.save_installed_db(&db)?;
    Ok(result)
}

pub fn uninstall_item(runtime: &LauncherRuntime, item_id: &str) -> Result<()> {
    let jobs = runtime
        .jobs
        .lock()
        .map_err(|_| CommandError::Storage("Install job state is locked".into()))?;
    if jobs.iter().any(|job| {
        job.item_id == item_id && matches!(job.status, JobStatus::Queued | JobStatus::Running)
    }) {
        return Err(CommandError::Install(
            "Wait for the active transfer to finish before uninstalling this item".into(),
        ));
    }
    drop(jobs);

    let db = runtime.load_installed_db()?;
    let installed = db
        .items
        .iter()
        .find(|item| item.item_id == item_id)
        .ok_or_else(|| CommandError::Install("Item is not installed".into()))?;
    let config = runtime.load_config()?;
    let library = config
        .libraries
        .iter()
        .find(|library| library.id == installed.library_id)
        .ok_or_else(|| CommandError::Install("Installed item references a missing library".into()))?;

    let library_root = PathBuf::from(&library.path);
    let install_path = PathBuf::from(&installed.install_path);
    ensure_install_path_is_inside_library(&library_root, &install_path)?;

    if install_path.exists() {
        fs::remove_dir_all(&install_path).map_err(|err| {
            CommandError::Install(format!("Could not remove {}: {err}", install_path.display()))
        })?;
    }

    runtime.remove_installed_item(item_id)?;
    runtime.append_log("INFO", &format!("Uninstalled item {item_id}"));
    Ok(())
}

pub fn move_install_item(
    runtime: &LauncherRuntime,
    item_id: String,
    target_library_id: String,
) -> Result<InstallJob> {
    let db = runtime.load_installed_db()?;
    let installed = db
        .items
        .iter()
        .find(|item| item.item_id == item_id)
        .ok_or_else(|| CommandError::Install("Item is not installed".into()))?;
    if installed.library_id == target_library_id {
        return Err(CommandError::Validation(
            "Item is already installed in the selected library".into(),
        ));
    }

    start_install_job(runtime, item_id, target_library_id, InstallMode::Move)
}

async fn run_install_pipeline(
    runtime: LauncherRuntime,
    job_id: String,
    item_id: String,
    library_id: String,
    mode: InstallMode,
) -> Result<()> {
    if matches!(mode, InstallMode::Move) {
        return run_move_pipeline(runtime, job_id, item_id, library_id).await;
    }

    update_job(
        &runtime,
        &job_id,
        InstallPhase::Preparing,
        4.0,
        "Preparing library and manifest",
        0,
        0,
    )?;

    let manifest = find_manifest(&runtime, &item_id)?;
    let config = runtime.load_config()?;
    let library = config
        .libraries
        .iter()
        .find(|library| library.id == library_id)
        .ok_or_else(|| CommandError::Validation("Selected library does not exist".into()))?;

    if library.status != LibraryStatus::Available {
        return Err(CommandError::Validation(format!(
            "Library '{}' is not available",
            library.name
        )));
    }

    let library_root = PathBuf::from(&library.path);
    fs::create_dir_all(&library_root).map_err(|err| {
        CommandError::Install(format!("Could not create library {}: {err}", library_root.display()))
    })?;

    let install_path = library_root.join(&manifest.default_install_folder);
    ensure_install_path_is_inside_library(&library_root, &install_path)?;

    if matches!(mode, InstallMode::Install) && install_path.exists() {
        let existing_db = runtime.load_installed_db()?;
        let already_installed = existing_db.items.iter().any(|item| item.item_id == item_id);
        if !already_installed && fs::read_dir(&install_path).is_ok_and(|mut entries| entries.next().is_some()) {
            return Err(CommandError::Install(format!(
                "Install folder {} is not empty",
                install_path.display()
            )));
        }
    }

    ensure_free_space(
        &library_root,
        manifest
            .install_size_bytes
            .saturating_add(64_u64 * 1024 * 1024),
        "library",
    )?;

    check_cancelled(&runtime, &job_id)?;
    let archive_path = match &manifest.download {
        DownloadSource::LocalSynthetic { .. } => {
            run_synthetic_download_steps(&runtime, &job_id, manifest.install_size_bytes).await?;
            None
        }
        DownloadSource::HttpArchive {
            url,
            sha256,
            size_bytes,
        } => {
            let archive = runtime.cache_dir.join(format!("{}-{}.zip", manifest.id, manifest.version));
            let partial = partial_archive_path(&archive);
            let resumed = fs::metadata(&partial).map(|meta| meta.len()).unwrap_or(0);
            let remaining = size_bytes.saturating_sub(resumed);
            ensure_free_space(
                &runtime.cache_dir,
                remaining.saturating_add(16_u64 * 1024 * 1024),
                "download cache",
            )?;
            download_archive(&runtime, &job_id, url, sha256, *size_bytes, &archive).await?;
            Some(archive)
        }
    };

    check_cancelled(&runtime, &job_id)?;
    update_job(
        &runtime,
        &job_id,
        InstallPhase::Installing,
        58.0,
        "Writing item files",
        manifest.install_size_bytes / 2,
        manifest.install_size_bytes,
    )?;

    fs::create_dir_all(&install_path).map_err(|err| {
        CommandError::Install(format!("Could not create install path {}: {err}", install_path.display()))
    })?;

    match (&manifest.install_strategy, archive_path.as_ref()) {
        (
            InstallStrategy::Synthetic {
                executable_template,
                content_files,
            },
            _,
        ) => {
            install_synthetic_item(
                &runtime,
                &job_id,
                executable_template,
                content_files,
                &install_path,
                &manifest.name,
                &manifest.version,
            )
            .await?;
        }
        (InstallStrategy::ZipArchive { root_folder }, Some(archive)) => {
            extract_zip_archive(&runtime, &job_id, archive, &install_path, root_folder.as_deref())?;
        }
        (InstallStrategy::ZipArchive { .. }, None) => {
            return Err(CommandError::Install(
                "Zip install strategy requires an archive download source".into(),
            ));
        }
    }

    check_cancelled(&runtime, &job_id)?;
    update_job(
        &runtime,
        &job_id,
        InstallPhase::Verifying,
        90.0,
        "Verifying installed files",
        manifest.install_size_bytes,
        manifest.install_size_bytes,
    )?;

    let executable_path = safe_join(&install_path, &manifest.executable)?;
    if !executable_path.exists() {
        return Err(CommandError::Install(format!(
            "Executable was not installed: {}",
            executable_path.display()
        )));
    }

    let install_record = InstalledItem {
        item_id: manifest.id.clone(),
        installed_version: manifest.version.clone(),
        library_id,
        install_path: install_path.to_string_lossy().into_owned(),
        installed_at: Utc::now(),
        last_verified_at: Some(Utc::now()),
        last_launched_at: None,
        size_on_disk_bytes: directory_size(&install_path),
        status: InstalledStatus::Installed,
        last_error: None,
    };

    let install_manifest_path = install_path.join("lumorix-install.json");
    let raw = serde_json::to_string_pretty(&manifest).map_err(|err| {
        CommandError::Install(format!("Could not serialize install manifest: {err}"))
    })?;
    fs::write(&install_manifest_path, raw).map_err(|err| {
        CommandError::Install(format!(
            "Could not write install manifest {}: {err}",
            install_manifest_path.display()
        ))
    })?;

    runtime.update_installed_item(install_record, &manifest)?;
    update_job(
        &runtime,
        &job_id,
        InstallPhase::Completed,
        100.0,
        "Ready to use",
        manifest.install_size_bytes,
        manifest.install_size_bytes,
    )?;
    mutate_job(&runtime, &job_id, |job| {
        job.status = JobStatus::Completed;
    })?;
    runtime.clear_item_error(&manifest.id)?;
    runtime.append_log("INFO", &format!("Completed {:?} for {}", mode, manifest.id));

    Ok(())
}

async fn run_move_pipeline(
    runtime: LauncherRuntime,
    job_id: String,
    item_id: String,
    target_library_id: String,
) -> Result<()> {
    update_job(
        &runtime,
        &job_id,
        InstallPhase::Preparing,
        4.0,
        "Preparing move operation",
        0,
        0,
    )?;

    let manifest = find_manifest(&runtime, &item_id)?;
    let config = runtime.load_config()?;
    let target_library = config
        .libraries
        .iter()
        .find(|library| library.id == target_library_id)
        .ok_or_else(|| CommandError::Validation("Selected target library does not exist".into()))?;
    if target_library.status != LibraryStatus::Available {
        return Err(CommandError::Validation(format!(
            "Library '{}' is not available",
            target_library.name
        )));
    }

    let db = runtime.load_installed_db()?;
    let installed = db
        .items
        .iter()
        .find(|item| item.item_id == item_id)
        .cloned()
        .ok_or_else(|| CommandError::Install("Item is not installed".into()))?;
    if installed.library_id == target_library_id {
        return Err(CommandError::Validation(
            "Item is already in the selected library".into(),
        ));
    }

    let source_path = PathBuf::from(&installed.install_path);
    if !source_path.exists() {
        return Err(CommandError::Install(format!(
            "Current install path is missing: {}",
            source_path.display()
        )));
    }

    let source_library = config
        .libraries
        .iter()
        .find(|library| library.id == installed.library_id)
        .ok_or_else(|| CommandError::Install("Installed item references a missing library".into()))?;

    let source_library_root = PathBuf::from(&source_library.path);
    let target_library_root = PathBuf::from(&target_library.path);
    ensure_install_path_is_inside_library(&source_library_root, &source_path)?;
    fs::create_dir_all(&target_library_root).map_err(|err| {
        CommandError::Install(format!(
            "Could not create target library {}: {err}",
            target_library_root.display()
        ))
    })?;

    let folder_name: OsString = source_path
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_else(|| OsString::from(&manifest.default_install_folder));
    let final_target = target_library_root.join(&folder_name);
    ensure_install_path_is_inside_library(&target_library_root, &final_target)?;
    if final_target.exists() {
        return Err(CommandError::Install(format!(
            "Target install path already exists: {}",
            final_target.display()
        )));
    }

    let source_size = directory_size(&source_path);
    ensure_free_space(
        &target_library_root,
        source_size.saturating_add(64_u64 * 1024 * 1024),
        "target library",
    )?;

    let temp_target = target_library_root.join(format!(
        ".lumorix-move-{}-{}",
        manifest.id,
        Uuid::new_v4()
    ));

    let copy_result = copy_directory_with_progress(
        &runtime,
        &job_id,
        &source_path,
        &temp_target,
        source_size,
    );
    if let Err(err) = copy_result {
        if temp_target.exists() {
            let _ = fs::remove_dir_all(&temp_target);
        }
        return Err(err);
    }

    update_job(
        &runtime,
        &job_id,
        InstallPhase::Verifying,
        76.0,
        "Verifying copied files",
        source_size,
        source_size,
    )?;
    verify_copied_directory(&source_path, &temp_target)?;

    update_job(
        &runtime,
        &job_id,
        InstallPhase::Finalizing,
        88.0,
        "Switching to moved install",
        source_size,
        source_size,
    )?;
    fs::rename(&temp_target, &final_target).map_err(|err| {
        CommandError::Install(format!(
            "Could not finalize moved install {}: {err}",
            final_target.display()
        ))
    })?;

    let mut db = runtime.load_installed_db()?;
    let entry = db
        .items
        .iter_mut()
        .find(|item| item.item_id == item_id)
        .ok_or_else(|| CommandError::Install("Installed item was removed during move".into()))?;
    entry.library_id = target_library_id;
    entry.install_path = final_target.to_string_lossy().into_owned();
    entry.last_verified_at = Some(Utc::now());
    entry.size_on_disk_bytes = directory_size(&final_target);
    entry.status = InstalledStatus::Installed;
    entry.last_error = None;
    runtime.save_installed_db(&db)?;

    update_job(
        &runtime,
        &job_id,
        InstallPhase::Finalizing,
        95.0,
        "Cleaning up old install",
        source_size,
        source_size,
    )?;
    fs::remove_dir_all(&source_path).map_err(|err| {
        CommandError::Install(format!(
            "Could not remove previous install {}: {err}",
            source_path.display()
        ))
    })?;

    update_job(
        &runtime,
        &job_id,
        InstallPhase::Completed,
        100.0,
        "Move completed",
        source_size,
        source_size,
    )?;
    mutate_job(&runtime, &job_id, |job| {
        job.status = JobStatus::Completed;
    })?;
    runtime.clear_item_error(&manifest.id)?;
    runtime.append_log("INFO", &format!("Moved install for {}", manifest.id));

    Ok(())
}

async fn run_synthetic_download_steps(
    runtime: &LauncherRuntime,
    job_id: &str,
    total_bytes: u64,
) -> Result<()> {
    update_job(
        runtime,
        job_id,
        InstallPhase::Downloading,
        12.0,
        "Preparing local package",
        0,
        total_bytes,
    )?;

    for step in 1..=8 {
        check_cancelled(runtime, job_id)?;
        tokio::time::sleep(std::time::Duration::from_millis(160)).await;
        let downloaded = (total_bytes / 8).saturating_mul(step);
        update_job(
            runtime,
            job_id,
            InstallPhase::Downloading,
            12.0 + (step as f32 * 4.5),
            "Staging local package",
            downloaded.min(total_bytes),
            total_bytes,
        )?;
    }

    update_job(
        runtime,
        job_id,
        InstallPhase::Verifying,
        50.0,
        "Verifying package integrity",
        total_bytes,
        total_bytes,
    )?;
    tokio::time::sleep(std::time::Duration::from_millis(260)).await;
    Ok(())
}

async fn download_archive(
    runtime: &LauncherRuntime,
    job_id: &str,
    url: &str,
    expected_sha256: &str,
    expected_size: u64,
    target: &Path,
) -> Result<()> {
    update_job(
        runtime,
        job_id,
        InstallPhase::Downloading,
        10.0,
        "Downloading package",
        0,
        expected_size,
    )?;

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            CommandError::Install(format!("Could not create cache folder {}: {err}", parent.display()))
        })?;
    }

    let partial = partial_archive_path(target);
    let existing_bytes = fs::metadata(&partial).map(|meta| meta.len()).unwrap_or(0);

    let client = reqwest::Client::new();
    let mut request = client.get(url);
    if existing_bytes > 0 {
        request = request.header(RANGE, format!("bytes={existing_bytes}-"));
    }

    let response = request
        .send()
        .await
        .map_err(|err| CommandError::Network(format!("Download request failed: {err}")))?;
    if !(response.status().is_success() || response.status() == reqwest::StatusCode::PARTIAL_CONTENT)
    {
        return Err(CommandError::Network(format!(
            "Download failed with HTTP {}",
            response.status()
        )));
    }

    let server_supports_resume = response
        .headers()
        .get(ACCEPT_RANGES)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.to_ascii_lowercase().contains("bytes"));
    let is_partial_response = response.status() == reqwest::StatusCode::PARTIAL_CONTENT
        || response.headers().get(CONTENT_RANGE).is_some();
    let can_resume = existing_bytes > 0 && (server_supports_resume || is_partial_response);

    let existing_bytes = if existing_bytes > 0 && !can_resume {
        if partial.exists() {
            fs::remove_file(&partial).map_err(|err| {
                CommandError::Install(format!(
                    "Could not reset partial download {}: {err}",
                    partial.display()
                ))
            })?;
        }
        0
    } else {
        existing_bytes
    };

    let response_len = response
        .headers()
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .or_else(|| response.content_length())
        .unwrap_or(0);
    let total = if expected_size > 0 {
        expected_size
    } else {
        existing_bytes.saturating_add(response_len)
    };
    let mut stream = response.bytes_stream();
    let mut file = if existing_bytes > 0 {
        tokio::fs::OpenOptions::new()
            .append(true)
            .open(&partial)
            .await
            .map_err(|err| {
                CommandError::Install(format!(
                    "Could not open partial cache file {}: {err}",
                    partial.display()
                ))
            })?
    } else {
        tokio::fs::File::create(&partial).await.map_err(|err| {
            CommandError::Install(format!(
                "Could not create cache file {}: {err}",
                partial.display()
            ))
        })?
    };
    let mut downloaded = existing_bytes;

    if existing_bytes > 0 {
        update_job(
            runtime,
            job_id,
            InstallPhase::Downloading,
            12.0,
            "Resuming package download",
            existing_bytes,
            total,
        )?;
    }

    while let Some(chunk) = stream.next().await {
        check_cancelled(runtime, job_id)?;
        let chunk = chunk.map_err(|err| CommandError::Network(format!("Download failed: {err}")))?;
        file.write_all(&chunk).await.map_err(|err| {
            CommandError::Install(format!("Could not write cache file {}: {err}", partial.display()))
        })?;
        downloaded = downloaded.saturating_add(chunk.len() as u64);
        let ratio = if total == 0 {
            0.0
        } else {
            (downloaded as f32 / total as f32).clamp(0.0, 1.0)
        };
        update_job(
            runtime,
            job_id,
            InstallPhase::Downloading,
            12.0 + ratio * 38.0,
            "Downloading package",
            downloaded,
            total,
        )?;
    }

    file.flush().await.map_err(|err| {
        CommandError::Install(format!("Could not flush cache file {}: {err}", partial.display()))
    })?;

    update_job(
        runtime,
        job_id,
        InstallPhase::Verifying,
        52.0,
        "Checking SHA-256",
        downloaded,
        total,
    )?;

    let actual = hash_file_sha256(&partial)?;
    if actual.to_lowercase() != expected_sha256.to_lowercase() {
        return Err(CommandError::Install(format!(
            "SHA-256 mismatch for downloaded package. Expected {expected_sha256}, got {actual}"
        )));
    }

    if target.exists() {
        fs::remove_file(target).map_err(|err| {
            CommandError::Install(format!(
                "Could not replace cache file {}: {err}",
                target.display()
            ))
        })?;
    }
    fs::rename(&partial, target).map_err(|err| {
        CommandError::Install(format!(
            "Could not finalize cache file {}: {err}",
            target.display()
        ))
    })?;

    Ok(())
}

fn partial_archive_path(target: &Path) -> PathBuf {
    target.with_extension("zip.part")
}

fn hash_file_sha256(path: &Path) -> Result<String> {
    let mut file = fs::File::open(path)
        .map_err(|err| CommandError::Install(format!("Could not open {}: {err}", path.display())))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 1024 * 128];

    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|err| CommandError::Install(format!("Could not read {}: {err}", path.display())))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

fn ensure_free_space(path: &Path, required_bytes: u64, label: &str) -> Result<()> {
    if required_bytes == 0 {
        return Ok(());
    }

    let available = fs2::available_space(path).map_err(|err| {
        CommandError::Install(format!(
            "Could not determine free space for {} {}: {err}",
            label,
            path.display()
        ))
    })?;
    if available < required_bytes {
        return Err(CommandError::Install(format!(
            "Not enough free space in {} {}. Required {} bytes, available {} bytes",
            label,
            path.display(),
            required_bytes,
            available
        )));
    }

    Ok(())
}

fn copy_directory_with_progress(
    runtime: &LauncherRuntime,
    job_id: &str,
    source: &Path,
    target: &Path,
    source_size: u64,
) -> Result<()> {
    fs::create_dir_all(target).map_err(|err| {
        CommandError::Install(format!("Could not create {}: {err}", target.display()))
    })?;

    let files = list_relative_files(source)?;
    let total = source_size.max(1);
    let mut copied = 0_u64;

    for relative in files {
        check_cancelled(runtime, job_id)?;
        let input = source.join(&relative);
        let output = target.join(&relative);
        if let Some(parent) = output.parent() {
            fs::create_dir_all(parent).map_err(|err| {
                CommandError::Install(format!("Could not create {}: {err}", parent.display()))
            })?;
        }

        let copied_bytes = fs::copy(&input, &output).map_err(|err| {
            CommandError::Install(format!(
                "Could not copy {} to {}: {err}",
                input.display(),
                output.display()
            ))
        })?;
        copied = copied.saturating_add(copied_bytes);

        let ratio = (copied as f32 / total as f32).clamp(0.0, 1.0);
        update_job(
            runtime,
            job_id,
            InstallPhase::Installing,
            10.0 + ratio * 60.0,
            "Copying install files",
            copied.min(total),
            total,
        )?;
    }

    Ok(())
}

fn list_relative_files(base: &Path) -> Result<Vec<PathBuf>> {
    let mut stack = vec![base.to_path_buf()];
    let mut files = Vec::new();

    while let Some(current) = stack.pop() {
        let entries = fs::read_dir(&current).map_err(|err| {
            CommandError::Install(format!("Could not read {}: {err}", current.display()))
        })?;
        for entry in entries {
            let entry = entry
                .map_err(|err| CommandError::Install(format!("Could not read directory entry: {err}")))?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }

            let relative = path.strip_prefix(base).map_err(|err| {
                CommandError::Install(format!(
                    "Could not derive relative path for {}: {err}",
                    path.display()
                ))
            })?;
            files.push(relative.to_path_buf());
        }
    }

    files.sort();
    Ok(files)
}

fn verify_copied_directory(source: &Path, target: &Path) -> Result<()> {
    let source_files = list_relative_files(source)?;
    let target_files = list_relative_files(target)?;
    if source_files != target_files {
        return Err(CommandError::Install(
            "Copied install does not match source file structure".into(),
        ));
    }

    for relative in source_files {
        let source_file = source.join(&relative);
        let target_file = target.join(&relative);
        let source_meta = fs::metadata(&source_file).map_err(|err| {
            CommandError::Install(format!("Could not stat {}: {err}", source_file.display()))
        })?;
        let target_meta = fs::metadata(&target_file).map_err(|err| {
            CommandError::Install(format!("Could not stat {}: {err}", target_file.display()))
        })?;
        if source_meta.len() != target_meta.len() {
            return Err(CommandError::Install(format!(
                "Copied file size mismatch: {}",
                relative.display()
            )));
        }

        let source_hash = hash_file_sha256(&source_file)?;
        let target_hash = hash_file_sha256(&target_file)?;
        if source_hash != target_hash {
            return Err(CommandError::Install(format!(
                "Copied file hash mismatch: {}",
                relative.display()
            )));
        }
    }

    Ok(())
}

async fn install_synthetic_item(
    runtime: &LauncherRuntime,
    job_id: &str,
    executable_template: &str,
    content_files: &[crate::models::SyntheticFile],
    install_path: &Path,
    item_name: &str,
    version: &str,
) -> Result<()> {
    for (index, file) in content_files.iter().enumerate() {
        check_cancelled(runtime, job_id)?;
        let target = safe_join(install_path, &file.path)?;
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|err| {
                CommandError::Install(format!("Could not create {}: {err}", parent.display()))
            })?;
        }
        fs::write(&target, &file.content).map_err(|err| {
            CommandError::Install(format!("Could not write {}: {err}", target.display()))
        })?;
        update_job(
            runtime,
            job_id,
            InstallPhase::Installing,
            60.0 + (index as f32 * 5.0),
            "Writing content files",
            0,
            0,
        )?;
        tokio::time::sleep(std::time::Duration::from_millis(120)).await;
    }

    let executable = safe_join(install_path, "bin\\launch.cmd")?;
    if let Some(parent) = executable.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            CommandError::Install(format!("Could not create {}: {err}", parent.display()))
        })?;
    }

    let script = executable_template
        .replace("{{GAME_NAME}}", item_name)
        .replace("{{VERSION}}", version);
    fs::write(&executable, script).map_err(|err| {
        CommandError::Install(format!("Could not write {}: {err}", executable.display()))
    })?;

    Ok(())
}

fn extract_zip_archive(
    runtime: &LauncherRuntime,
    job_id: &str,
    archive_path: &Path,
    install_path: &Path,
    root_folder: Option<&str>,
) -> Result<()> {
    let file = fs::File::open(archive_path).map_err(|err| {
        CommandError::Install(format!("Could not open archive {}: {err}", archive_path.display()))
    })?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|err| CommandError::Install(format!("Invalid zip archive: {err}")))?;

    let entry_count = archive.len().max(1);
    for index in 0..archive.len() {
        check_cancelled(runtime, job_id)?;
        let mut entry = archive
            .by_index(index)
            .map_err(|err| CommandError::Install(format!("Could not read zip entry: {err}")))?;
        let enclosed = entry
            .enclosed_name()
            .ok_or_else(|| CommandError::Install("Archive contains an unsafe path".into()))?
            .to_owned();

        let relative = if let Some(root) = root_folder {
            enclosed
                .strip_prefix(root)
                .map_or(enclosed.clone(), |path| path.to_path_buf())
        } else {
            enclosed
        };

        if relative.as_os_str().is_empty() {
            continue;
        }

        let outpath = install_path.join(relative);
        if entry.name().ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|err| {
                CommandError::Install(format!("Could not create {}: {err}", outpath.display()))
            })?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent).map_err(|err| {
                    CommandError::Install(format!("Could not create {}: {err}", parent.display()))
                })?;
            }
            let mut outfile = fs::File::create(&outpath).map_err(|err| {
                CommandError::Install(format!("Could not create {}: {err}", outpath.display()))
            })?;
            let mut buffer = Vec::new();
            entry.read_to_end(&mut buffer).map_err(|err| {
                CommandError::Install(format!("Could not read archive entry: {err}"))
            })?;
            outfile.write_all(&buffer).map_err(|err| {
                CommandError::Install(format!("Could not write {}: {err}", outpath.display()))
            })?;
        }

        update_job(
            runtime,
            job_id,
            InstallPhase::Installing,
            58.0 + ((index + 1) as f32 / entry_count as f32) * 28.0,
            "Extracting archive",
            0,
            0,
        )?;
    }

    Ok(())
}

fn ensure_install_path_is_inside_library(library_root: &Path, install_path: &Path) -> Result<()> {
    if install_path == library_root {
        return Err(CommandError::Install(
            "Install path must not be the library root".into(),
        ));
    }

    let canonical_library = library_root.canonicalize().unwrap_or_else(|_| library_root.to_path_buf());
    let canonical_parent = install_path
        .parent()
        .and_then(|parent| parent.canonicalize().ok())
        .unwrap_or_else(|| canonical_library.clone());

    if !canonical_parent.starts_with(&canonical_library) {
        return Err(CommandError::Install(format!(
            "Install path {} is outside library {}",
            install_path.display(),
            library_root.display()
        )));
    }

    Ok(())
}

fn update_job(
    runtime: &LauncherRuntime,
    job_id: &str,
    phase: InstallPhase,
    progress: f32,
    message: &str,
    bytes_downloaded: u64,
    bytes_total: u64,
) -> Result<()> {
    mutate_job(runtime, job_id, |job| {
        job.status = if matches!(
            phase,
            InstallPhase::Completed | InstallPhase::Cancelled | InstallPhase::Failed
        ) {
            job.status.clone()
        } else {
            JobStatus::Running
        };
        job.phase = phase;
        job.progress = progress.clamp(0.0, 100.0);
        job.message = message.into();
        if bytes_total > 0 {
            job.bytes_downloaded = bytes_downloaded;
            job.bytes_total = bytes_total;
        }
        job.updated_at = Utc::now();
    })
}

fn mutate_job<F>(runtime: &LauncherRuntime, job_id: &str, update: F) -> Result<()>
where
    F: FnOnce(&mut InstallJob),
{
    let mut jobs = runtime
        .jobs
        .lock()
        .map_err(|_| CommandError::Storage("Install job state is locked".into()))?;
    let job = jobs
        .iter_mut()
        .find(|job| job.id == job_id)
        .ok_or_else(|| CommandError::Install(format!("Unknown install job: {job_id}")))?;
    update(job);
    Ok(())
}

fn check_cancelled(runtime: &LauncherRuntime, job_id: &str) -> Result<()> {
    let jobs = runtime
        .jobs
        .lock()
        .map_err(|_| CommandError::Storage("Install job state is locked".into()))?;
    let cancelled = jobs
        .iter()
        .find(|job| job.id == job_id)
        .is_some_and(|job| job.status == JobStatus::Cancelled);
    if cancelled {
        return Err(CommandError::Install("Job was cancelled".into()));
    }
    Ok(())
}

fn fail_job(runtime: &LauncherRuntime, job_id: &str, error: String) {
    let job_snapshot = runtime
        .jobs
        .lock()
        .ok()
        .and_then(|jobs| jobs.iter().find(|job| job.id == job_id).cloned());

    if job_snapshot
        .as_ref()
        .is_some_and(|job| job.status == JobStatus::Cancelled)
    {
        let _ = mutate_job(runtime, job_id, |job| {
            job.phase = InstallPhase::Cancelled;
            job.message = "Cancelled".into();
        });
        return;
    }

    if let Some(job) = &job_snapshot {
        if let Ok(mut db) = runtime.load_installed_db() {
            if let Some(installed) = db.items.iter_mut().find(|item| item.item_id == job.item_id) {
                installed.status = InstalledStatus::Broken;
                installed.last_error = Some(error.clone());
                let _ = runtime.save_installed_db(&db);
            }
        }

        let catalog = find_manifest(runtime, &job.item_id)
            .ok()
            .map(|manifest| catalog_record_from_manifest(&manifest));
        let _ = runtime.record_item_error(&job.item_id, catalog.as_ref(), &error);
    }

    let _ = mutate_job(runtime, job_id, |job| {
        job.status = JobStatus::Failed;
        job.phase = InstallPhase::Failed;
        job.message = "Installation failed".into();
        job.error = Some(error);
        job.updated_at = Utc::now();
    });
}

fn install_operation(mode: InstallMode) -> InstallOperation {
    match mode {
        InstallMode::Install => InstallOperation::Install,
        InstallMode::Update => InstallOperation::Update,
        InstallMode::Repair => InstallOperation::Repair,
        InstallMode::Move => InstallOperation::Move,
    }
}

fn catalog_record_from_manifest(manifest: &crate::models::ContentManifest) -> CatalogItemRecord {
    CatalogItemRecord {
        id: manifest.id.clone(),
        item_type: manifest.item_type.clone(),
        name: manifest.name.clone(),
        description: manifest.description.clone(),
        developer: manifest.developer.clone(),
        release_date: manifest.release_date.clone(),
        categories: if manifest.categories.is_empty() {
            vec!["Games".into()]
        } else {
            manifest.categories.clone()
        },
        tags: manifest.tags.clone(),
        cover_image: manifest.cover_image.clone(),
        banner_image: manifest.banner_image.clone(),
        icon_image: manifest.icon_image.clone(),
    }
}
