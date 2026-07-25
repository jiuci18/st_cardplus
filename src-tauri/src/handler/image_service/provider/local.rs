//! Content-addressed image storage under the application data directory.

use crate::handler::image_service::UploadImageResult;
use crate::handler::support::{AppError, AppResult};
use log::info;
use sha2::{Digest, Sha256};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

/// Returns the image-storage directory below an application data directory.
pub fn images_dir(base_dir: &Path) -> PathBuf {
    base_dir.join("images")
}

/// Maps supported image MIME types to normalized filename extensions.
pub fn infer_extension_from_mime(upload_mime: &str) -> Option<&'static str> {
    let mime = upload_mime.trim().to_ascii_lowercase();
    match mime.as_str() {
        "image/png" => Some("png"),
        "image/jpeg" | "image/jpg" => Some("jpg"),
        "image/webp" => Some("webp"),
        "image/gif" => Some("gif"),
        "image/bmp" => Some("bmp"),
        "image/svg+xml" => Some("svg"),
        _ => None,
    }
}

/// Extracts a normalized, bounded alphanumeric extension from a filename.
pub fn infer_extension_from_name(upload_name: &str) -> Option<String> {
    let extension = Path::new(upload_name)
        .extension()
        .and_then(|value| value.to_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())?;

    let normalized = extension
        .chars()
        .map(|value| value.to_ascii_lowercase())
        .filter(|value| value.is_ascii_alphanumeric())
        .take(10)
        .collect::<String>();

    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

/// Infers a storage extension, preferring MIME type over filename.
pub fn infer_file_extension(upload_name: &str, upload_mime: &str) -> String {
    infer_extension_from_mime(upload_mime)
        .map(str::to_string)
        .or_else(|| infer_extension_from_name(upload_name))
        .unwrap_or_else(|| "png".to_string())
}

/// Computes the lowercase SHA-256 digest for content-addressed storage.
pub fn digest_to_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut hex = String::with_capacity(digest.len() * 2);
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(hex, "{byte:02x}");
    }
    hex
}

/// Builds the deterministic storage path for an image.
pub fn build_local_image_path(
    base_dir: &Path,
    bytes: &[u8],
    upload_name: &str,
    upload_mime: &str,
) -> PathBuf {
    let extension = infer_file_extension(upload_name, upload_mime);
    let file_name = format!("{}.{}", digest_to_hex(bytes), extension);
    images_dir(base_dir).join(file_name)
}

/// Stores an image once and reuses an existing content-addressed file.
pub async fn store_local_image(
    app: &AppHandle,
    bytes: &[u8],
    upload_name: &str,
    upload_mime: &str,
) -> AppResult<UploadImageResult> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::io(format!("解析应用数据目录失败: {error}")))?;
    let target_path = build_local_image_path(&app_data_dir, bytes, upload_name, upload_mime);
    let parent_dir = target_path
        .parent()
        .ok_or_else(|| AppError::io("解析本地图片目录失败"))?;

    tokio::fs::create_dir_all(parent_dir)
        .await
        .map_err(|error| AppError::io(format!("创建本地图片目录失败: {error}")))?;

    match tokio::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&target_path)
        .await
    {
        Ok(mut file) => {
            if let Err(error) = file.write_all(bytes).await {
                drop(file);
                let _ = tokio::fs::remove_file(&target_path).await;
                return Err(AppError::io(format!("写入本地图片失败: {error}")));
            }
            info!("本地图片已保存: {}", target_path.display());
        }
        Err(error) if error.kind() == ErrorKind::AlreadyExists => {
            info!("复用已存在的本地图片: {}", target_path.display());
        }
        Err(error) => {
            return Err(AppError::io(format!("创建本地图片失败: {error}")));
        }
    }

    Ok(UploadImageResult {
        provider: "local".to_string(),
        url: None,
        saved_path: Some(target_path.to_string_lossy().to_string()),
    })
}
