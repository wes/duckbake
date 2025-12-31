mod commands;
mod error;
mod models;
mod services;
mod state;

use commands::*;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new().expect("Failed to initialize app state");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Project commands
            create_project,
            list_projects,
            open_project,
            delete_project,
            update_project,
            get_all_project_stats,
            // Database commands
            get_tables,
            get_table_schema,
            execute_query,
            query_table,
            get_project_context,
            // Import commands
            preview_import,
            import_file,
            get_supported_extensions,
            // Ollama commands
            check_ollama_status,
            list_ollama_models,
            send_chat_message,
            // Vectorization commands
            get_vectorization_status,
            get_text_columns,
            vectorize_table,
            remove_vectorization,
            semantic_search,
            // Conversation commands
            list_conversations,
            create_conversation,
            get_conversation,
            update_conversation,
            delete_conversation,
            add_message,
            // Saved query commands
            list_saved_queries,
            save_query,
            update_saved_query,
            delete_saved_query,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
