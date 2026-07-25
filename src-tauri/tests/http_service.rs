use std::collections::HashMap;

use reqwest::{Method, Url};
use st_cardplus::handler::http_service::{
    file_name_from_url, infer_mime_from_name, parse_headers, parse_http_method,
};

#[test]
fn defaults_to_get_method() {
    let method = parse_http_method(None).expect("missing method should default to GET");

    assert_eq!(method, Method::GET);
}

#[test]
fn normalizes_supported_method() {
    let method =
        parse_http_method(Some(" patch ")).expect("PATCH should be accepted case-insensitively");

    assert_eq!(method, Method::PATCH);
}

#[test]
fn rejects_unsupported_method() {
    let error = parse_http_method(Some("TRACE")).expect_err("TRACE should be rejected");

    assert_eq!(error.to_string(), "不支持的 HTTP 方法: TRACE");
}

#[test]
fn sanitizes_filename_from_url() {
    let url = Url::parse("https://example.test/files/a:b.json")
        .expect("test URL should be syntactically valid");

    let file_name = file_name_from_url(&url);

    assert_eq!(file_name, "a_b.json");
}

#[test]
fn falls_back_for_url_without_filename() {
    let url = Url::parse("https://example.test/").expect("test URL should be syntactically valid");

    let file_name = file_name_from_url(&url);

    assert_eq!(file_name, "download");
}

#[test]
fn infers_known_mime_case_insensitively() {
    let mime = infer_mime_from_name("AVATAR.JPEG");

    assert_eq!(mime, "image/jpeg");
}

#[test]
fn falls_back_for_unknown_mime() {
    let mime = infer_mime_from_name("archive.bin");

    assert_eq!(mime, "application/octet-stream");
}

#[test]
fn accepts_valid_headers() {
    let headers = HashMap::from([("x-cardplus".to_string(), "enabled".to_string())]);

    let parsed = parse_headers(Some(headers)).expect("valid header should parse");

    assert_eq!(parsed["x-cardplus"], "enabled");
}

#[test]
fn rejects_invalid_header_name() {
    let headers = HashMap::from([("bad header".to_string(), "value".to_string())]);

    let error = parse_headers(Some(headers)).expect_err("invalid header name should be rejected");

    assert!(error.to_string().contains("HTTP 请求头名称无效 bad header"));
}
