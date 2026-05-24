use crate::handler::image_service::{err, AppResult};
use std::time::Duration;

pub mod catbox;
pub mod imgbb;
pub mod local;

pub fn format_reqwest_error(error: &reqwest::Error) -> String {
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

pub fn build_http_client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
        .http1_only()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(45))
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ST-CardPlus/0.1.8")
        .build()
        .map_err(|error| err!("创建 HTTP 客户端失败: {error}"))
}
