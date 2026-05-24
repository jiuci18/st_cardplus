use crate::handler::image_service::provider::format_reqwest_error;
use crate::handler::image_service::{err, AppResult, UploadImageResult};
use log::warn;
use std::time::Duration;

pub async fn upload_to_catbox(
    client: &reqwest::Client,
    bytes: &[u8],
    upload_name: &str,
    upload_mime: &str,
) -> AppResult<UploadImageResult> {
    let mut last_error_message: Option<String> = None;
    let retry_delays_ms = [0_u64, 800_u64, 2000_u64];
    let mut response: Option<reqwest::Response> = None;
    let endpoints = [
        "https://catbox.moe/user/api.php",
        "http://catbox.moe/user/api.php",
    ];

    for endpoint in endpoints {
        for (attempt, delay_ms) in retry_delays_ms.iter().enumerate() {
            if *delay_ms > 0 {
                tokio::time::sleep(Duration::from_millis(*delay_ms)).await;
            }

            let file_part = reqwest::multipart::Part::bytes(bytes.to_vec())
                .file_name(upload_name.to_string())
                .mime_str(upload_mime)
                .map_err(|error| err!("无效的 MIME 类型: {error}"))?;

            let form = reqwest::multipart::Form::new()
                .text("reqtype", "fileupload")
                .part("fileToUpload", file_part);

            match client.post(endpoint).multipart(form).send().await {
                Ok(resp) => {
                    response = Some(resp);
                    break;
                }
                Err(error) => {
                    let message = format!(
                        "请求 Catbox 失败（endpoint={}, 第 {} 次）: {}",
                        endpoint,
                        attempt + 1,
                        format_reqwest_error(&error)
                    );
                    warn!("[catbox] {message}");
                    last_error_message = Some(message);
                }
            }
        }

        if response.is_some() {
            break;
        }
    }

    let response = match response {
        Some(resp) => resp,
        None => {
            return Err(err!(
                "{}",
                last_error_message.unwrap_or_else(|| "请求 Catbox 失败：未知网络错误".to_string())
            ));
        }
    };

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| err!("读取 Catbox 响应失败: {}", format_reqwest_error(&error)))?;
    let result = body.trim().to_string();

    if !status.is_success() {
        return Err(err!("Catbox 返回失败状态 {status}: {result}"));
    }
    if result.is_empty() {
        return Err(err!("Catbox 返回为空"));
    }
    if result.starts_with("ERROR") {
        return Err(err!("{result}"));
    }

    Ok(UploadImageResult {
        provider: "catbox".to_string(),
        url: Some(result),
        saved_path: None,
    })
}
