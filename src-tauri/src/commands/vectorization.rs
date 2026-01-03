use tauri::{Emitter, State, Window};

use crate::error::Result;
use crate::models::{VectorizationProgress, VectorizationStatus};
use crate::state::AppState;

const BATCH_SIZE: usize = 50;
const DEFAULT_EMBEDDING_MODEL: &str = "nomic-embed-text";

#[tauri::command]
pub async fn get_vectorization_status(
    state: State<'_, AppState>,
    project_id: String,
    table_name: String,
) -> Result<VectorizationStatus> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.get_vectorization_status(&conn, &table_name)
}

#[tauri::command]
pub async fn get_text_columns(
    state: State<'_, AppState>,
    project_id: String,
    table_name: String,
) -> Result<Vec<String>> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.get_text_columns(&conn, &table_name)
}

#[tauri::command]
pub async fn vectorize_table(
    window: Window,
    state: State<'_, AppState>,
    project_id: String,
    table_name: String,
    columns: Vec<String>,
) -> Result<()> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    // Get total row count
    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let total_rows: i64 = {
        let conn = conn.lock();
        conn.query_row(
            &format!("SELECT COUNT(*) FROM \"{}\"", table_name),
            [],
            |row| row.get(0),
        )
        .unwrap_or(0)
    };

    // Emit initial progress - loading model
    let _ = window.emit(
        "vectorization-progress",
        VectorizationProgress {
            table_name: table_name.clone(),
            total_rows,
            processed_rows: 0,
            status: "loading_model".to_string(),
            error: None,
        },
    );

    // Warm up the embedding model first (loads it into memory)
    if let Err(e) = state.ollama.warmup_embedding_model(Some(DEFAULT_EMBEDDING_MODEL)).await {
        let _ = window.emit(
            "vectorization-progress",
            VectorizationProgress {
                table_name: table_name.clone(),
                total_rows,
                processed_rows: 0,
                status: "error".to_string(),
                error: Some(e.to_string()),
            },
        );
        return Err(e);
    }

    // Emit progress - now processing
    let _ = window.emit(
        "vectorization-progress",
        VectorizationProgress {
            table_name: table_name.clone(),
            total_rows,
            processed_rows: 0,
            status: "processing".to_string(),
            error: None,
        },
    );

    // Initialize embeddings table and remove existing embeddings
    {
        let conn = conn.lock();
        state.duckdb.init_embeddings_table(&conn)?;
        state.duckdb.remove_vectorization(&conn, &table_name)?;
    }

    // Clear any previous cancellation flag for this table
    state.clear_vectorization_cancellation(&table_name);

    let mut processed = 0i64;
    let mut offset = 0usize;

    loop {
        // Check if cancellation was requested
        if state.should_cancel_vectorization(&table_name) {
            state.clear_vectorization_cancellation(&table_name);
            let _ = window.emit(
                "vectorization-progress",
                VectorizationProgress {
                    table_name: table_name.clone(),
                    total_rows,
                    processed_rows: processed,
                    status: "cancelled".to_string(),
                    error: None,
                },
            );
            return Ok(());
        }

        // Get batch of text to vectorize
        let rows: Vec<(i64, String)> = {
            let conn = conn.lock();
            state.duckdb.get_text_for_vectorization(
                &conn,
                &table_name,
                &columns,
                BATCH_SIZE,
                offset,
            )?
        };

        if rows.is_empty() {
            break;
        }

        let batch_count = rows.len();

        // Extract texts for embedding
        let texts: Vec<String> = rows.iter().map(|(_, text)| text.clone()).collect();
        let row_ids: Vec<i64> = rows.iter().map(|(id, _)| *id).collect();

        // Generate embeddings
        let embeddings = state
            .ollama
            .generate_embeddings(texts.clone(), Some(DEFAULT_EMBEDDING_MODEL))
            .await?;

        // Store embeddings
        let embedding_rows: Vec<(i64, String, Vec<f32>)> = row_ids
            .into_iter()
            .zip(texts.into_iter())
            .zip(embeddings.into_iter())
            .map(|((id, text), emb)| (id, text, emb))
            .collect();

        {
            let conn = conn.lock();
            let column_key = columns.join("+");
            state.duckdb.store_embeddings(
                &conn,
                &table_name,
                &column_key,
                embedding_rows,
                DEFAULT_EMBEDDING_MODEL,
            )?;
        }

        processed += batch_count as i64;
        offset += batch_count;

        // Emit progress
        let _ = window.emit(
            "vectorization-progress",
            VectorizationProgress {
                table_name: table_name.clone(),
                total_rows,
                processed_rows: processed,
                status: "processing".to_string(),
                error: None,
            },
        );
    }

    // Emit completion
    let _ = window.emit(
        "vectorization-progress",
        VectorizationProgress {
            table_name: table_name.clone(),
            total_rows,
            processed_rows: processed,
            status: "completed".to_string(),
            error: None,
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn remove_vectorization(
    state: State<'_, AppState>,
    project_id: String,
    table_name: String,
) -> Result<()> {
    let storage = state.storage.lock();
    let project = storage.get_project(&project_id)?;
    let db_path = storage.get_database_path(&project);
    drop(storage);

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.remove_vectorization(&conn, &table_name)
}

#[tauri::command]
pub async fn cancel_vectorization(
    state: State<'_, AppState>,
    table_name: String,
) -> Result<()> {
    state.cancel_vectorization(&table_name);
    Ok(())
}

#[tauri::command]
pub async fn semantic_search(
    state: State<'_, AppState>,
    project_id: String,
    table_name: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<serde_json::Value>> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    // Generate embedding for query
    let embeddings = state
        .ollama
        .generate_embeddings(vec![query], Some(DEFAULT_EMBEDDING_MODEL))
        .await?;

    let query_embedding = embeddings.into_iter().next().unwrap_or_default();

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    let results = state.duckdb.semantic_search(
        &conn,
        &table_name,
        &query_embedding,
        limit.unwrap_or(10),
    )?;

    // Convert to JSON
    let json_results: Vec<serde_json::Value> = results
        .into_iter()
        .map(|(row_id, content, similarity)| {
            serde_json::json!({
                "rowId": row_id,
                "content": content,
                "similarity": similarity
            })
        })
        .collect();

    Ok(json_results)
}
