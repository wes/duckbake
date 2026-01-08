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

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::new().build());

    #[cfg(feature = "updater")]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .setup(|app| {
            let mut app_submenu_builder = SubmenuBuilder::new(app, "DuckBake")
                .about(None);

            #[cfg(feature = "updater")]
            {
                app_submenu_builder = app_submenu_builder.item(
                    &MenuItemBuilder::with_id("check_for_updates", "Check for Updates...")
                        .build(app)?,
                );
            }

            let app_submenu = app_submenu_builder
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
                #[cfg(feature = "updater")]
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
            export_project,
            import_project,
            // Database commands
            get_tables,
            get_table_schema,
            execute_query,
            query_table,
            delete_table,
            get_project_context,
            // Import commands
            preview_import,
            import_file,
            get_supported_extensions,
            // Ollama commands
            check_ollama_status,
            list_ollama_models,
            send_chat_message,
            pull_ollama_model,
            delete_ollama_model,
            // Vectorization commands
            get_vectorization_status,
            get_text_columns,
            vectorize_table,
            remove_vectorization,
            cancel_vectorization,
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
            // Document commands
            upload_document,
            get_documents,
            get_document,
            delete_document,
            vectorize_document,
            get_supported_document_extensions,
            semantic_search_documents,
            get_document_chunks_by_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
