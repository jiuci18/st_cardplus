//! Shared errors, HTTP clients, and small normalization helpers.

use reqwest::Client;
use serde::Serialize;
use std::time::Duration;
use thiserror::Error;

/// Result type used by desktop command implementations.
pub type AppResult<T> = Result<T, AppError>;

/// Error categories produced by desktop command implementations.
#[derive(Debug, Error)]
pub enum AppError {
    /// The caller supplied an invalid value.
    #[error("{0}")]
    InvalidInput(String),
    /// A network operation failed.
    #[error("{0}")]
    Network(String),
    /// A local file or operating-system operation failed.
    #[error("{0}")]
    Io(String),
    /// The user cancelled an interactive operation.
    #[error("{0}")]
    Cancelled(String),
    /// A remote service returned an unsuccessful response.
    #[error("{0}")]
    Remote(String),
    /// A required application resource could not be initialized.
    #[error("{0}")]
    Initialization(String),
}

impl AppError {
    pub(crate) fn invalid(message: impl Into<String>) -> Self {
        Self::InvalidInput(message.into())
    }

    pub(crate) fn network(message: impl Into<String>) -> Self {
        Self::Network(message.into())
    }

    pub(crate) fn io(message: impl Into<String>) -> Self {
        Self::Io(message.into())
    }

    pub(crate) fn cancelled(message: impl Into<String>) -> Self {
        Self::Cancelled(message.into())
    }

    pub(crate) fn remote(message: impl Into<String>) -> Self {
        Self::Remote(message.into())
    }

    fn initialization(message: impl Into<String>) -> Self {
        Self::Initialization(message.into())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Immutable application resources shared by Tauri commands.
pub struct AppState {
    pub(crate) clients: HttpClients,
}

impl AppState {
    /// Builds all long-lived HTTP clients before the application starts.
    pub fn new() -> AppResult<Self> {
        Ok(Self {
            clients: HttpClients::new()?,
        })
    }
}

/// Long-lived clients with profiles matching each backend service.
pub(crate) struct HttpClients {
    pub(crate) transport: Client,
    pub(crate) image_hosting: Client,
    pub(crate) webdav: Client,
}

impl HttpClients {
    fn new() -> AppResult<Self> {
        Ok(Self {
            transport: build_client(ClientProfile::Transport)?,
            image_hosting: build_client(ClientProfile::ImageHosting)?,
            webdav: build_client(ClientProfile::WebDav)?,
        })
    }
}

#[derive(Clone, Copy)]
enum ClientProfile {
    Transport,
    ImageHosting,
    WebDav,
}

fn build_client(profile: ClientProfile) -> AppResult<Client> {
    let timeout = match profile {
        ClientProfile::Transport | ClientProfile::ImageHosting => Duration::from_secs(45),
        ClientProfile::WebDav => Duration::from_secs(120),
    };
    let mut builder = Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(timeout)
        .user_agent(format!("ST-CardPlus/{}", env!("CARGO_PKG_VERSION")));

    match profile {
        ClientProfile::Transport => {
            builder = builder.http1_only().cookie_store(true);
        }
        ClientProfile::ImageHosting => {
            builder = builder.http1_only();
        }
        ClientProfile::WebDav => {}
    }

    builder
        .build()
        .map_err(|error| AppError::initialization(format!("创建 HTTP 客户端失败: {error}")))
}

/// Formats reqwest diagnostics used by transport and hosting errors.
pub(crate) fn format_reqwest_error(error: &reqwest::Error) -> String {
    let mut details = Vec::new();

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

/// Replaces path separators and platform-reserved filename punctuation.
pub(crate) fn sanitize_file_name(raw: &str, fallback: &str) -> String {
    let name = raw
        .trim()
        .replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_");
    if name.is_empty() {
        fallback.to_string()
    } else {
        name
    }
}
