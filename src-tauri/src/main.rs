#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use st_cardplus::handler;

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    let state = handler::AppState::new().expect("failed to initialize shared HTTP clients");

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            handler::image_service::upload_image_to_hosting,
            handler::http_service::fetch_http,
            handler::http_service::request_http,
            handler::export_service::save_binary_file,
            handler::system_service::open_external_url,
            handler::system_service::open_local_directory,
            handler::webdav_service::webdav_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
