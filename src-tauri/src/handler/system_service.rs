use std::process::{Command, Stdio};

fn normalize_http_url(raw: &str) -> Result<String, String> {
  let url = raw.trim();
  if url.is_empty() {
    return Err("链接不能为空".to_string());
  }
  if url.chars().any(char::is_control) {
    return Err("链接包含非法控制字符".to_string());
  }

  let lower = url.to_ascii_lowercase();
  if !lower.starts_with("http://") && !lower.starts_with("https://") {
    return Err("仅支持打开 http 或 https 链接".to_string());
  }

  Ok(url.to_string())
}

fn spawn_open_command(program: &str, args: &[&str]) -> Result<(), String> {
  Command::new(program)
    .args(args)
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("启动外部浏览器失败: {error}"))
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
  let url = normalize_http_url(&url)?;

  #[cfg(target_os = "windows")]
  {
    return spawn_open_command("rundll32", &["url.dll,FileProtocolHandler", url.as_str()]);
  }

  #[cfg(target_os = "macos")]
  {
    return spawn_open_command("open", &[url.as_str()]);
  }

  #[cfg(all(unix, not(target_os = "macos")))]
  {
    return spawn_open_command("xdg-open", &[url.as_str()]);
  }

  #[allow(unreachable_code)]
  Err("当前平台暂不支持打开外部链接".to_string())
}
