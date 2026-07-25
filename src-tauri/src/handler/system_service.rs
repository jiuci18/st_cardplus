//! Operating-system integration commands.

use crate::handler::support::{AppError, AppResult};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};

fn normalize_http_url(raw: &str) -> AppResult<String> {
    let url = raw.trim();
    if url.is_empty() {
        return Err(AppError::invalid("链接不能为空"));
    }
    if url.chars().any(char::is_control) {
        return Err(AppError::invalid("链接包含非法控制字符"));
    }

    let lower = url.to_ascii_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") {
        return Err(AppError::invalid("仅支持打开 http 或 https 链接"));
    }

    Ok(url.to_string())
}

fn spawn_open_command(program: &str, args: &[&str], error_prefix: &str) -> AppResult<()> {
    Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|error| AppError::io(format!("{error_prefix}: {error}")))
}

/// Opens an HTTP(S) URL in the platform's default browser.
#[tauri::command]
pub fn open_external_url(url: String) -> AppResult<()> {
    let url = normalize_http_url(&url)?;

    #[cfg(target_os = "windows")]
    {
        return spawn_open_command(
            "rundll32",
            &["url.dll,FileProtocolHandler", url.as_str()],
            "启动外部浏览器失败",
        );
    }

    #[cfg(target_os = "macos")]
    {
        return spawn_open_command("open", &[url.as_str()], "启动外部浏览器失败");
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return spawn_open_command("xdg-open", &[url.as_str()], "启动外部浏览器失败");
    }

    #[allow(unreachable_code)]
    Err(AppError::io("当前平台暂不支持打开外部链接"))
}

/// Creates and opens the application's local data directory.
#[tauri::command]
pub fn open_local_directory(app: AppHandle) -> AppResult<()> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::io(format!("获取本地数据目录失败: {error}")))?;

    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|error| AppError::io(format!("创建本地数据目录失败: {error}")))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&app_data_dir)
            .spawn()
            .map(|_| ())
            .map_err(|error| AppError::io(format!("打开本地目录失败: {error}")))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&app_data_dir)
            .spawn()
            .map(|_| ())
            .map_err(|error| AppError::io(format!("打开本地目录失败: {error}")))?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(&app_data_dir)
            .spawn()
            .map(|_| ())
            .map_err(|error| AppError::io(format!("打开本地目录失败: {error}")))?;
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err(AppError::io("当前平台暂不支持打开本地目录"))
}
