use tauri::State;

use crate::error::Result;
use crate::services::{FileParser, ImportMode, ImportPreview, ImportResult};
use crate::state::AppState;

#[tauri::command]
pub async fn preview_import(
    state: State<'_, AppState>,
    project_id: String,
    file_path: String,
) -> Result<ImportPreview> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    FileParser::preview_file(&conn, &file_path)
}

#[tauri::command]
pub async fn import_file(
    state: State<'_, AppState>,
    project_id: String,
    file_path: String,
    table_name: String,
    mode: ImportMode,
) -> Result<ImportResult> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    FileParser::import_file(&conn, &file_path, &table_name, mode)
}

#[tauri::command]
pub async fn get_supported_extensions() -> Vec<String> {
    vec![
        "csv".into(),
        "tsv".into(),
        "json".into(),
        "jsonl".into(),
        "ndjson".into(),
        "parquet".into(),
        "pq".into(),
        "xlsx".into(),
        "xls".into(),
    ]
}
