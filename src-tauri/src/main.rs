#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod installer;
mod launcher_update;
mod libraries;
mod manifest;
mod models;
mod paths;
mod process;
mod storage;

use commands::{
    add_library, bootstrap, cancel_job, check_game_updates, check_launcher_updates,
    clear_completed_jobs, complete_onboarding, get_snapshot, launch_game, open_install_folder,
    move_install_game, remove_library, rename_library, repair_game, set_default_library,
    start_install_game, start_update_game, uninstall_game, update_preferences,
};
use storage::LauncherRuntime;

fn main() {
    let runtime = LauncherRuntime::initialize().expect("failed to initialize Lumorix runtime");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(runtime)
        .invoke_handler(tauri::generate_handler![
            bootstrap,
            get_snapshot,
            complete_onboarding,
            add_library,
            rename_library,
            remove_library,
            set_default_library,
            start_install_game,
            start_update_game,
            repair_game,
            uninstall_game,
            move_install_game,
            launch_game,
            open_install_folder,
            check_launcher_updates,
            check_game_updates,
            cancel_job,
            clear_completed_jobs,
            update_preferences
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lumorix Launcher");
}
