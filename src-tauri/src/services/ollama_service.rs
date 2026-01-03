use std::time::Duration;

use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Window};

use crate::error::{AppError, Result};
use crate::models::{OllamaModel, OllamaStatus, OllamaTagsResponse, OllamaVersionResponse};

const DEFAULT_EMBEDDING_MODEL: &str = "nomic-embed-text";

const OLLAMA_BASE_URL: &str = "http://localhost:11434";

// Timeout for embedding requests (model loading can take time)
const EMBEDDING_TIMEOUT_SECS: u64 = 300; // 5 minutes

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessageRequest>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct ChatMessageRequest {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatStreamResponse {
    message: Option<ChatMessageContent>,
    done: bool,
}

#[derive(Debug, Deserialize)]
struct ChatMessageContent {
    #[allow(dead_code)]
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct EmbeddingRequest {
    model: String,
    input: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    keep_alive: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EmbeddingResponse {
    embeddings: Vec<Vec<f32>>,
}

pub struct OllamaService {
    client: Client,
    base_url: String,
}

impl OllamaService {
    pub fn new() -> Self {
        OllamaService {
            client: Client::new(),
            base_url: OLLAMA_BASE_URL.to_string(),
        }
    }

    pub async fn check_status(&self) -> Result<OllamaStatus> {
        let url = format!("{}/api/version", self.base_url);

        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let version_info: OllamaVersionResponse = response.json().await?;
                    Ok(OllamaStatus {
                        connected: true,
                        version: Some(version_info.version),
                    })
                } else {
                    Ok(OllamaStatus {
                        connected: false,
                        version: None,
                    })
                }
            }
            Err(_) => Ok(OllamaStatus {
                connected: false,
                version: None,
            }),
        }
    }

    pub async fn list_models(&self) -> Result<Vec<OllamaModel>> {
        let url = format!("{}/api/tags", self.base_url);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|_| AppError::OllamaNotAvailable)?;

        if !response.status().is_success() {
            return Err(AppError::OllamaNotAvailable);
        }

        let tags: OllamaTagsResponse = response.json().await?;

        Ok(tags
            .models
            .into_iter()
            .map(|m| OllamaModel {
                name: m.name,
                size: m.size,
                digest: m.digest,
                modified_at: m.modified_at,
            })
            .collect())
    }

    pub async fn chat_stream(
        &self,
        window: &Window,
        model: &str,
        messages: Vec<(String, String)>, // (role, content) pairs
        context: Option<String>,
    ) -> Result<()> {
        let url = format!("{}/api/chat", self.base_url);

        // Build messages with optional context
        let mut chat_messages: Vec<ChatMessageRequest> = Vec::new();

        // Add system message with context if provided
        let base_prompt = r#"You are a helpful data analyst assistant working with a DuckDB database.

RESPONSE FORMAT:
When answering data questions, provide a brief explanation followed by a query block. Do NOT show raw SQL to the user - use this special format instead:

```duckbake
{"sql": "YOUR SQL QUERY HERE", "viz": "TYPE", "xKey": "column", "yKey": "column"}
```

Where:
- sql: The DuckDB SQL query to execute
- viz: Visualization type - one of: "table", "bar", "line", "pie"
- xKey: Column for x-axis/labels (optional, auto-detected if omitted)
- yKey: Column for y-axis/values (optional, auto-detected if omitted)

VISUALIZATION GUIDELINES:
- Use "table" for detailed row-level data, text results, or many columns
- Use "bar" for comparing categories (e.g., sales by region, counts by type)
- Use "line" for trends over time (e.g., monthly sales, daily users)
- Use "pie" for showing proportions of a whole (e.g., market share, percentages) - limit to 5-7 slices

EXAMPLE:
User: "Show me sales by region"
Response: Here's the breakdown of sales by region:

```duckbake
{"sql": "SELECT region, SUM(amount) as total_sales FROM orders GROUP BY region ORDER BY total_sales DESC", "viz": "bar", "xKey": "region", "yKey": "total_sales"}
```

IMPORTANT:
- Always use valid DuckDB SQL syntax
- Keep queries efficient with appropriate LIMIT clauses for large results
- Choose the most appropriate visualization for the data
- Provide brief context before the query block
- You can include multiple query blocks for complex analyses"#;

        if let Some(ctx) = context {
            chat_messages.push(ChatMessageRequest {
                role: "system".to_string(),
                content: format!(
                    "{}\n\nDATABASE CONTEXT:\n{}",
                    base_prompt, ctx
                ),
            });
        } else {
            chat_messages.push(ChatMessageRequest {
                role: "system".to_string(),
                content: format!("{}\n\nNo tables in the database yet.", base_prompt),
            });
        }

        // Add conversation messages
        for (role, content) in messages {
            chat_messages.push(ChatMessageRequest { role, content });
        }

        let request = ChatRequest {
            model: model.to_string(),
            messages: chat_messages,
            stream: true,
        };

        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|_| AppError::OllamaNotAvailable)?;

        if !response.status().is_success() {
            return Err(AppError::Custom(format!(
                "Ollama returned status: {}",
                response.status()
            )));
        }

        let mut stream = response.bytes_stream();

        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(bytes) => {
                    // Parse each line (NDJSON format)
                    let text = String::from_utf8_lossy(&bytes);
                    for line in text.lines() {
                        if line.is_empty() {
                            continue;
                        }
                        if let Ok(response) = serde_json::from_str::<ChatStreamResponse>(line) {
                            if let Some(msg) = response.message {
                                if !msg.content.is_empty() {
                                    let _ = window.emit("chat-chunk", &msg.content);
                                }
                            }
                            if response.done {
                                let _ = window.emit("chat-done", ());
                                return Ok(());
                            }
                        }
                    }
                }
                Err(e) => {
                    let _ = window.emit("chat-error", e.to_string());
                    return Err(AppError::Custom(e.to_string()));
                }
            }
        }

        let _ = window.emit("chat-done", ());
        Ok(())
    }

    /// Warm up the embedding model by sending a test request
    /// This loads the model into memory so subsequent requests are fast
    pub async fn warmup_embedding_model(&self, model: Option<&str>) -> Result<()> {
        let url = format!("{}/api/embed", self.base_url);
        let model = model.unwrap_or(DEFAULT_EMBEDDING_MODEL);

        let request = EmbeddingRequest {
            model: model.to_string(),
            input: vec!["warmup".to_string()],
            keep_alive: Some("10m".to_string()),
        };

        let response = self
            .client
            .post(&url)
            .timeout(Duration::from_secs(EMBEDDING_TIMEOUT_SECS))
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    AppError::Custom(format!(
                        "Model warmup timed out after {} seconds",
                        EMBEDDING_TIMEOUT_SECS
                    ))
                } else if e.is_connect() {
                    AppError::OllamaNotAvailable
                } else {
                    AppError::Custom(format!("Failed to connect to Ollama: {}", e))
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::Custom(format!(
                "Model warmup failed ({}): {}. Make sure '{}' model is installed (ollama pull {})",
                status, body, model, model
            )));
        }

        Ok(())
    }

    /// Generate embeddings for a batch of texts
    pub async fn generate_embeddings(
        &self,
        texts: Vec<String>,
        model: Option<&str>,
    ) -> Result<Vec<Vec<f32>>> {
        let url = format!("{}/api/embed", self.base_url);
        let model = model.unwrap_or(DEFAULT_EMBEDDING_MODEL);

        let request = EmbeddingRequest {
            model: model.to_string(),
            input: texts,
            keep_alive: Some("10m".to_string()), // Keep model loaded for 10 minutes
        };

        // Use a longer timeout for embeddings since model loading can take time
        let response = self
            .client
            .post(&url)
            .timeout(Duration::from_secs(EMBEDDING_TIMEOUT_SECS))
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    AppError::Custom(format!(
                        "Embedding request timed out after {} seconds. The model may still be loading - try again.",
                        EMBEDDING_TIMEOUT_SECS
                    ))
                } else if e.is_connect() {
                    AppError::OllamaNotAvailable
                } else {
                    AppError::Custom(format!("Failed to connect to Ollama: {}", e))
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::Custom(format!(
                "Embedding failed ({}): {}. Make sure '{}' model is installed (ollama pull {})",
                status, body, model, model
            )));
        }

        let embed_response: EmbeddingResponse = response.json().await?;
        Ok(embed_response.embeddings)
    }
}
