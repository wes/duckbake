use std::fs;
use std::path::{Path, PathBuf};

use tauri::State;

use crate::error::{AppError, Result};
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

        // Ensure metadata tables exist before querying them
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS _duckbake_conversations (
                id VARCHAR PRIMARY KEY,
                project_id VARCHAR NOT NULL,
                title VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS _duckbake_saved_queries (
                id VARCHAR PRIMARY KEY,
                project_id VARCHAR NOT NULL,
                name VARCHAR NOT NULL,
                sql TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS _duckbake_documents (
                id VARCHAR PRIMARY KEY,
                project_id VARCHAR NOT NULL,
                filename VARCHAR NOT NULL,
                file_type VARCHAR NOT NULL,
                file_size BIGINT NOT NULL,
                page_count INTEGER,
                word_count INTEGER NOT NULL,
                title VARCHAR,
                author VARCHAR,
                creation_date VARCHAR,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )?;

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

        // Get document count
        let document_count: u32 = conn
            .query_row(
                "SELECT COUNT(*) FROM _duckbake_documents WHERE project_id = ?",
                [&project_summary.id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // Get storage size (DuckDB file size)
        let storage_size: u64 = fs::metadata(&db_path)
            .map(|m| m.len())
            .unwrap_or(0);

        all_stats.push(ProjectStats {
            project_id: project_summary.id,
            table_count,
            total_rows,
            conversation_count,
            saved_query_count,
            document_count,
            storage_size,
        });
    }

    Ok(all_stats)
}

#[tauri::command]
pub async fn export_project(
    state: State<'_, AppState>,
    project_id: String,
    destination_path: String,
) -> Result<()> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    // Get connection and checkpoint to flush any WAL data to the main file
    {
        let conn = state.duckdb.get_connection(&project_id, &db_path)?;
        let conn = conn.lock();
        conn.execute_batch("CHECKPOINT;").map_err(|e| {
            AppError::Custom(format!("Failed to checkpoint database: {}", e))
        })?;
    } // Connection Arc is dropped here

    // Close connection from cache to release file lock
    state.duckdb.close_connection(&project_id);

    // Copy the database file to the destination
    fs::copy(&db_path, &destination_path).map_err(|e| {
        AppError::Custom(format!("Failed to export project: {}", e))
    })?;

    Ok(())
}

#[tauri::command]
pub async fn import_project(
    state: State<'_, AppState>,
    source_path: String,
    project_name: String,
) -> Result<Project> {
    let source = Path::new(&source_path);

    // Verify the source file exists
    if !source.exists() {
        return Err(AppError::Custom("Source file does not exist".into()));
    }

    // Create a new project entry
    let storage = state.storage.lock();
    let project = storage.create_project(project_name, String::new())?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    // Remove the empty database created by create_project before copying
    // This ensures we get a clean copy without any leftover state
    let _ = fs::remove_file(&db_path);

    // Clean up any WAL files that might have been created by create_project
    // DuckDB creates .wal files that could interfere with the imported database
    let wal_path = PathBuf::from(format!("{}.wal", db_path.display()));
    let _ = fs::remove_file(&wal_path); // Ignore errors if file doesn't exist

    // Copy the source database to the new project location
    fs::copy(&source, &db_path).map_err(|e| {
        // Clean up the project entry if copy fails
        let storage = state.storage.lock();
        let _ = storage.delete_project(&project.id);
        AppError::Custom(format!("Failed to import project: {}", e))
    })?;

    // Update all project_id references in the imported database to match the new project ID
    // The exported database has the old project's ID, we need to update it
    let conn = state.duckdb.get_connection(&project.id, &db_path)?;
    {
        let conn = conn.lock();

        // Check if document tables exist
        let has_documents: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_name = '_duckbake_documents'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        let has_chunks: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_name = '_duckbake_document_chunks'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if has_documents {
            // We need to recreate BOTH tables to fully remove foreign key state from DuckDB
            // Just dropping the chunks table leaves orphaned FK references in the documents table

            // Step 1: Backup documents
            if let Err(e) = conn.execute_batch("CREATE TEMP TABLE _temp_docs AS SELECT * FROM _duckbake_documents;") {
                eprintln!("[import] Failed to backup documents: {}", e);
            }

            // Step 2: Backup chunks if they exist
            if has_chunks {
                if let Err(e) = conn.execute_batch("CREATE TEMP TABLE _temp_chunks AS SELECT * FROM _duckbake_document_chunks;") {
                    eprintln!("[import] Failed to backup chunks: {}", e);
                }
            }

            // Step 3: Drop both tables to remove all FK state
            let _ = conn.execute_batch("DROP TABLE IF EXISTS _duckbake_document_chunks;");
            let _ = conn.execute_batch("DROP TABLE IF EXISTS _duckbake_documents;");

            // Step 4: Recreate documents table (no FK pointing to it now)
            let create_docs = r#"
                CREATE TABLE _duckbake_documents (
                    id VARCHAR PRIMARY KEY,
                    project_id VARCHAR NOT NULL,
                    filename VARCHAR NOT NULL,
                    file_type VARCHAR NOT NULL,
                    file_size BIGINT NOT NULL,
                    page_count INTEGER,
                    word_count INTEGER NOT NULL,
                    title VARCHAR,
                    author VARCHAR,
                    creation_date VARCHAR,
                    headings TEXT,
                    content TEXT NOT NULL,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_vectorized BOOLEAN DEFAULT FALSE
                );
            "#;
            if let Err(e) = conn.execute_batch(create_docs) {
                eprintln!("[import] Failed to recreate documents table: {}", e);
            }

            // Step 5: Restore documents with new project_id
            let restore_docs = format!(
                r#"
                INSERT INTO _duckbake_documents
                SELECT id, '{}', filename, file_type, file_size, page_count, word_count,
                       title, author, creation_date, headings, content, uploaded_at, is_vectorized
                FROM _temp_docs;
                "#,
                project.id
            );
            if let Err(e) = conn.execute_batch(&restore_docs) {
                eprintln!("[import] Failed to restore documents: {}", e);
            }

            // Step 6: Recreate chunks table without foreign key constraint
            let create_chunks = r#"
                CREATE TABLE _duckbake_document_chunks (
                    id VARCHAR PRIMARY KEY,
                    document_id VARCHAR NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    chunk_type VARCHAR NOT NULL,
                    content TEXT NOT NULL,
                    start_offset INTEGER NOT NULL,
                    end_offset INTEGER NOT NULL,
                    embedding FLOAT[],
                    embedding_model VARCHAR
                );
            "#;
            if let Err(e) = conn.execute_batch(create_chunks) {
                eprintln!("[import] Failed to recreate chunks table: {}", e);
            }

            // Step 7: Restore chunks if they existed
            if has_chunks {
                if let Err(e) = conn.execute_batch("INSERT INTO _duckbake_document_chunks SELECT * FROM _temp_chunks;") {
                    eprintln!("[import] Failed to restore chunks: {}", e);
                }
            }

            // Step 8: Clean up temp tables
            let _ = conn.execute_batch("DROP TABLE IF EXISTS _temp_docs;");
            let _ = conn.execute_batch("DROP TABLE IF EXISTS _temp_chunks;");

            // Step 9: Create indexes
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_documents_project ON _duckbake_documents(project_id);");
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON _duckbake_document_chunks(document_id);");
        }

        // Update conversations table
        conn.execute(
            "UPDATE _duckbake_conversations SET project_id = ?",
            [&project.id],
        ).ok();

        // Update saved queries table
        conn.execute(
            "UPDATE _duckbake_saved_queries SET project_id = ?",
            [&project.id],
        ).ok();
    }

    Ok(project)
}
