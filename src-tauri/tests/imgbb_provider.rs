use st_cardplus::handler::image_service::provider::imgbb::{
    ImgBbResponseOutcome, parse_imgbb_response,
};

#[test]
fn prefers_primary_image_url() {
    let body = r#"{
        "success": true,
        "data": {
            "url": " https://images.example/primary.png ",
            "display_url": "https://images.example/display.png"
        }
    }"#;

    let outcome = parse_imgbb_response(body).expect("valid success response should parse");

    assert_eq!(
        outcome,
        ImgBbResponseOutcome::Uploaded("https://images.example/primary.png".to_string())
    );
}

#[test]
fn falls_back_to_display_url() {
    let body = r#"{
        "success": true,
        "data": {
            "url": " ",
            "display_url": "https://images.example/display.png"
        }
    }"#;

    let outcome = parse_imgbb_response(body).expect("display URL response should parse");

    assert_eq!(
        outcome,
        ImgBbResponseOutcome::Uploaded("https://images.example/display.png".to_string())
    );
}

#[test]
fn reports_remote_rejection() {
    let body = r#"{
        "success": false,
        "error": { "message": "invalid key" }
    }"#;

    let outcome = parse_imgbb_response(body).expect("remote rejection should parse");

    assert_eq!(
        outcome,
        ImgBbResponseOutcome::Rejected("invalid key".to_string())
    );
}

#[test]
fn reports_missing_success_url() {
    let body = r#"{ "success": true, "data": {} }"#;

    let outcome = parse_imgbb_response(body).expect("success without URL should parse");

    assert_eq!(outcome, ImgBbResponseOutcome::MissingUrl);
}

#[test]
fn rejects_invalid_json() {
    let error = parse_imgbb_response("{").expect_err("invalid JSON should be rejected");

    assert!(error.to_string().starts_with("解析 ImgBB 响应失败:"));
}
