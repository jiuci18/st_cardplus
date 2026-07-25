use st_cardplus::handler::export_service::sanitize_download_file_name;

#[test]
fn replaces_reserved_filename_characters() {
    let raw = " a/b:c?.json ";

    let sanitized = sanitize_download_file_name(raw);

    assert_eq!(sanitized, "a_b_c_.json");
}

#[test]
fn falls_back_for_blank_filename() {
    let raw = "  ";

    let sanitized = sanitize_download_file_name(raw);

    assert_eq!(sanitized, "download.bin");
}
