use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: String,
    pub project_id: String,
    pub filename: String,
    pub file_type: String,
    pub file_size: i64,
    pub page_count: Option<i32>,
    pub word_count: i32,
    pub title: Option<String>,
    pub author: Option<String>,
    pub creation_date: Option<String>,
    pub headings: Option<String>, // JSON array of HeadingInfo
    pub content: String,
    pub uploaded_at: String,
    pub is_vectorized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentInfo {
    pub id: String,
    pub filename: String,
    pub file_type: String,
    pub file_size: i64,
    pub page_count: Option<i32>,
    pub word_count: i32,
    pub is_vectorized: bool,
    pub uploaded_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentChunk {
    pub id: String,
    pub document_id: String,
    pub chunk_index: i32,
    pub chunk_type: String, // "paragraph", "section", "heading"
    pub content: String,
    pub start_offset: i32,
    pub end_offset: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentMetadata {
    pub filename: String,
    pub file_type: String,
    pub file_size: i64,
    pub page_count: Option<i32>,
    pub word_count: i32,
    pub title: Option<String>,
    pub author: Option<String>,
    pub creation_date: Option<String>,
    pub headings: Vec<HeadingInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeadingInfo {
    pub level: i32, // 1-6
    pub text: String,
    pub offset: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentVectorizationProgress {
    pub document_id: String,
    pub document_name: String,
    pub total_chunks: i64,
    pub processed_chunks: i64,
    pub status: String, // "pending", "loading_model", "processing", "completed", "cancelled", "error"
    pub error: Option<String>,
}
