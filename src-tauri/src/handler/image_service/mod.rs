//! Image-hosting command and provider dispatch.

use crate::handler::support::{AppError, AppResult, AppState};
use base64::Engine;
use log::{error, info, warn};
use serde::Serialize;
use tauri::AppHandle;

pub mod provider;

#[derive(Debug, Serialize)]
/// Upload result returned to the webview.
pub struct UploadImageResult {
    pub provider: String,
    pub url: Option<String>,
    pub saved_path: Option<String>,
}

/// Uploads an image to a configured hosting provider or stores it locally.
#[tauri::command]
pub async fn upload_image_to_hosting(
    state: tauri::State<'_, AppState>,
    app: AppHandle,
    base64_data: String,
    file_name: Option<String>,
    mime_type: Option<String>,
    provider: String,
    imgbb_api_key: Option<String>,
) -> AppResult<UploadImageResult> {
    info!("开始上传图片到图床 provider={}", provider);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data.trim())
        .map_err(|error| AppError::invalid(format!("base64 解码失败: {error}")))?;

    let upload_name = file_name
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| "avatar.png".to_string());
    let upload_mime = mime_type
        .filter(|mime| !mime.trim().is_empty())
        .unwrap_or_else(|| "image/png".to_string());

    let provider = HostingProvider::parse(&provider)?;

    match provider {
        HostingProvider::Catbox => provider::catbox::upload_to_catbox(
            &state.clients.image_hosting,
            &bytes,
            &upload_name,
            &upload_mime,
        )
        .await
        .inspect_err(|error| {
            error!("上传到 catbox 失败: {}", error);
        }),
        HostingProvider::ImgBb => {
            let key = imgbb_api_key.unwrap_or_default();
            provider::imgbb::upload_to_imgbb(
                &state.clients.image_hosting,
                &bytes,
                &upload_name,
                &key,
            )
            .await
            .inspect_err(|error| {
                error!("上传到 imgbb 失败: {}", error);
            })
        }
        HostingProvider::Local => {
            provider::local::store_local_image(&app, &bytes, &upload_name, &upload_mime)
                .await
                .inspect_err(|error| {
                    error!("保存到本地存储失败: {}", error);
                })
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum HostingProvider {
    Catbox,
    ImgBb,
    Local,
}

impl HostingProvider {
    fn parse(raw: &str) -> AppResult<Self> {
        let normalized = raw.trim().to_ascii_lowercase();
        match normalized.as_str() {
            "catbox" => Ok(Self::Catbox),
            "imgbb" => Ok(Self::ImgBb),
            "local" => Ok(Self::Local),
            _ => {
                warn!("不支持的图床提供商: {normalized}");
                Err(AppError::invalid(format!(
                    "不支持的图床提供商: {normalized}"
                )))
            }
        }
    }
}
