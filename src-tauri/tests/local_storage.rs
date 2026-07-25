use st_cardplus::handler::image_service::provider::local::{
    build_local_image_path, digest_to_hex, infer_extension_from_name, infer_file_extension,
};
use std::path::Path;

#[test]
fn prefers_mime_extension_over_filename() {
    let extension = infer_file_extension("avatar.gif", "image/webp");

    assert_eq!(extension, "webp");
}

#[test]
fn normalizes_filename_extension() {
    let extension =
        infer_extension_from_name("avatar.J-P_E!G").expect("alphanumeric extension should remain");

    assert_eq!(extension, "jpeg");
}

#[test]
fn bounds_filename_extension_length() {
    let extension =
        infer_extension_from_name("avatar.abcdefghijklmnop").expect("extension should be present");

    assert_eq!(extension, "abcdefghij");
}

#[test]
fn hashes_content_as_lowercase_sha256() {
    let digest = digest_to_hex(b"abc");

    assert_eq!(
        digest,
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

#[test]
fn builds_deterministic_content_path() {
    let base = Path::new("/tmp/cardplus-test");

    let first = build_local_image_path(base, b"same", "avatar.png", "image/png");
    let second = build_local_image_path(base, b"same", "renamed.jpg", "image/png");

    assert_eq!(first, second);
    assert_eq!(first.parent(), Some(base.join("images").as_path()));
}
