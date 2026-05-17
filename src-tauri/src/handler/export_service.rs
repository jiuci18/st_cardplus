use base64::Engine as _;
use serde::Serialize;
use std::path::PathBuf;

fn sanitize_file_name(raw: &str) -> String {
    let mut name = raw
        .trim()
        .replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_");
    if name.is_empty() {
        name = "download.bin".to_string();
    }
    name
}

fn to_directory(path: &str) -> Option<PathBuf> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return None;
    }
    let candidate = PathBuf::from(trimmed);
    if candidate.is_dir() {
        Some(candidate)
    } else {
        None
    }
}

#[derive(Serialize)]
pub struct SaveFileResult {
    saved_path: String,
    saved_dir: String,
    used_dialog: bool,
}

#[tauri::command]
pub fn save_binary_file(
    base64_data: String,
    file_name: String,
    default_dir: Option<String>,
    quick_save: Option<bool>,
) -> Result<SaveFileResult, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data.trim())
        .map_err(|error| format!("base64 解码失败: {error}"))?;
    let safe_file_name = sanitize_file_name(&file_name);
    let quick_save_enabled = quick_save.unwrap_or(true);

    if quick_save_enabled {
        if let Some(dir) = default_dir.as_deref().and_then(to_directory) {
            let target = dir.join(&safe_file_name);
            std::fs::write(&target, &bytes).map_err(|error| format!("快捷保存失败: {error}"))?;
            return Ok(SaveFileResult {
                saved_path: target.to_string_lossy().to_string(),
                saved_dir: dir.to_string_lossy().to_string(),
                used_dialog: false,
            });
        }
    }

    let mut dialog = rfd::FileDialog::new().set_file_name(&safe_file_name);

    if let Some(dir) = default_dir.as_deref().and_then(to_directory) {
        dialog = dialog.set_directory(dir);
    }

    let selected_path = dialog
        .save_file()
        .ok_or_else(|| "用户取消保存".to_string())?;

    std::fs::write(&selected_path, &bytes).map_err(|error| format!("写入文件失败: {error}"))?;

    let saved_dir = selected_path
        .parent()
        .unwrap_or_else(|| std::path::Path::new(""))
        .to_string_lossy()
        .to_string();

    Ok(SaveFileResult {
        saved_path: selected_path.to_string_lossy().to_string(),
        saved_dir,
        used_dialog: true,
    })
}
