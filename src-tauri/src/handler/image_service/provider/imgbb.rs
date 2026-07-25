//! ImgBB multipart upload implementation.

use crate::handler::image_service::UploadImageResult;
use crate::handler::support::{AppError, AppResult, format_reqwest_error};
use base64::Engine;
use log::warn;
use serde::Deserialize;
use std::time::Duration;

/// Uploads image bytes to ImgBB and returns its preferred public URL.
pub async fn upload_to_imgbb(
    client: &reqwest::Client,
    bytes: &[u8],
    upload_name: &str,
    api_key: &str,
) -> AppResult<UploadImageResult> {
    if api_key.trim().is_empty() {
        return Err(AppError::invalid("ImgBB API Key 不能为空"));
    }

    let retry_delays_ms = [0_u64, 800_u64, 2000_u64];
    let endpoint = "https://api.imgbb.com/1/upload";
    let base64_image = base64::engine::general_purpose::STANDARD.encode(bytes);

    let mut last_error_message: Option<String> = None;

    for (attempt, delay_ms) in retry_delays_ms.iter().enumerate() {
        if *delay_ms > 0 {
            tokio::time::sleep(Duration::from_millis(*delay_ms)).await;
        }

        let form = reqwest::multipart::Form::new()
            .text("key", api_key.to_string())
            .text("name", upload_name.to_string())
            .text("image", base64_image.clone());

        let response = match client.post(endpoint).multipart(form).send().await {
            Ok(resp) => resp,
            Err(error) => {
                let message = format!(
                    "请求 ImgBB 失败（第 {} 次）: {}",
                    attempt + 1,
                    format_reqwest_error(&error)
                );
                warn!("[imgbb] {message}");
                last_error_message = Some(message);
                continue;
            }
        };

        let status = response.status();
        let body = response.text().await.map_err(|error| {
            AppError::network(format!(
                "读取 ImgBB 响应失败: {}",
                format_reqwest_error(&error)
            ))
        })?;

        if !status.is_success() {
            last_error_message = Some(format!("ImgBB 返回失败状态 {status}: {body}"));
            continue;
        }

        match parse_imgbb_response(&body)? {
            ImgBbResponseOutcome::Uploaded(url) => {
                return Ok(UploadImageResult {
                    provider: "imgbb".to_string(),
                    url: Some(url),
                    saved_path: None,
                });
            }
            ImgBbResponseOutcome::Rejected(message) => {
                last_error_message = Some(format!("ImgBB 返回错误: {message}"));
                continue;
            }
            ImgBbResponseOutcome::MissingUrl => {}
        }

        last_error_message = Some("ImgBB 返回成功但未找到图片 URL".to_string());
    }

    Err(AppError::remote(
        last_error_message.unwrap_or_else(|| "请求 ImgBB 失败：未知错误".to_string()),
    ))
}

/// Semantic result extracted from an ImgBB JSON response.
#[derive(Debug, Eq, PartialEq)]
pub enum ImgBbResponseOutcome {
    /// ImgBB accepted the image and returned a public URL.
    Uploaded(String),
    /// ImgBB rejected the upload with a service message.
    Rejected(String),
    /// ImgBB reported success without a usable URL.
    MissingUrl,
}

/// Parses an ImgBB response without applying retry policy.
pub fn parse_imgbb_response(body: &str) -> AppResult<ImgBbResponseOutcome> {
    let parsed: ImgBbResponse = serde_json::from_str(body)
        .map_err(|error| AppError::remote(format!("解析 ImgBB 响应失败: {error}")))?;

    if !parsed.success {
        let message = parsed
            .error
            .and_then(|error| error.message)
            .unwrap_or_else(|| "ImgBB 上传失败".to_string());
        return Ok(ImgBbResponseOutcome::Rejected(message));
    }

    Ok(
        match parsed.data.as_ref().and_then(ImgBbData::preferred_url) {
            Some(url) => ImgBbResponseOutcome::Uploaded(url.to_string()),
            None => ImgBbResponseOutcome::MissingUrl,
        },
    )
}

#[derive(Debug, Deserialize)]
struct ImgBbResponse {
    #[serde(default)]
    success: bool,
    data: Option<ImgBbData>,
    error: Option<ImgBbError>,
}

#[derive(Debug, Deserialize)]
struct ImgBbData {
    url: Option<String>,
    display_url: Option<String>,
}

impl ImgBbData {
    fn preferred_url(&self) -> Option<&str> {
        self.url
            .as_deref()
            .filter(|url| !url.trim().is_empty())
            .or_else(|| {
                self.display_url
                    .as_deref()
                    .filter(|url| !url.trim().is_empty())
            })
            .map(str::trim)
    }
}

#[derive(Debug, Deserialize)]
struct ImgBbError {
    message: Option<String>,
}
