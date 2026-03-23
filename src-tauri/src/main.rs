#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod handler;

fn main() {
  env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      handler::image_service::upload_image_to_hosting,
      handler::export_service::save_binary_file,
      handler::system_service::open_external_url,
      handler::webdav_service::webdav_request
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
