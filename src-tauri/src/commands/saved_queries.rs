use tauri::State;
use uuid::Uuid;

use crate::error::Result;
use crate::models::SavedQuery;
use crate::state::AppState;

#[tauri::command]
pub async fn list_saved_queries(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<SavedQuery>> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    // Ensure table exists
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS _duckbake_saved_queries (
            id VARCHAR PRIMARY KEY,
            project_id VARCHAR NOT NULL,
            name VARCHAR NOT NULL,
            sql TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )?;

    let mut stmt = conn.prepare(
        r#"
        SELECT id, project_id, name, sql,
               CAST(created_at AS VARCHAR) as created_at,
               CAST(updated_at AS VARCHAR) as updated_at
        FROM _duckbake_saved_queries
        WHERE project_id = ?
        ORDER BY updated_at DESC
        "#,
    )?;

    let queries: Vec<SavedQuery> = stmt
        .query_map([&project_id], |row| {
            Ok(SavedQuery {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                sql: row.get(3)?,
                created_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                updated_at: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(queries)
}

#[tauri::command]
pub async fn save_query(
    state: State<'_, AppState>,
    project_id: String,
    name: String,
    sql: String,
) -> Result<SavedQuery> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    // Ensure table exists
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS _duckbake_saved_queries (
            id VARCHAR PRIMARY KEY,
            project_id VARCHAR NOT NULL,
            name VARCHAR NOT NULL,
            sql TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        r#"
        INSERT INTO _duckbake_saved_queries (id, project_id, name, sql, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
        duckdb::params![&id, &project_id, &name, &sql, &now, &now],
    )?;

    Ok(SavedQuery {
        id,
        project_id,
        name,
        sql,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_saved_query(
    state: State<'_, AppState>,
    project_id: String,
    query_id: String,
    name: Option<String>,
    sql: Option<String>,
) -> Result<SavedQuery> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    let now = chrono::Utc::now().to_rfc3339();

    if let Some(name) = &name {
        conn.execute(
            "UPDATE _duckbake_saved_queries SET name = ?, updated_at = ? WHERE id = ?",
            duckdb::params![name, &now, &query_id],
        )?;
    }

    if let Some(sql) = &sql {
        conn.execute(
            "UPDATE _duckbake_saved_queries SET sql = ?, updated_at = ? WHERE id = ?",
            duckdb::params![sql, &now, &query_id],
        )?;
    }

    let query: SavedQuery = conn.query_row(
        r#"
        SELECT id, project_id, name, sql,
               CAST(created_at AS VARCHAR) as created_at,
               CAST(updated_at AS VARCHAR) as updated_at
        FROM _duckbake_saved_queries
        WHERE id = ?
        "#,
        [&query_id],
        |row| {
            Ok(SavedQuery {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                sql: row.get(3)?,
                created_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                updated_at: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
            })
        },
    )?;

    Ok(query)
}

#[tauri::command]
pub async fn delete_saved_query(
    state: State<'_, AppState>,
    project_id: String,
    query_id: String,
) -> Result<()> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    conn.execute(
        "DELETE FROM _duckbake_saved_queries WHERE id = ?",
        [&query_id],
    )?;

    Ok(())
}
