use base64::Engine;
use log::{error, info, warn};
use std::time::Duration;
use thiserror::Error;

type AppResult<T> = Result<T, AppError>;

macro_rules! err {
  ($($arg:tt)*) => {
    AppError::Message(format!($($arg)*))
  };
}

#[derive(Debug, Error)]
enum AppError {
    #[error("{0}")]
    Message(String),
}

fn format_reqwest_error(error: &reqwest::Error) -> String {
    let mut details: Vec<String> = Vec::new();

    if error.is_timeout() {
        details.push("timeout=true".to_string());
    }
    if error.is_connect() {
        details.push("connect=true".to_string());
    }
    if error.is_request() {
        details.push("request=true".to_string());
    }
    if error.is_body() {
        details.push("body=true".to_string());
    }
    if error.is_decode() {
        details.push("decode=true".to_string());
    }
    if let Some(status) = error.status() {
        details.push(format!("status={status}"));
    }
    if let Some(url) = error.url() {
        details.push(format!("url={url}"));
    }

    format!("{error}; debug={error:?}; {}", details.join(", "))
}

fn build_http_client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
    .http1_only()
    .connect_timeout(Duration::from_secs(10))
    .timeout(Duration::from_secs(45))
    .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ST-CardPlus/0.1.8")
    .build()
    .map_err(|error| err!("创建 HTTP 客户端失败: {error}"))
}

async fn upload_to_catbox(
    client: &reqwest::Client,
    bytes: &[u8],
    upload_name: &str,
    upload_mime: &str,
) -> AppResult<String> {
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

    Ok(result)
}

async fn upload_to_imgbb(
    client: &reqwest::Client,
    bytes: &[u8],
    upload_name: &str,
    api_key: &str,
) -> AppResult<String> {
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
                return Ok(url.trim().to_string());
            }
        }

        if let Some(url) = json.pointer("/data/display_url").and_then(|v| v.as_str()) {
            if !url.trim().is_empty() {
                return Ok(url.trim().to_string());
            }
        }

        last_error_message = Some("ImgBB 返回成功但未找到图片 URL".to_string());
    }

    Err(err!(
        "{}",
        last_error_message.unwrap_or_else(|| "请求 ImgBB 失败：未知错误".to_string())
    ))
}

#[tauri::command]
pub async fn upload_image_to_hosting(
    base64_data: String,
    file_name: Option<String>,
    mime_type: Option<String>,
    provider: String,
    imgbb_api_key: Option<String>,
) -> Result<String, String> {
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

    let client = build_http_client().map_err(|error| error.to_string())?;
    let provider = provider.trim().to_ascii_lowercase();

    match provider.as_str() {
        "catbox" => upload_to_catbox(&client, &bytes, &upload_name, &upload_mime)
            .await
            .map_err(|error| {
                error!("上传到 catbox 失败: {}", error);
                error.to_string()
            }),
        "imgbb" => {
            let key = imgbb_api_key.unwrap_or_default();
            upload_to_imgbb(&client, &bytes, &upload_name, &key)
                .await
                .map_err(|error| {
                    error!("上传到 imgbb 失败: {}", error);
                    error.to_string()
                })
        }
        _ => {
            warn!("不支持的图床提供商: {}", provider);
            Err(err!("不支持的图床提供商: {provider}").to_string())
        }
    }
}
