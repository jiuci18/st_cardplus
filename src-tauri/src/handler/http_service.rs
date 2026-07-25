//! General HTTP transport commands used when browser CORS is unavailable.

use crate::handler::support::{
    AppError, AppResult, AppState, format_reqwest_error, sanitize_file_name,
};
use base64::Engine;
use reqwest::Method;
use reqwest::header::{CONTENT_TYPE, HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Infers a supported response MIME type from a filename.
pub fn infer_mime_from_name(file_name: &str) -> &'static str {
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

/// Extracts and sanitizes the final path segment from a URL.
pub fn file_name_from_url(url: &reqwest::Url) -> String {
    url.path_segments()
        .and_then(|mut segments| segments.next_back())
        .filter(|segment| !segment.trim().is_empty())
        .map(|name| sanitize_file_name(name, "download"))
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

impl HttpRequest {
    /// Creates a GET request without custom headers or a body.
    pub fn get(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            method: None,
            headers: None,
            body: None,
        }
    }
}

/// Parses the HTTP methods supported by the desktop transport.
pub fn parse_http_method(raw: Option<&str>) -> AppResult<Method> {
    let value = raw.unwrap_or("GET").trim().to_ascii_uppercase();
    match value.as_str() {
        "GET" => Ok(Method::GET),
        "POST" => Ok(Method::POST),
        "PUT" => Ok(Method::PUT),
        "PATCH" => Ok(Method::PATCH),
        "DELETE" => Ok(Method::DELETE),
        "HEAD" => Ok(Method::HEAD),
        "OPTIONS" => Ok(Method::OPTIONS),
        _ => Err(AppError::invalid(format!("不支持的 HTTP 方法: {value}"))),
    }
}

/// Parses webview-provided header names and values into reqwest headers.
pub fn parse_headers(headers: Option<HashMap<String, String>>) -> AppResult<HeaderMap> {
    let mut parsed = HeaderMap::new();
    for (name, value) in headers.unwrap_or_default() {
        let header_name = HeaderName::from_bytes(name.as_bytes())
            .map_err(|error| AppError::invalid(format!("HTTP 请求头名称无效 {name}: {error}")))?;
        let header_value = HeaderValue::from_str(&value)
            .map_err(|error| AppError::invalid(format!("HTTP 请求头值无效 {name}: {error}")))?;
        parsed.insert(header_name, header_value);
    }
    Ok(parsed)
}

async fn request_http_result(
    client: &reqwest::Client,
    request: HttpRequest,
) -> AppResult<HttpFetchResult> {
    let parsed_url = reqwest::Url::parse(request.url.trim())
        .map_err(|error| AppError::invalid(format!("URL 无效: {error}")))?;
    match parsed_url.scheme() {
        "http" | "https" => {}
        _ => return Err(AppError::invalid("仅支持下载 http/https 链接")),
    }

    let method = parse_http_method(request.method.as_deref())?;
    let headers = parse_headers(request.headers)?;
    let mut builder = client.request(method, parsed_url.clone()).headers(headers);
    if let Some(body) = request.body {
        builder = builder.body(body);
    }
    let response = builder.send().await.map_err(|error| {
        AppError::network(format!("HTTP 请求失败: {}", format_reqwest_error(&error)))
    })?;

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
    let bytes = response.bytes().await.map_err(|error| {
        AppError::network(format!(
            "读取 HTTP 响应失败: {}",
            format_reqwest_error(&error)
        ))
    })?;

    Ok(HttpFetchResult {
        base64_data: base64::engine::general_purpose::STANDARD.encode(bytes),
        file_name,
        mime_type,
        status: status.as_u16(),
        url: parsed_url.to_string(),
    })
}

async fn fetch_http_result(client: &reqwest::Client, url: String) -> AppResult<HttpFetchResult> {
    let result = request_http_result(client, HttpRequest::get(url)).await?;
    if result.status < 200 || result.status >= 300 {
        return Err(AppError::remote(format!(
            "下载失败（HTTP {}）",
            result.status
        )));
    }
    if result.base64_data.is_empty() {
        return Err(AppError::remote("下载失败：响应数据为空"));
    }
    Ok(result)
}

/// Sends an HTTP(S) request from the desktop process and returns response metadata.
#[tauri::command]
pub async fn request_http(
    state: tauri::State<'_, AppState>,
    request: HttpRequest,
) -> AppResult<HttpFetchResult> {
    request_http_result(&state.clients.transport, request).await
}

/// Fetches an HTTP(S) resource from the desktop process and returns response metadata.
#[tauri::command]
pub async fn fetch_http(
    state: tauri::State<'_, AppState>,
    url: String,
) -> AppResult<HttpFetchResult> {
    fetch_http_result(&state.clients.transport, url).await
}
