use base64::Engine;
use log::{error, info, warn};
use serde::Serialize;
use tauri::AppHandle;
use thiserror::Error;

pub mod provider;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),
}

#[macro_export]
macro_rules! err {
  ($($arg:tt)*) => {
    $crate::handler::image_service::AppError::Message(format!($($arg)*))
  };
}
pub(crate) use err;

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
    app: AppHandle,
    base64_data: String,
    file_name: Option<String>,
    mime_type: Option<String>,
    provider: String,
    imgbb_api_key: Option<String>,
) -> Result<UploadImageResult, String> {
    info!("开始上传图片到图床 provider={}", provider);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data.trim())
        .map_err(|error| err!("base64 解码失败: {error}"))
        .map_err(|error| error.to_string())?;

    let upload_name = file_name
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| "avatar.png".to_string());
    let upload_mime = mime_type
        .filter(|mime| !mime.trim().is_empty())
        .unwrap_or_else(|| "image/png".to_string());

    let provider = provider.trim().to_ascii_lowercase();

    match provider.as_str() {
        "catbox" => {
            let client = provider::build_http_client().map_err(|error| error.to_string())?;
            provider::catbox::upload_to_catbox(&client, &bytes, &upload_name, &upload_mime)
                .await
                .map_err(|error| {
                    error!("上传到 catbox 失败: {}", error);
                    error.to_string()
                })
        }
        "imgbb" => {
            let client = provider::build_http_client().map_err(|error| error.to_string())?;
            let key = imgbb_api_key.unwrap_or_default();
            provider::imgbb::upload_to_imgbb(&client, &bytes, &upload_name, &key)
                .await
                .map_err(|error| {
                    error!("上传到 imgbb 失败: {}", error);
                    error.to_string()
                })
        }
        "local" => provider::local::store_local_image(&app, &bytes, &upload_name, &upload_mime)
            .await
            .map_err(|error| {
                error!("保存到本地存储失败: {}", error);
                error.to_string()
            }),
        _ => {
            warn!("不支持的图床提供商: {}", provider);
            Err(err!("不支持的图床提供商: {provider}").to_string())
        }
    }
}
