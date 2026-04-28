#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn js_string_literal(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len() + 2);
    escaped.push('"');
    for ch in value.chars() {
        match ch {
            '\\' => escaped.push_str("\\\\"),
            '"' => escaped.push_str("\\\""),
            '\n' => escaped.push_str("\\n"),
            '\r' => escaped.push_str("\\r"),
            '\t' => escaped.push_str("\\t"),
            _ => escaped.push(ch),
        }
    }
    escaped.push('"');
    escaped
}

fn main() {
    let launcher_language = std::env::var("LUMORIX_LANGUAGE")
        .or_else(|_| std::env::var("LUMORIX_LOCALE"))
        .unwrap_or_else(|_| "en".to_string());

    tauri::Builder::default()
        .setup(move |app| {
            if let Some(window) = app.get_webview_window("main") {
                let script = format!(
                    "window.__LUMORIX_LANGUAGE = {lang}; window.dispatchEvent(new CustomEvent('lumorix-language', {{ detail: window.__LUMORIX_LANGUAGE }}));",
                    lang = js_string_literal(&launcher_language)
                );
                let _ = window.eval(&script);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Lumorix DropDash");
}
