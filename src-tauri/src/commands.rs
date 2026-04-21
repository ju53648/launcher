use tauri::State;

use crate::{
    installer::{
        cancel_job as cancel_install_job, clear_completed_jobs as clear_finished_jobs,
        move_install_item as move_install, start_install_job,
        uninstall_item as uninstall_installed_item, verify_item, InstallMode,
    },
    launcher_update::check_launcher_updates as run_launcher_update_check,
    libraries::{
        create_library, ensure_library_is_removable, ensure_unique_library_path,
        normalize_default_library, normalize_library_name,
    },
    manifest::find_manifest,
    models::{AppLanguage, CommandOk, InstallJob, LauncherSnapshot},
    paths::recommended_library_path,
    process::{launch_item as spawn_item_process, open_install_folder as open_folder},
    storage::{CommandError, LauncherRuntime, Result},
};

#[tauri::command]
pub fn bootstrap(state: State<'_, LauncherRuntime>) -> Result<LauncherSnapshot> {
    state.append_log("INFO", "Bootstrap requested");
    state.build_snapshot()
}

#[tauri::command]
pub fn get_snapshot(state: State<'_, LauncherRuntime>) -> Result<LauncherSnapshot> {
    state.build_snapshot()
}

#[tauri::command]
pub fn complete_onboarding(
    state: State<'_, LauncherRuntime>,
    library_path: Option<String>,
) -> Result<LauncherSnapshot> {
    let mut config = state.load_config()?;
    if config.libraries.is_empty() {
        let path = library_path.unwrap_or_else(|| {
            recommended_library_path()
                .map(|path| path.to_string_lossy().into_owned())
                .unwrap_or_else(|_| "C:\\Lumorix\\Games".into())
        });
        ensure_unique_library_path(&config, &path)?;
        let library = create_library(default_library_name(config.language).into(), path, true)?;
        config.default_library_id = Some(library.id.clone());
        config.libraries.push(library);
    }

    normalize_default_library(&mut config);
    config.onboarding_completed = true;
    state.save_config(&config)?;
    state.append_log("INFO", "Onboarding completed");
    state.build_snapshot()
}

#[tauri::command]
pub fn add_library(
    state: State<'_, LauncherRuntime>,
    name: String,
    path: String,
) -> Result<LauncherSnapshot> {
    let mut config = state.load_config()?;
    ensure_unique_library_path(&config, &path)?;
    let is_default = config.libraries.is_empty();
    let library = create_library(name, path, is_default)?;
    if is_default {
        config.default_library_id = Some(library.id.clone());
    }
    config.libraries.push(library);
    normalize_default_library(&mut config);
    state.save_config(&config)?;
    state.append_log("INFO", "Added library");
    state.build_snapshot()
}

#[tauri::command]
pub fn rename_library(
    state: State<'_, LauncherRuntime>,
    library_id: String,
    name: String,
) -> Result<LauncherSnapshot> {
    let mut config = state.load_config()?;
    let library = config
        .libraries
        .iter_mut()
        .find(|library| library.id == library_id)
        .ok_or_else(|| CommandError::Validation("Library does not exist".into()))?;
    library.name = normalize_library_name(&name);
    state.save_config(&config)?;
    state.append_log("INFO", "Renamed library");
    state.build_snapshot()
}

#[tauri::command]
pub fn remove_library(
    state: State<'_, LauncherRuntime>,
    library_id: String,
) -> Result<LauncherSnapshot> {
    let mut config = state.load_config()?;
    let db = state.load_installed_db()?;
    ensure_library_is_removable(&db, &library_id)?;

    let before = config.libraries.len();
    config.libraries.retain(|library| library.id != library_id);
    if before == config.libraries.len() {
        return Err(CommandError::Validation("Library does not exist".into()));
    }
    if config.default_library_id.as_deref() == Some(&library_id) {
        config.default_library_id = config.libraries.first().map(|library| library.id.clone());
    }
    normalize_default_library(&mut config);
    state.save_config(&config)?;
    state.append_log("INFO", "Removed library");
    state.build_snapshot()
}

#[tauri::command]
pub fn set_default_library(
    state: State<'_, LauncherRuntime>,
    library_id: String,
) -> Result<LauncherSnapshot> {
    let mut config = state.load_config()?;
    if !config.libraries.iter().any(|library| library.id == library_id) {
        return Err(CommandError::Validation("Library does not exist".into()));
    }
    config.default_library_id = Some(library_id);
    normalize_default_library(&mut config);
    state.save_config(&config)?;
    state.append_log("INFO", "Changed default library");
    state.build_snapshot()
}

#[tauri::command]
pub fn update_preferences(
    state: State<'_, LauncherRuntime>,
    check_launcher_updates_on_start: bool,
    check_game_updates_on_start: bool,
    ask_for_library_each_install: bool,
    create_desktop_shortcuts: bool,
    keep_download_cache: bool,
) -> Result<LauncherSnapshot> {
    let mut config = state.load_config()?;
    config.check_launcher_updates_on_start = check_launcher_updates_on_start;
    config.check_game_updates_on_start = check_game_updates_on_start;
    config.install_behavior.ask_for_library_each_install = ask_for_library_each_install;
    config.install_behavior.create_desktop_shortcuts = create_desktop_shortcuts;
    config.install_behavior.keep_download_cache = keep_download_cache;
    state.save_config(&config)?;
    state.append_log("INFO", "Updated preferences");
    state.build_snapshot()
}

