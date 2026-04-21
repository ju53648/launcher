use std::{path::PathBuf, process::Command};

use crate::{
    manifest::find_manifest,
    paths::safe_join,
    storage::{CommandError, LauncherRuntime, Result},
};

pub fn launch_item(runtime: &LauncherRuntime, item_id: &str) -> Result<()> {
    let manifest = find_manifest(runtime, item_id)?;
    let installed_db = runtime.load_installed_db()?;
    let installed = installed_db
        .items
        .iter()
        .find(|item| item.item_id == item_id)
        .ok_or_else(|| CommandError::Process("Item is not installed".into()))?;

    let install_path = PathBuf::from(&installed.install_path);
    let executable = safe_join(&install_path, &manifest.executable)?;
    if !executable.exists() {
        return Err(CommandError::Process(format!(
            "Executable does not exist: {}",
            executable.display()
        )));
    }

    let extension = executable
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_lowercase();

    if extension == "cmd" || extension == "bat" {
        Command::new("cmd")
            .arg("/C")
            .arg("start")
            .arg("")
            .arg(executable.to_string_lossy().to_string())
            .current_dir(&install_path)
            .spawn()
            .map_err(|err| CommandError::Process(format!("Could not launch item: {err}")))?;
    } else {
        Command::new(&executable)
            .current_dir(&install_path)
            .spawn()
            .map_err(|err| CommandError::Process(format!("Could not launch item: {err}")))?;
    }

    runtime.mark_item_used(item_id)?;
    runtime.append_log("INFO", &format!("Launched {item_id}"));
    Ok(())
}

pub fn open_install_folder(runtime: &LauncherRuntime, item_id: &str) -> Result<()> {
    let installed_db = runtime.load_installed_db()?;
    let installed = installed_db
        .items
        .iter()
        .find(|item| item.item_id == item_id)
        .ok_or_else(|| CommandError::Process("Item is not installed".into()))?;
    let install_path = PathBuf::from(&installed.install_path);
    if !install_path.exists() {
        return Err(CommandError::Process(format!(
            "Install folder does not exist: {}",
            install_path.display()
        )));
    }

    Command::new("explorer")
        .arg(install_path)
        .spawn()
        .map_err(|err| CommandError::Process(format!("Could not open folder: {err}")))?;
    Ok(())
}
