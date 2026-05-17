use base64::Engine;
use reqwest::header::CONTENT_TYPE;
use serde::Serialize;
use std::time::Duration;

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

fn build_http_client() -> Result<reqwest::Client, String> {
  reqwest::Client::builder()
    .http1_only()
    .connect_timeout(Duration::from_secs(10))
    .timeout(Duration::from_secs(45))
    .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ST-CardPlus/0.1.20")
    .build()
    .map_err(|error| format!("创建 HTTP 客户端失败: {error}"))
}

fn sanitize_download_file_name(raw: &str) -> String {
  let mut name = raw.trim().replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_");
  if name.is_empty() {
    name = "download".to_string();
  }
  name
}

fn infer_mime_from_name(file_name: &str) -> &'static str {
  let lower = file_name.to_ascii_lowercase();
  if lower.ends_with(".png") {
    "image/png"
  } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
    "image/jpeg"
  } else if lower.ends_with(".webp") {
    "image/webp"
  } else if lower.ends_with(".gif") {
    "image/gif"
  } else if lower.ends_with(".json") {
    "application/json"
  } else {
    "application/octet-stream"
  }
}

fn file_name_from_url(url: &reqwest::Url) -> String {
  url
    .path_segments()
    .and_then(|mut segments| segments.next_back())
    .filter(|segment| !segment.trim().is_empty())
    .map(sanitize_download_file_name)
    .unwrap_or_else(|| "download".to_string())
}

/// Binary HTTP fetch result returned to the webview as base64 data.
#[derive(Serialize)]
pub struct BinaryFetchResult {
  base64_data: String,
  file_name: String,
  mime_type: String,
}

/// Fetches an HTTP(S) resource from the desktop process.
///
/// When `expect_image` is true, a non-image Content-Type header is rejected
/// before the bytes are returned. The caller remains responsible for decoding
/// and validating image bytes whose server omitted Content-Type.
#[tauri::command]
pub async fn fetch_binary(url: String, expect_image: Option<bool>) -> Result<BinaryFetchResult, String> {
  let parsed_url = reqwest::Url::parse(url.trim()).map_err(|error| format!("URL 无效: {error}"))?;
  match parsed_url.scheme() {
    "http" | "https" => {}
    _ => return Err("仅支持下载 http/https 链接".to_string()),
  }

  let client = build_http_client()?;
  let response = client
    .get(parsed_url.clone())
    .send()
    .await
    .map_err(|error| format!("下载失败: {}", format_reqwest_error(&error)))?;

  let status = response.status();
  if !status.is_success() {
    return Err(format!("下载失败（HTTP {status}）"));
  }

  let header_mime = response
    .headers()
    .get(CONTENT_TYPE)
    .and_then(|value| value.to_str().ok())
    .and_then(|value| value.split(';').next())
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(str::to_string);

  if expect_image.unwrap_or(false) {
    if let Some(mime) = header_mime.as_deref() {
      if !mime.to_ascii_lowercase().starts_with("image/") {
        return Err(format!("链接返回的内容不是图片: {mime}"));
      }
    }
  }

  let file_name = file_name_from_url(&parsed_url);
  let mime_type = header_mime.unwrap_or_else(|| infer_mime_from_name(&file_name).to_string());
  let bytes = response
    .bytes()
    .await
    .map_err(|error| format!("读取下载数据失败: {}", format_reqwest_error(&error)))?;

  if bytes.is_empty() {
    return Err("下载失败：响应数据为空".to_string());
  }

  Ok(BinaryFetchResult {
    base64_data: base64::engine::general_purpose::STANDARD.encode(bytes),
    file_name,
    mime_type,
  })
}
