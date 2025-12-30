use parking_lot::Mutex;

use crate::services::{DuckDbService, OllamaService, StorageService};

pub struct AppState {
    pub storage: Mutex<StorageService>,
    pub duckdb: DuckDbService,
    pub ollama: OllamaService,
}

impl AppState {
    pub fn new() -> Result<Self, crate::error::AppError> {
        Ok(AppState {
            storage: Mutex::new(StorageService::new()?),
            duckdb: DuckDbService::new(),
            ollama: OllamaService::new(),
        })
    }
}
