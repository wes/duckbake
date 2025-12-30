use std::path::Path;

use duckdb::Connection;
use serde::{Deserialize, Serialize};

use crate::error::{AppError, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    pub file_name: String,
    pub file_type: String,
    pub columns: Vec<PreviewColumn>,
    pub sample_rows: Vec<Vec<serde_json::Value>>,
    pub total_rows_estimate: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewColumn {
    pub name: String,
    pub inferred_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub table_name: String,
    pub rows_imported: i64,
    pub columns_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportMode {
    Create,
    Replace,
    Append,
}

pub struct FileParser;

impl FileParser {
    /// Detect file type from extension
    pub fn detect_file_type(file_path: &str) -> Result<String> {
        let path = Path::new(file_path);
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .ok_or_else(|| AppError::Custom("Could not determine file type".into()))?;

        match extension.as_str() {
            "csv" => Ok("csv".into()),
            "tsv" => Ok("tsv".into()),
            "json" => Ok("json".into()),
            "jsonl" | "ndjson" => Ok("jsonl".into()),
            "parquet" | "pq" => Ok("parquet".into()),
            "xlsx" | "xls" => Ok("excel".into()),
            _ => Err(AppError::Custom(format!(
                "Unsupported file type: {}",
                extension
            ))),
        }
    }

    /// Generate a preview of the file using DuckDB's sniffing capabilities
    pub fn preview_file(conn: &Connection, file_path: &str) -> Result<ImportPreview> {
        let file_type = Self::detect_file_type(file_path)?;
        let file_name = Path::new(file_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Use DuckDB to read and preview the file
        let read_sql = Self::build_read_sql(&file_type, file_path)?;

        // Get column info using DESCRIBE
        let describe_sql = format!("DESCRIBE SELECT * FROM {}", read_sql);
        let mut stmt = conn.prepare(&describe_sql)?;
        let mut columns = Vec::new();

        let mut rows = stmt.query([])?;
        while let Some(row) = rows.next()? {
            let name: String = row.get(0)?;
            let dtype: String = row.get(1)?;
            columns.push(PreviewColumn {
                name,
                inferred_type: dtype,
            });
        }

        // Get sample rows (first 10)
        let sample_sql = format!("SELECT * FROM {} LIMIT 10", read_sql);
        let mut stmt = conn.prepare(&sample_sql)?;
        let mut row_iter = stmt.query([])?;

        // Use the columns count we already got from DESCRIBE
        let column_count = columns.len();

        let mut sample_rows = Vec::new();
        while let Some(row) = row_iter.next()? {
            let mut row_values = Vec::new();
            for i in 0..column_count {
                let value = Self::get_json_value(row, i);
                row_values.push(value);
            }
            sample_rows.push(row_values);
        }

        // Try to get row count estimate
        let count_sql = format!("SELECT COUNT(*) FROM {}", read_sql);
        let total_rows_estimate = conn
            .query_row(&count_sql, [], |row| row.get::<_, i64>(0))
            .ok();

        Ok(ImportPreview {
            file_name,
            file_type,
            columns,
            sample_rows,
            total_rows_estimate,
        })
    }

    /// Import file into a DuckDB table
    pub fn import_file(
        conn: &Connection,
        file_path: &str,
        table_name: &str,
        mode: ImportMode,
    ) -> Result<ImportResult> {
        let file_type = Self::detect_file_type(file_path)?;
        let read_sql = Self::build_read_sql(&file_type, file_path)?;

        // Handle import mode
        match mode {
            ImportMode::Create => {
                // Drop if exists, then create
                let _ = conn.execute(&format!("DROP TABLE IF EXISTS \"{}\"", table_name), []);
                let create_sql = format!(
                    "CREATE TABLE \"{}\" AS SELECT * FROM {}",
                    table_name, read_sql
                );
                conn.execute(&create_sql, [])?;
            }
            ImportMode::Replace => {
                // Truncate and insert
                let _ = conn.execute(&format!("DROP TABLE IF EXISTS \"{}\"", table_name), []);
                let create_sql = format!(
                    "CREATE TABLE \"{}\" AS SELECT * FROM {}",
                    table_name, read_sql
                );
                conn.execute(&create_sql, [])?;
            }
            ImportMode::Append => {
                // Insert into existing table
                let insert_sql = format!(
                    "INSERT INTO \"{}\" SELECT * FROM {}",
                    table_name, read_sql
                );
                conn.execute(&insert_sql, [])?;
            }
        }

        // Get final row count and column count
        let row_count: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM \"{}\"", table_name),
            [],
            |row| row.get(0),
        )?;

        let column_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ? AND table_schema = 'main'",
            [table_name],
            |row| row.get(0),
        )?;

        Ok(ImportResult {
            table_name: table_name.to_string(),
            rows_imported: row_count,
            columns_count: column_count as usize,
        })
    }

    /// Build the read SQL for different file types
    fn build_read_sql(file_type: &str, file_path: &str) -> Result<String> {
        // Escape single quotes in file path
        let escaped_path = file_path.replace('\'', "''");

        let sql = match file_type {
            "csv" => format!("read_csv('{}', auto_detect=true, header=true)", escaped_path),
            "tsv" => format!("read_csv('{}', auto_detect=true, header=true, delim='\\t')", escaped_path),
            "json" => format!("read_json('{}', auto_detect=true)", escaped_path),
            "jsonl" => format!("read_json('{}', format='newline_delimited', auto_detect=true)", escaped_path),
            "parquet" => format!("read_parquet('{}')", escaped_path),
            "excel" => format!("st_read('{}')", escaped_path),
            _ => return Err(AppError::Custom(format!("Unsupported file type: {}", file_type))),
        };

        Ok(sql)
    }

    fn get_json_value(row: &duckdb::Row, idx: usize) -> serde_json::Value {
        // Try different types
        if let Ok(v) = row.get::<_, Option<i64>>(idx) {
            return v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null);
        }
        if let Ok(v) = row.get::<_, Option<f64>>(idx) {
            return v.map(|f| serde_json::json!(f)).unwrap_or(serde_json::Value::Null);
        }
        if let Ok(v) = row.get::<_, Option<bool>>(idx) {
            return v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null);
        }
        if let Ok(v) = row.get::<_, Option<String>>(idx) {
            return v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null);
        }
        serde_json::Value::Null
    }
}
