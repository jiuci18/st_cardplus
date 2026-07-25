//! WebDAV connectivity, upload, and download commands.

use crate::handler::support::{AppError, AppResult, AppState};
use log::{info, warn};
use reqwest::{Method, Url};

/// Resolves a remote path against a WebDAV base URL.
///
/// This intentionally preserves standard URL-join behavior for absolute paths.
pub fn build_webdav_url(base_url: &str, remote_path: &str) -> AppResult<Url> {
    let normalized_base = if base_url.ends_with('/') {
        base_url.to_string()
    } else {
        format!("{base_url}/")
    };
    let base = Url::parse(&normalized_base)
        .map_err(|error| AppError::invalid(format!("WebDAV URL 无效: {error}")))?;
    base.join(remote_path)
        .map_err(|error| AppError::invalid(format!("WebDAV 路径拼接失败: {error}")))
}

fn apply_basic_auth(
    request: reqwest::RequestBuilder,
    username: Option<&str>,
    password: Option<&str>,
) -> reqwest::RequestBuilder {
    let username = username.unwrap_or("").trim();
    let password = password.unwrap_or("").trim();

    if username.is_empty() && password.is_empty() {
        request
    } else {
        request.basic_auth(username, Some(password))
    }
}

/// Formats a bounded WebDAV error response for display.
pub fn error_with_status(prefix: &str, status: reqwest::StatusCode, body: String) -> String {
    let compact_body = body.trim().replace('\n', " ");
    if compact_body.is_empty() {
        format!("{prefix}: HTTP {status}")
    } else {
        let preview: String = compact_body.chars().take(220).collect();
        format!("{prefix}: HTTP {status} - {preview}")
    }
}

/// Performs a WebDAV test, upload, or download using the shared client.
#[tauri::command]
pub async fn webdav_request(
    state: tauri::State<'_, AppState>,
    url: String,
    action: String,
    username: Option<String>,
    password: Option<String>,
    remote_path: Option<String>,
    data: Option<String>,
) -> AppResult<String> {
    let action = WebDavAction::parse(&action)?;
    info!("webdav_request action={}", action.as_str());
    match action {
        WebDavAction::Test => {
            let target = build_webdav_url(&url, "")?;
            let method = Method::from_bytes(b"PROPFIND")
                .map_err(|error| AppError::invalid(format!("构造 PROPFIND 失败: {error}")))?;
            let request = state
                .clients
                .webdav
                .request(method, target)
                .header("Depth", "0");
            let response = apply_basic_auth(request, username.as_deref(), password.as_deref())
                .send()
                .await
                .map_err(|error| AppError::network(format!("WebDAV 连接失败: {error}")))?;

            if response.status().is_success() {
                Ok(String::new())
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                warn!("WebDAV 连接失败 status={}", status);
                Err(AppError::remote(error_with_status(
                    "WebDAV 连接失败",
                    status,
                    body,
                )))
            }
        }
        WebDavAction::Upload => {
            let path = remote_path.unwrap_or_default();
            if path.trim().is_empty() {
                return Err(AppError::invalid("remote_path 不能为空"));
            }

            let target = build_webdav_url(&url, &path)?;
            let payload = data.unwrap_or_default();
            let request = state
                .clients
                .webdav
                .put(target)
                .header("Content-Type", "application/json")
                .body(payload);
            let response = apply_basic_auth(request, username.as_deref(), password.as_deref())
                .send()
                .await
                .map_err(|error| AppError::network(format!("上传到 WebDAV 失败: {error}")))?;

            if response.status().is_success() {
                Ok(String::new())
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                warn!("上传到 WebDAV 失败 status={}", status);
                Err(AppError::remote(error_with_status(
                    "上传到 WebDAV 失败",
                    status,
                    body,
                )))
            }
        }
        WebDavAction::Download => {
            let path = remote_path.unwrap_or_default();
            if path.trim().is_empty() {
                return Err(AppError::invalid("remote_path 不能为空"));
            }

            let target = build_webdav_url(&url, &path)?;
            let request = state.clients.webdav.get(target);
            let response = apply_basic_auth(request, username.as_deref(), password.as_deref())
                .send()
                .await
                .map_err(|error| AppError::network(format!("从 WebDAV 下载失败: {error}")))?;

            if response.status().is_success() {
                response
                    .text()
                    .await
                    .map_err(|error| AppError::network(format!("读取 WebDAV 响应失败: {error}")))
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                warn!("从 WebDAV 下载失败 status={}", status);
                Err(AppError::remote(error_with_status(
                    "从 WebDAV 下载失败",
                    status,
                    body,
                )))
            }
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum WebDavAction {
    Test,
    Upload,
    Download,
}

impl WebDavAction {
    fn parse(raw: &str) -> AppResult<Self> {
        let action = raw.trim().to_ascii_lowercase();
        match action.as_str() {
            "test" => Ok(Self::Test),
            "upload" => Ok(Self::Upload),
            "download" => Ok(Self::Download),
            _ => Err(AppError::invalid(format!("不支持的 action: {action}"))),
        }
    }

    const fn as_str(self) -> &'static str {
        match self {
            Self::Test => "test",
            Self::Upload => "upload",
            Self::Download => "download",
        }
    }
}
