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
    add_item_to_library, add_library, bootstrap, cancel_job, check_item_updates,
    check_launcher_updates, clear_completed_jobs, complete_onboarding, get_snapshot, launch_item,
    move_install_item, open_install_folder, remove_library, rename_library, repair_item,
    set_default_library, start_install_item, start_update_item, uninstall_item,
    update_preferences,
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
            add_item_to_library,
            start_install_item,
            start_update_item,
            repair_item,
            uninstall_item,
            move_install_item,
            launch_item,
            open_install_folder,
            check_launcher_updates,
            check_item_updates,
            cancel_job,
            clear_completed_jobs,
            update_preferences
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lumorix Launcher");
}
