use reqwest::StatusCode;
use st_cardplus::handler::webdav_service::{build_webdav_url, error_with_status};

#[test]
fn joins_relative_path_below_base() {
    let url = build_webdav_url("https://example.test/dav", "backups/card.json")
        .expect("relative WebDAV path should join");

    assert_eq!(url.as_str(), "https://example.test/dav/backups/card.json");
}

#[test]
fn preserves_absolute_url_join_behavior() {
    let url = build_webdav_url("https://example.test/dav/", "/card.json")
        .expect("absolute WebDAV path should join");

    assert_eq!(url.as_str(), "https://example.test/card.json");
}

#[test]
fn reports_status_without_empty_body() {
    let message = error_with_status("上传失败", StatusCode::BAD_GATEWAY, " \n ".to_string());

    assert_eq!(message, "上传失败: HTTP 502 Bad Gateway");
}

#[test]
fn compacts_and_bounds_error_body() {
    let body = format!("{}\nignored", "x".repeat(240));

    let message = error_with_status("下载失败", StatusCode::BAD_REQUEST, body);

    assert_eq!(
        message,
        format!("下载失败: HTTP 400 Bad Request - {}", "x".repeat(220))
    );
}
