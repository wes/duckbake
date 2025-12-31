mod commands;
mod error;
mod models;
mod services;
mod state;

use commands::*;
use state::AppState;
use tauri::menu::{Menu, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new().expect("Failed to initialize app state");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_submenu = SubmenuBuilder::new(app, "DuckBake")
                .about(None)
                .item(
                    &MenuItemBuilder::with_id("check_for_updates", "Check for Updates...")
                        .build(app)?,
                )
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            let project_submenu = SubmenuBuilder::new(app, "Project")
                .item(
                    &MenuItemBuilder::with_id("new_project", "New Project")
                        .accelerator("CmdOrCtrl+N")
                        .build(app)?,
                )
                .item(
                    &MenuItemBuilder::with_id("open_project", "Open Project...")
                        .accelerator("CmdOrCtrl+O")
                        .build(app)?,
                )
                .build()?;

            let edit_submenu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let window_submenu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .separator()
                .close_window()
                .build()?;

            let menu = Menu::with_items(
                app,
                &[
                    &app_submenu,
                    &project_submenu,
                    &edit_submenu,
                    &window_submenu,
                ],
            )?;

            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "new_project" => {
                    let _ = app.emit("menu-new-project", ());
                }
                "open_project" => {
                    let _ = app.emit("menu-open-project", ());
                }
                "check_for_updates" => {
                    let _ = app.emit("menu-check-for-updates", ());
                }
                _ => {}
            }
        })
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
