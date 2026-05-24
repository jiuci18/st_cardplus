use crate::handler::image_service::provider::format_reqwest_error;
use crate::handler::image_service::{err, AppResult, UploadImageResult};
use base64::Engine;
use log::warn;
use std::time::Duration;

pub async fn upload_to_imgbb(
    client: &reqwest::Client,
    bytes: &[u8],
    upload_name: &str,
    api_key: &str,
) -> AppResult<UploadImageResult> {
    if api_key.trim().is_empty() {
        return Err(err!("ImgBB API Key 不能为空"));
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
        let body = response
            .text()
            .await
            .map_err(|error| err!("读取 ImgBB 响应失败: {}", format_reqwest_error(&error)))?;

        if !status.is_success() {
            last_error_message = Some(format!("ImgBB 返回失败状态 {status}: {body}"));
            continue;
        }

        let json: serde_json::Value =
            serde_json::from_str(&body).map_err(|error| err!("解析 ImgBB 响应失败: {error}"))?;
        let success = json
            .get("success")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        if !success {
            let message = json
                .pointer("/error/message")
                .and_then(|v| v.as_str())
                .unwrap_or("ImgBB 上传失败");
            last_error_message = Some(format!("ImgBB 返回错误: {message}"));
            continue;
        }

        if let Some(url) = json.pointer("/data/url").and_then(|v| v.as_str()) {
            if !url.trim().is_empty() {
                return Ok(UploadImageResult {
                    provider: "imgbb".to_string(),
                    url: Some(url.trim().to_string()),
                    saved_path: None,
                });
            }
        }

        if let Some(url) = json.pointer("/data/display_url").and_then(|v| v.as_str()) {
            if !url.trim().is_empty() {
                return Ok(UploadImageResult {
                    provider: "imgbb".to_string(),
                    url: Some(url.trim().to_string()),
                    saved_path: None,
                });
            }
        }

        last_error_message = Some("ImgBB 返回成功但未找到图片 URL".to_string());
    }

    Err(err!(
        "{}",
        last_error_message.unwrap_or_else(|| "请求 ImgBB 失败：未知错误".to_string())
    ))
}
