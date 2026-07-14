use base64::Engine;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, CONTENT_TYPE};
use reqwest::Method;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use std::time::Duration;

static HTTP_CLIENT: LazyLock<Result<reqwest::Client, String>> = LazyLock::new(build_http_client);

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
    .cookie_store(true)
    .connect_timeout(Duration::from_secs(10))
    .timeout(Duration::from_secs(45))
    .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ST-CardPlus/0.1.20")
    .build()
    .map_err(|error| format!("创建 HTTP 客户端失败: {error}"))
}

fn http_client() -> Result<reqwest::Client, String> {
    match &*HTTP_CLIENT {
        Ok(client) => Ok(client.clone()),
        Err(error) => Err(error.clone()),
    }
}

fn sanitize_download_file_name(raw: &str) -> String {
    let mut name = raw
        .trim()
        .replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_");
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
    url.path_segments()
        .and_then(|mut segments| segments.next_back())
        .filter(|segment| !segment.trim().is_empty())
        .map(sanitize_download_file_name)
        .unwrap_or_else(|| "download".to_string())
}

/// HTTP fetch result returned to the webview as base64 data plus response metadata.
#[derive(Serialize)]
pub struct HttpFetchResult {
    base64_data: String,
    file_name: String,
    mime_type: String,
    status: u16,
    url: String,
}

/// HTTP request passed from the webview to the desktop HTTP client.
#[derive(Deserialize)]
pub struct HttpRequest {
    url: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

fn parse_http_method(raw: Option<&str>) -> Result<Method, String> {
    let value = raw.unwrap_or("GET").trim().to_ascii_uppercase();
    match value.as_str() {
        "GET" => Ok(Method::GET),
        "POST" => Ok(Method::POST),
        "PUT" => Ok(Method::PUT),
        "PATCH" => Ok(Method::PATCH),
        "DELETE" => Ok(Method::DELETE),
        "HEAD" => Ok(Method::HEAD),
        "OPTIONS" => Ok(Method::OPTIONS),
        _ => Err(format!("不支持的 HTTP 方法: {value}")),
    }
}

fn parse_headers(headers: Option<HashMap<String, String>>) -> Result<HeaderMap, String> {
    let mut parsed = HeaderMap::new();
    for (name, value) in headers.unwrap_or_default() {
        let header_name = HeaderName::from_bytes(name.as_bytes())
            .map_err(|error| format!("HTTP 请求头名称无效 {name}: {error}"))?;
        let header_value = HeaderValue::from_str(&value)
            .map_err(|error| format!("HTTP 请求头值无效 {name}: {error}"))?;
        parsed.insert(header_name, header_value);
    }
    Ok(parsed)
}

async fn request_http_result(request: HttpRequest) -> Result<HttpFetchResult, String> {
    let parsed_url = reqwest::Url::parse(request.url.trim())
        .map_err(|error| format!("URL 无效: {error}"))?;
    match parsed_url.scheme() {
        "http" | "https" => {}
        _ => return Err("仅支持下载 http/https 链接".to_string()),
    }

    let method = parse_http_method(request.method.as_deref())?;
    let headers = parse_headers(request.headers)?;
    let client = http_client()?;
    let mut builder = client.request(method, parsed_url.clone()).headers(headers);
    if let Some(body) = request.body {
        builder = builder.body(body);
    }
    let response = builder
        .send()
        .await
        .map_err(|error| format!("HTTP 请求失败: {}", format_reqwest_error(&error)))?;

    let status = response.status();
    let header_mime = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);

    let file_name = file_name_from_url(&parsed_url);
    let mime_type = header_mime.unwrap_or_else(|| infer_mime_from_name(&file_name).to_string());
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("读取 HTTP 响应失败: {}", format_reqwest_error(&error)))?;

    Ok(HttpFetchResult {
        base64_data: base64::engine::general_purpose::STANDARD.encode(bytes),
        file_name,
        mime_type,
        status: status.as_u16(),
        url: parsed_url.to_string(),
    })
}

async fn fetch_http_result(url: String) -> Result<HttpFetchResult, String> {
    let result = request_http_result(HttpRequest {
        url,
        method: None,
        headers: None,
        body: None,
    }).await?;
    if result.status < 200 || result.status >= 300 {
        return Err(format!("下载失败（HTTP {}）", result.status));
    }
    if result.base64_data.is_empty() {
        return Err("下载失败：响应数据为空".to_string());
    }
    Ok(result)
}

/// Sends an HTTP(S) request from the desktop process and returns response metadata.
#[tauri::command]
pub async fn request_http(request: HttpRequest) -> Result<HttpFetchResult, String> {
    request_http_result(request).await
}

/// Fetches an HTTP(S) resource from the desktop process and returns response metadata.
#[tauri::command]
pub async fn fetch_http(url: String) -> Result<HttpFetchResult, String> {
    fetch_http_result(url).await
}
