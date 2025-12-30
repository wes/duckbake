use tauri::{State, Window};

use crate::error::Result;
use crate::models::{OllamaModel, OllamaStatus};
use crate::state::AppState;

#[tauri::command]
pub async fn check_ollama_status(state: State<'_, AppState>) -> Result<OllamaStatus> {
    state.ollama.check_status().await
}

#[tauri::command]
pub async fn list_ollama_models(state: State<'_, AppState>) -> Result<Vec<OllamaModel>> {
    state.ollama.list_models().await
}

#[tauri::command]
pub async fn send_chat_message(
    state: State<'_, AppState>,
    window: Window,
    model: String,
    messages: Vec<(String, String)>,
    context: Option<String>,
) -> Result<()> {
    state
        .ollama
        .chat_stream(&window, &model, messages, context)
        .await
}
