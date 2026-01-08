use tauri::{Emitter, State, Window};
use uuid::Uuid;

use crate::error::Result;
use crate::models::{Document, DocumentInfo, DocumentVectorizationProgress};
use crate::services::DocumentParser;
use crate::state::AppState;

const BATCH_SIZE: usize = 20;
const DEFAULT_EMBEDDING_MODEL: &str = "nomic-embed-text";

#[tauri::command]
pub async fn upload_document(
    state: State<'_, AppState>,
    project_id: String,
    file_path: String,
) -> Result<DocumentInfo> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    // Parse document
    let (content, metadata) = DocumentParser::parse_document(&file_path)?;

    // Create document record
    let doc_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let document = Document {
        id: doc_id.clone(),
        project_id: project_id.clone(),
        filename: metadata.filename.clone(),
        file_type: metadata.file_type.clone(),
        file_size: metadata.file_size,
        page_count: metadata.page_count,
        word_count: metadata.word_count,
        title: metadata.title,
        author: metadata.author,
        creation_date: metadata.creation_date,
        headings: Some(serde_json::to_string(&metadata.headings).unwrap_or_else(|_| "[]".to_string())),
        content: content.clone(),
        uploaded_at: now.clone(),
        is_vectorized: false,
    };

    // Insert into database
    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.init_document_tables(&conn)?;
    state.duckdb.insert_document(&conn, &document)?;

    // Create chunks for the document
    let chunks = DocumentParser::chunk_document(&doc_id, &content, &metadata.file_type);
    state.duckdb.insert_document_chunks(&conn, &chunks)?;

    Ok(DocumentInfo {
        id: doc_id,
        filename: metadata.filename,
        file_type: metadata.file_type,
        file_size: metadata.file_size,
        page_count: metadata.page_count,
        word_count: metadata.word_count,
        is_vectorized: false,
        uploaded_at: now,
    })
}

#[tauri::command]
pub async fn get_documents(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<DocumentInfo>> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.get_documents(&conn, &project_id)
}

#[tauri::command]
pub async fn get_document(
    state: State<'_, AppState>,
    project_id: String,
    document_id: String,
) -> Result<Document> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();
    state.duckdb.get_document(&conn, &document_id)
}

#[tauri::command]
pub async fn delete_document(
    state: State<'_, AppState>,
    project_id: String,
    document_id: String,
) -> Result<()> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let result = {
        let conn = conn.lock();
        state.duckdb.delete_document(&conn, &document_id)
    }; // MutexGuard dropped here before returning
    result
}

#[tauri::command]
pub async fn vectorize_document(
    window: Window,
    state: State<'_, AppState>,
    project_id: String,
    document_id: String,
) -> Result<()> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;

    // Get document info and chunks
    let (document, chunks) = {
        let conn = conn.lock();
        let doc = state.duckdb.get_document(&conn, &document_id)?;
        let chunks = state.duckdb.get_document_chunks(&conn, &document_id)?;
        (doc, chunks)
    };

    let total_chunks = chunks.len() as i64;

    // Emit initial progress
    let _ = window.emit(
        "document-vectorization-progress",
        DocumentVectorizationProgress {
            document_id: document_id.clone(),
            document_name: document.filename.clone(),
            total_chunks,
            processed_chunks: 0,
            status: "loading_model".to_string(),
            error: None,
        },
    );

    // Warm up embedding model
    if let Err(e) = state
        .ollama
        .warmup_embedding_model(Some(DEFAULT_EMBEDDING_MODEL))
        .await
    {
        let _ = window.emit(
            "document-vectorization-progress",
            DocumentVectorizationProgress {
                document_id: document_id.clone(),
                document_name: document.filename.clone(),
                total_chunks,
                processed_chunks: 0,
                status: "error".to_string(),
                error: Some(e.to_string()),
            },
        );
        return Err(e);
    }

    // Emit progress - now processing
    let _ = window.emit(
        "document-vectorization-progress",
        DocumentVectorizationProgress {
            document_id: document_id.clone(),
            document_name: document.filename.clone(),
            total_chunks,
            processed_chunks: 0,
            status: "processing".to_string(),
            error: None,
        },
    );

    // Process chunks in batches
    let mut processed = 0i64;

    for chunk_batch in chunks.chunks(BATCH_SIZE) {
        let texts: Vec<String> = chunk_batch.iter().map(|c| c.content.clone()).collect();
        let chunk_ids: Vec<String> = chunk_batch.iter().map(|c| c.id.clone()).collect();

        // Generate embeddings
        let embeddings = state
            .ollama
            .generate_embeddings(texts, Some(DEFAULT_EMBEDDING_MODEL))
            .await?;

        // Store embeddings
        let chunk_embeddings: Vec<(String, Vec<f32>)> = chunk_ids
            .into_iter()
            .zip(embeddings.into_iter())
            .collect();

        {
            let conn = conn.lock();
            state.duckdb.store_document_chunk_embeddings(
                &conn,
                chunk_embeddings,
                DEFAULT_EMBEDDING_MODEL,
            )?;
        }

        processed += chunk_batch.len() as i64;

        // Emit progress
        let _ = window.emit(
            "document-vectorization-progress",
            DocumentVectorizationProgress {
                document_id: document_id.clone(),
                document_name: document.filename.clone(),
                total_chunks,
                processed_chunks: processed,
                status: "processing".to_string(),
                error: None,
            },
        );
    }

    // Mark document as vectorized
    {
        let conn = conn.lock();
        state.duckdb.mark_document_vectorized(&conn, &document_id)?;
    }

    // Emit completion
    let _ = window.emit(
        "document-vectorization-progress",
        DocumentVectorizationProgress {
            document_id: document_id.clone(),
            document_name: document.filename,
            total_chunks,
            processed_chunks: processed,
            status: "completed".to_string(),
            error: None,
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn get_supported_document_extensions() -> Vec<String> {
    DocumentParser::get_supported_extensions()
}

#[tauri::command]
pub async fn get_document_chunks_by_id(
    state: State<'_, AppState>,
    project_id: String,
    document_id: String,
    limit: Option<usize>,
) -> Result<Vec<serde_json::Value>> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    let chunks = state.duckdb.get_document_chunks(&conn, &document_id)?;
    let doc = state.duckdb.get_document(&conn, &document_id)?;

    // Return chunks with document info
    let limit = limit.unwrap_or(10);
    let json_results: Vec<serde_json::Value> = chunks
        .into_iter()
        .take(limit)
        .map(|chunk| {
            serde_json::json!({
                "documentId": document_id,
                "documentName": doc.filename,
                "content": chunk.content,
                "similarity": 1.0  // Direct match, max similarity
            })
        })
        .collect();

    Ok(json_results)
}

#[tauri::command]
pub async fn semantic_search_documents(
    state: State<'_, AppState>,
    project_id: String,
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

    let results = state.duckdb.semantic_search_documents(
        &conn,
        &project_id,
        &query_embedding,
        limit.unwrap_or(10),
    )?;

    // Convert to JSON
    let json_results: Vec<serde_json::Value> = results
        .into_iter()
        .map(|(doc_id, doc_name, content, similarity)| {
            serde_json::json!({
                "documentId": doc_id,
                "documentName": doc_name,
                "content": content,
                "similarity": similarity
            })
        })
        .collect();

    Ok(json_results)
}
