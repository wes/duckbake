use std::collections::HashSet;

use parking_lot::Mutex;

use crate::services::{DuckDbService, OllamaService, StorageService};

pub struct AppState {
    pub storage: Mutex<StorageService>,
    pub duckdb: DuckDbService,
    pub ollama: OllamaService,
    /// Set of table names that should cancel their vectorization
    pub vectorization_cancellations: Mutex<HashSet<String>>,
}

impl AppState {
    pub fn new() -> Result<Self, crate::error::AppError> {
        Ok(AppState {
            storage: Mutex::new(StorageService::new()?),
            duckdb: DuckDbService::new(),
            ollama: OllamaService::new(),
            vectorization_cancellations: Mutex::new(HashSet::new()),
        })
    }

    /// Request cancellation of vectorization for a table
    pub fn cancel_vectorization(&self, table_name: &str) {
        self.vectorization_cancellations.lock().insert(table_name.to_string());
    }

    /// Check if vectorization should be cancelled for a table
    pub fn should_cancel_vectorization(&self, table_name: &str) -> bool {
        self.vectorization_cancellations.lock().contains(table_name)
    }

    /// Clear cancellation flag for a table
    pub fn clear_vectorization_cancellation(&self, table_name: &str) {
        self.vectorization_cancellations.lock().remove(table_name);
    }
}
