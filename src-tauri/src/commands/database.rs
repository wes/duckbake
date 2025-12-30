use tauri::State;

use crate::error::Result;
use crate::models::{ProjectContext, QueryResult, TableContext, TableInfo, TableSchema};
use crate::state::AppState;

#[tauri::command]
pub async fn get_tables(state: State<'_, AppState>, project_id: String) -> Result<Vec<TableInfo>> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.get_tables(&conn)
}

#[tauri::command]
pub async fn get_table_schema(
    state: State<'_, AppState>,
    project_id: String,
    table_name: String,
) -> Result<TableSchema> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.get_table_schema(&conn, &table_name)
}

#[tauri::command]
pub async fn execute_query(
    state: State<'_, AppState>,
    project_id: String,
    sql: String,
) -> Result<QueryResult> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.execute_query(&conn, &sql)
}

#[tauri::command]
pub async fn query_table(
    state: State<'_, AppState>,
    project_id: String,
    table_name: String,
    page: u32,
    page_size: u32,
) -> Result<QueryResult> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.query_table(&conn, &table_name, page, page_size)
}

#[tauri::command]
pub async fn get_project_context(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<ProjectContext> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    // Get all tables
    let tables = state.duckdb.get_tables(&conn)?;

    // Build context for each table
    let mut table_contexts = Vec::new();
    for table in tables {
        let schema = state.duckdb.get_table_schema(&conn, &table.name)?;

        // Get sample rows (first 3)
        let sample_query = format!(
            "SELECT * FROM \"{}\" LIMIT 3",
            table.name.replace("\"", "\"\"")
        );
        let sample = state.duckdb.execute_query(&conn, &sample_query).ok();

        table_contexts.push(TableContext {
            name: table.name,
            row_count: table.row_count,
            columns: schema.columns,
            sample_rows: sample.map(|s| s.rows),
        });
    }

    Ok(ProjectContext {
        tables: table_contexts,
    })
}
