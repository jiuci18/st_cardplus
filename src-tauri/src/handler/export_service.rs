//! Binary export and native save-dialog commands.

use crate::handler::support::{AppError, AppResult, sanitize_file_name};
use base64::Engine as _;
use serde::Serialize;
use std::path::{Path, PathBuf};

async fn to_directory(path: &str) -> Option<PathBuf> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return None;
    }
    let candidate = PathBuf::from(trimmed);
    tokio::fs::metadata(&candidate)
        .await
        .ok()
        .filter(|metadata| metadata.is_dir())
        .map(|_| candidate)
}

/// Sanitizes a user-provided export filename and supplies the binary fallback.
pub fn sanitize_download_file_name(raw: &str) -> String {
    sanitize_file_name(raw, "download.bin")
}

/// Successful file-save metadata returned to the webview.
#[derive(Serialize)]
pub struct SaveFileResult {
    saved_path: String,
    saved_dir: String,
    used_dialog: bool,
}

/// Decodes and saves binary data, using the remembered directory when possible.
///
/// Invalid base64 and filesystem failures are returned as localized command errors.
/// Cancelling the native dialog returns `用户取消保存`.
#[tauri::command]
pub async fn save_binary_file(
    base64_data: String,
    file_name: String,
    default_dir: Option<String>,
    quick_save: Option<bool>,
) -> AppResult<SaveFileResult> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data.trim())
        .map_err(|error| AppError::invalid(format!("base64 解码失败: {error}")))?;
    let safe_file_name = sanitize_download_file_name(&file_name);
    let default_directory = match default_dir.as_deref() {
        Some(path) => to_directory(path).await,
        None => None,
    };

    if quick_save.unwrap_or(true)
        && let Some(dir) = default_directory.as_ref()
    {
        let target = dir.join(&safe_file_name);
        tokio::fs::write(&target, &bytes)
            .await
            .map_err(|error| AppError::io(format!("快捷保存失败: {error}")))?;
        return Ok(save_result(target, dir.clone(), false));
    }

    let mut dialog = rfd::AsyncFileDialog::new().set_file_name(&safe_file_name);
    if let Some(dir) = default_directory {
        dialog = dialog.set_directory(dir);
    }

    let selected = dialog
        .save_file()
        .await
        .ok_or_else(|| AppError::cancelled("用户取消保存"))?;
    let selected_path = selected.path().to_path_buf();

    tokio::fs::write(&selected_path, &bytes)
        .await
        .map_err(|error| AppError::io(format!("写入文件失败: {error}")))?;

    let saved_dir = selected_path
        .parent()
        .unwrap_or_else(|| Path::new(""))
        .to_path_buf();
    Ok(save_result(selected_path, saved_dir, true))
}

fn save_result(path: PathBuf, directory: PathBuf, used_dialog: bool) -> SaveFileResult {
    SaveFileResult {
        saved_path: path.to_string_lossy().into_owned(),
        saved_dir: directory.to_string_lossy().into_owned(),
        used_dialog,
    }
}
