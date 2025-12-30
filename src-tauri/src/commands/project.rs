use tauri::State;

use crate::error::Result;
use crate::models::{Project, ProjectStats, ProjectSummary};
use crate::state::AppState;

#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    name: String,
    description: String,
) -> Result<Project> {
    let storage = state.storage.lock();
    storage.create_project(name, description)
}

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectSummary>> {
    let storage = state.storage.lock();
    storage.list_projects()
}

#[tauri::command]
pub async fn open_project(state: State<'_, AppState>, id: String) -> Result<Project> {
    let storage = state.storage.lock();
    storage.get_project(&id)
}

#[tauri::command]
pub async fn delete_project(state: State<'_, AppState>, id: String) -> Result<()> {
    // Close any open connection first
    state.duckdb.close_connection(&id);

    let storage = state.storage.lock();
    storage.delete_project(&id)
}

#[tauri::command]
pub async fn update_project(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    description: Option<String>,
) -> Result<Project> {
    let storage = state.storage.lock();
    storage.update_project(&id, name, description)
}

#[tauri::command]
pub async fn get_all_project_stats(state: State<'_, AppState>) -> Result<Vec<ProjectStats>> {
    let storage = state.storage.lock();
    let projects = storage.list_projects()?;
    drop(storage);

    let mut all_stats = Vec::new();

    for project_summary in projects {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_summary.id)?;
        let db_path = storage.get_database_path(&project);
        drop(storage);

        let conn = state.duckdb.get_connection(&project_summary.id, &db_path)?;
        let conn = conn.lock();

        // Get table count and total rows
        let tables = state.duckdb.get_tables(&conn)?;
        let table_count = tables.len() as u32;
        let total_rows: u64 = tables.iter().map(|t| t.row_count as u64).sum();

        // Get conversation count
        let conversation_count: u32 = conn
            .query_row(
                "SELECT COUNT(*) FROM _duckbake_conversations WHERE project_id = ?",
                [&project_summary.id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // Get saved query count
        let saved_query_count: u32 = conn
            .query_row(
                "SELECT COUNT(*) FROM _duckbake_saved_queries WHERE project_id = ?",
                [&project_summary.id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        all_stats.push(ProjectStats {
            project_id: project_summary.id,
            table_count,
            total_rows,
            conversation_count,
            saved_query_count,
        });
    }

    Ok(all_stats)
}
