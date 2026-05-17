use log::{info, warn};
use reqwest::{Method, Url};
use std::time::Duration;

fn build_http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(120))
        .user_agent("ST-CardPlus/0.1.8")
        .build()
        .map_err(|error| format!("创建 WebDAV 客户端失败: {error}"))
}

fn build_webdav_url(base_url: &str, remote_path: &str) -> Result<Url, String> {
    let normalized_base = if base_url.ends_with('/') {
        base_url.to_string()
    } else {
        format!("{base_url}/")
    };
    let base = Url::parse(&normalized_base).map_err(|error| format!("WebDAV URL 无效: {error}"))?;
    base.join(remote_path)
        .map_err(|error| format!("WebDAV 路径拼接失败: {error}"))
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

fn error_with_status(prefix: &str, status: reqwest::StatusCode, body: String) -> String {
    let compact_body = body.trim().replace('\n', " ");
    if compact_body.is_empty() {
        format!("{prefix}: HTTP {status}")
    } else {
        let preview: String = compact_body.chars().take(220).collect();
        format!("{prefix}: HTTP {status} - {preview}")
    }
}

#[tauri::command]
pub async fn webdav_request(
    url: String,
    action: String,
    username: Option<String>,
    password: Option<String>,
    remote_path: Option<String>,
    data: Option<String>,
) -> Result<String, String> {
    let client = build_http_client()?;
    let action = action.trim().to_ascii_lowercase();
    info!("webdav_request action={}", action);
    match action.as_str() {
        "test" => {
            let target = build_webdav_url(&url, "")?;
            let method = Method::from_bytes(b"PROPFIND")
                .map_err(|error| format!("构造 PROPFIND 失败: {error}"))?;
            let request = client.request(method, target).header("Depth", "0");
            let response = apply_basic_auth(request, username.as_deref(), password.as_deref())
                .send()
                .await
                .map_err(|error| format!("WebDAV 连接失败: {error}"))?;

            if response.status().is_success() {
                Ok(String::new())
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                warn!("WebDAV 连接失败 status={}", status);
                Err(error_with_status("WebDAV 连接失败", status, body))
            }
        }
        "upload" => {
            let path = remote_path.unwrap_or_default();
            if path.trim().is_empty() {
                return Err("remote_path 不能为空".to_string());
            }

            let target = build_webdav_url(&url, &path)?;
            let payload = data.unwrap_or_default();
            let request = client
                .put(target)
                .header("Content-Type", "application/json")
                .body(payload);
            let response = apply_basic_auth(request, username.as_deref(), password.as_deref())
                .send()
                .await
                .map_err(|error| format!("上传到 WebDAV 失败: {error}"))?;

            if response.status().is_success() {
                Ok(String::new())
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                warn!("上传到 WebDAV 失败 status={}", status);
                Err(error_with_status("上传到 WebDAV 失败", status, body))
            }
        }
        "download" => {
            let path = remote_path.unwrap_or_default();
            if path.trim().is_empty() {
                return Err("remote_path 不能为空".to_string());
            }

            let target = build_webdav_url(&url, &path)?;
            let request = client.get(target);
            let response = apply_basic_auth(request, username.as_deref(), password.as_deref())
                .send()
                .await
                .map_err(|error| format!("从 WebDAV 下载失败: {error}"))?;

            if response.status().is_success() {
                response
                    .text()
                    .await
                    .map_err(|error| format!("读取 WebDAV 响应失败: {error}"))
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                warn!("从 WebDAV 下载失败 status={}", status);
                Err(error_with_status("从 WebDAV 下载失败", status, body))
            }
        }
        _ => Err(format!("不支持的 action: {action}")),
    }
}
