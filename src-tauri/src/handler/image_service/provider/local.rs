use crate::handler::image_service::{err, AppResult, UploadImageResult};
use log::info;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub fn images_dir(base_dir: &Path) -> PathBuf {
    base_dir.join("images")
}

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

pub fn infer_file_extension(upload_name: &str, upload_mime: &str) -> String {
    infer_extension_from_mime(upload_mime)
        .map(str::to_string)
        .or_else(|| infer_extension_from_name(upload_name))
        .unwrap_or_else(|| "png".to_string())
}

pub fn digest_to_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut hex = String::with_capacity(digest.len() * 2);
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(hex, "{byte:02x}");
    }
    hex
}

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

pub async fn store_local_image(
    app: &AppHandle,
    bytes: &[u8],
    upload_name: &str,
    upload_mime: &str,
) -> AppResult<UploadImageResult> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| err!("解析应用数据目录失败: {error}"))?;
    let target_path = build_local_image_path(&app_data_dir, bytes, upload_name, upload_mime);
    let parent_dir = target_path
        .parent()
        .ok_or_else(|| err!("解析本地图片目录失败"))?;

    tokio::fs::create_dir_all(parent_dir)
        .await
        .map_err(|error| err!("创建本地图片目录失败: {error}"))?;

    if !target_path.exists() {
        tokio::fs::write(&target_path, bytes)
            .await
            .map_err(|error| err!("写入本地图片失败: {error}"))?;
        info!("本地图片已保存: {}", target_path.display());
    } else {
        info!("复用已存在的本地图片: {}", target_path.display());
    }

    Ok(UploadImageResult {
        provider: "local".to_string(),
        url: None,
        saved_path: Some(target_path.to_string_lossy().to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::{build_local_image_path, digest_to_hex, images_dir, infer_file_extension};
    use std::path::Path;

    #[test]
    fn infers_extension_from_mime_before_name() {
        let extension = infer_file_extension("avatar.jpeg", "image/png");
        assert_eq!(extension, "png");
    }

    #[test]
    fn falls_back_to_file_name_extension_when_mime_unknown() {
        let extension = infer_file_extension("avatar.WebP", "application/octet-stream");
        assert_eq!(extension, "webp");
    }

    #[test]
    fn falls_back_to_png_when_input_has_no_extension() {
        let extension = infer_file_extension("avatar", "");
        assert_eq!(extension, "png");
    }

    #[test]
    fn builds_hashed_local_file_name() {
        let path = build_local_image_path(
            Path::new("/tmp/app-data"),
            b"hello",
            "avatar.png",
            "image/png",
        );
        let expected_digest = digest_to_hex(b"hello");
        let expected_path =
            images_dir(Path::new("/tmp/app-data")).join(format!("{expected_digest}.png"));
        assert_eq!(path, expected_path);
    }
}
