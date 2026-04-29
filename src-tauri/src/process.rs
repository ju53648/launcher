use std::{
    path::PathBuf,
    process::{Child, Command, Stdio},
    thread,
    time::Instant,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(windows)]
const DETACHED_PROCESS: u32 = 0x00000008;

fn spawn_clean(command: &mut Command, hide_console: bool) -> Result<Child> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    #[cfg(windows)]
    {
        let mut flags = DETACHED_PROCESS;
        if hide_console {
            flags |= CREATE_NO_WINDOW;
        }
        command.creation_flags(flags);
    }

    command
        .spawn()
        .map_err(|err| CommandError::Process(format!("Could not launch item: {err}")))
}

use crate::{
    manifest::find_manifest,
    models::AppLanguage,
    paths::safe_join,
    storage::{CommandError, LauncherRuntime, Result},
};

fn launcher_language_code(runtime: &LauncherRuntime) -> &'static str {
    match runtime
        .load_config()
        .ok()
        .and_then(|config| config.language)
        .unwrap_or(AppLanguage::En)
    {
        AppLanguage::En => "en",
        AppLanguage::De => "de",
        AppLanguage::Pl => "pl",
    }
}

fn launcher_language_and_locale(runtime: &LauncherRuntime) -> (&'static str, &'static str) {
    match launcher_language_code(runtime) {
        "de" => ("de", "de-DE"),
        "pl" => ("pl", "pl-PL"),
        _ => ("en", "en-US"),
    }
}

fn apply_launcher_language(command: &mut Command, runtime: &LauncherRuntime) {
    let (language, locale) = launcher_language_and_locale(runtime);
    command.env("LUMORIX_LANGUAGE", language);
    command.env("LUMORIX_LOCALE", language);
    command.env("LANGUAGE", language);
    command.env("LANG", locale);
    command.env("LC_ALL", locale);
}

pub fn launch_item(runtime: &LauncherRuntime, item_id: &str) -> Result<()> {
    if runtime.is_item_process_running(item_id)? {
        return Err(CommandError::Process("Item is already running".into()));
    }

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

    let mut child = if extension == "cmd" || extension == "bat" {
        let mut command = Command::new("cmd");
        command
            .arg("/C")
            .arg(executable.to_string_lossy().to_string())
            .current_dir(&install_path);
        apply_launcher_language(&mut command, runtime);

        spawn_clean(&mut command, true)?
    } else if extension == "ps1" {
        let mut command = Command::new("powershell");
        command
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-ExecutionPolicy")
            .arg("Bypass")
            .arg("-File")
            .arg(executable.to_string_lossy().to_string())
            .current_dir(&install_path);
        apply_launcher_language(&mut command, runtime);

        spawn_clean(&mut command, true)?
    } else {
        let mut command = Command::new(&executable);
        command.current_dir(&install_path);
        apply_launcher_language(&mut command, runtime);

        // Even for native binaries, use detached spawn so launcher-side operations are not blocked by child lifetime.
        spawn_clean(&mut command, false)?
    };

    runtime.mark_item_used(item_id)?;
    runtime.register_running_item_process(item_id, child.id())?;

    let runtime_for_watcher = runtime.clone();
    let item_id_for_watcher = item_id.to_string();
    let started_at = Instant::now();
    thread::spawn(move || {
        if let Err(err) = child.wait() {
            runtime_for_watcher.append_log(
                "WARN",
                &format!("Could not wait for launched process {item_id_for_watcher}: {err}"),
            );
            let _ = runtime_for_watcher.unregister_running_item_process(&item_id_for_watcher);
            return;
        }

        let _ = runtime_for_watcher.unregister_running_item_process(&item_id_for_watcher);

        let elapsed_seconds = started_at.elapsed().as_secs();
        let minutes = ((elapsed_seconds + 30) / 60).max(1);
        if let Err(err) = runtime_for_watcher.add_playtime_minutes(&item_id_for_watcher, minutes) {
            runtime_for_watcher.append_log(
                "WARN",
                &format!("Could not store playtime for {item_id_for_watcher}: {err}"),
            );
        }
    });

    runtime.append_log("INFO", &format!("Launched {item_id}"));
    Ok(())
}

pub fn close_item(runtime: &LauncherRuntime, item_id: &str) -> Result<()> {
    let Some(pid) = runtime.running_item_pid(item_id)? else {
        // Treat close as idempotent so stale UI state after Alt+F4 can self-heal without error toast.
        runtime.append_log(
            "INFO",
            &format!("Close request ignored because item is not running: {item_id}"),
        );
        return Ok(());
    };

    #[cfg(windows)]
    {
        let status = Command::new("taskkill")
            .arg("/PID")
            .arg(pid.to_string())
            .arg("/T")
            .arg("/F")
            .status()
            .map_err(|err| CommandError::Process(format!("Could not close item process: {err}")))?;

        if !status.success() {
            return Err(CommandError::Process("Could not close running item process".into()));
        }
    }

    #[cfg(not(windows))]
    {
        let status = Command::new("kill")
            .arg("-TERM")
            .arg(pid.to_string())
            .status()
            .map_err(|err| CommandError::Process(format!("Could not close item process: {err}")))?;

        if !status.success() {
            return Err(CommandError::Process("Could not close running item process".into()));
        }
    }

    runtime.append_log("INFO", &format!("Closed running item {item_id}"));
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