#[tauri::command]
pub fn set_language(
    state: State<'_, LauncherRuntime>,
    language: AppLanguage,
) -> Result<LauncherSnapshot> {
    let mut config = state.load_config()?;
    config.language = Some(language);
    state.save_config(&config)?;
    state.append_log("INFO", "Updated launcher language");
    state.build_snapshot()
}

#[tauri::command]
pub fn add_item_to_library(
    state: State<'_, LauncherRuntime>,
    item_id: String,
) -> Result<LauncherSnapshot> {
    let manifest = find_manifest(&state, &item_id)?;
    state.add_item_to_library(&manifest)?;
    state.append_log("INFO", &format!("Added item to library: {item_id}"));
    state.build_snapshot()
}

#[tauri::command]
pub fn start_install_item(
    state: State<'_, LauncherRuntime>,
    item_id: String,
    library_id: Option<String>,
) -> Result<InstallJob> {
    let config = state.load_config()?;
    let selected_library_id = library_id
        .or(config.default_library_id.clone())
        .ok_or_else(|| CommandError::Validation("No library is configured".into()))?;
    let manifest = find_manifest(&state, &item_id)?;
    state.add_item_to_library(&manifest)?;
    start_install_job(&state, item_id, selected_library_id, InstallMode::Install)
}

#[tauri::command]
pub fn start_update_item(
    state: State<'_, LauncherRuntime>,
    item_id: String,
) -> Result<InstallJob> {
    let installed_db = state.load_installed_db()?;
    let installed = installed_db
        .items
        .iter()
        .find(|item| item.item_id == item_id)
        .ok_or_else(|| CommandError::Install("Item is not installed".into()))?;
    start_install_job(
        &state,
        item_id,
        installed.library_id.clone(),
        InstallMode::Update,
    )
}

#[tauri::command]
pub fn repair_item(state: State<'_, LauncherRuntime>, item_id: String) -> Result<InstallJob> {
    let installed_db = state.load_installed_db()?;
    let installed = installed_db
        .items
        .iter()
        .find(|item| item.item_id == item_id)
        .ok_or_else(|| CommandError::Install("Item is not installed".into()))?;
    start_install_job(
        &state,
        item_id,
        installed.library_id.clone(),
        InstallMode::Repair,
    )
}

#[tauri::command]
pub fn uninstall_item(
    state: State<'_, LauncherRuntime>,
    item_id: String,
) -> Result<LauncherSnapshot> {
    uninstall_installed_item(&state, &item_id)?;
    state.build_snapshot()
}

#[tauri::command]
pub fn move_install_item(
    state: State<'_, LauncherRuntime>,
    item_id: String,
    target_library_id: String,
) -> Result<InstallJob> {
    move_install(&state, item_id, target_library_id)
}

#[tauri::command]
pub fn launch_item(state: State<'_, LauncherRuntime>, item_id: String) -> Result<CommandOk> {
    verify_item(&state, &item_id)?;
    spawn_item_process(&state, &item_id)?;
    Ok(CommandOk {
        message: "Item launched".into(),
    })
}

#[tauri::command]
pub fn open_install_folder(
    state: State<'_, LauncherRuntime>,
    item_id: String,
) -> Result<CommandOk> {
    open_folder(&state, &item_id)?;
    Ok(CommandOk {
        message: "Install folder opened".into(),
    })
}

#[tauri::command]
pub async fn check_launcher_updates(
    state: State<'_, LauncherRuntime>,
) -> Result<LauncherSnapshot> {
    let runtime = state.inner().clone();
    let result = run_launcher_update_check(&runtime).await;
    if let Err(err) = &result {
        runtime.append_log("ERROR", &format!("Launcher update check failed: {err}"));
        let mut guard = runtime
            .launcher_update
            .lock()
            .map_err(|_| CommandError::Storage("Launcher update state is locked".into()))?;
        guard.error = Some(err.to_string());
    }
    runtime.build_snapshot()
}

#[tauri::command]
pub fn check_item_updates(state: State<'_, LauncherRuntime>) -> Result<LauncherSnapshot> {
    state.append_log("INFO", "Item update check requested");
    state.build_snapshot()
}

#[tauri::command]
pub fn cancel_job(state: State<'_, LauncherRuntime>, job_id: String) -> Result<LauncherSnapshot> {
    cancel_install_job(&state, &job_id)?;
    state.build_snapshot()
}

#[tauri::command]
pub fn clear_completed_jobs(state: State<'_, LauncherRuntime>) -> Result<LauncherSnapshot> {
    clear_finished_jobs(&state)?;
    state.build_snapshot()
}

fn default_library_name(language: Option<AppLanguage>) -> &'static str {
    match language.unwrap_or(AppLanguage::En) {
        AppLanguage::En => "Main Library",
        AppLanguage::De => "Hauptbibliothek",
        AppLanguage::Pl => "Biblioteka główna",
    }
}
