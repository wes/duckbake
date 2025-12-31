use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;

use duckdb::Connection;
use parking_lot::Mutex;
use serde_json::{json, Value};

use crate::error::{AppError, Result};
use crate::models::{ColumnInfo, QueryResult, TableInfo, TableSchema, VectorizationStatus};

pub struct DuckDbService {
    connections: Mutex<HashMap<String, Arc<Mutex<Connection>>>>,
}

impl DuckDbService {
    pub fn new() -> Self {
        DuckDbService {
            connections: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_connection(&self, project_id: &str, db_path: &PathBuf) -> Result<Arc<Mutex<Connection>>> {
        let mut connections = self.connections.lock();

        if let Some(conn) = connections.get(project_id) {
            return Ok(conn.clone());
        }

        let conn = Connection::open(db_path)?;
        let conn = Arc::new(Mutex::new(conn));
        connections.insert(project_id.to_string(), conn.clone());

        Ok(conn)
    }

    pub fn close_connection(&self, project_id: &str) {
        let mut connections = self.connections.lock();
        connections.remove(project_id);
    }

    pub fn get_tables(&self, conn: &Connection) -> Result<Vec<TableInfo>> {
        let mut stmt = conn.prepare(
            r#"
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'main'
            AND table_name NOT LIKE '_duckbake_%'
            ORDER BY table_name
            "#,
        )?;

        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        let mut result = Vec::new();
        for table_name in tables {
            // Get row count
            let row_count: i64 = conn
                .query_row(
                    &format!("SELECT COUNT(*) FROM \"{}\"", table_name),
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            // Get column count
            let column_count: i64 = conn
                .query_row(
                    r#"
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_name = ? AND table_schema = 'main'
                    "#,
                    [&table_name],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            // Check vectorization status
            let vectorized_columns = self.get_vectorized_columns(conn, &table_name);

            result.push(TableInfo {
                name: table_name,
                row_count,
                column_count,
                is_vectorized: !vectorized_columns.is_empty(),
                vectorized_columns,
            });
        }

        Ok(result)
    }

    /// Get list of vectorized columns for a table
    fn get_vectorized_columns(&self, conn: &Connection, table_name: &str) -> Vec<String> {
        // Check if embeddings table exists and has entries for this table
        let query = r#"
            SELECT DISTINCT source_column
            FROM _duckbake_embeddings
            WHERE table_name = ?
        "#;

        conn.prepare(query)
            .and_then(|mut stmt| {
                stmt.query_map([table_name], |row| row.get(0))
                    .map(|rows| rows.filter_map(|r| r.ok()).collect())
            })
            .unwrap_or_default()
    }

    pub fn get_table_schema(&self, conn: &Connection, table_name: &str) -> Result<TableSchema> {
        let mut stmt = conn.prepare(
            r#"
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = ? AND table_schema = 'main'
            ORDER BY ordinal_position
            "#,
        )?;

        let columns: Vec<ColumnInfo> = stmt
            .query_map([table_name], |row| {
                Ok(ColumnInfo {
                    name: row.get(0)?,
                    data_type: row.get(1)?,
                    nullable: row.get::<_, String>(2)? == "YES",
                    is_primary_key: false, // TODO: Implement PK detection
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        if columns.is_empty() {
            return Err(AppError::TableNotFound(table_name.to_string()));
        }

        Ok(TableSchema {
            name: table_name.to_string(),
            columns,
        })
    }

    pub fn execute_query(&self, conn: &Connection, sql: &str) -> Result<QueryResult> {
        let start = Instant::now();

        // First, get column names using DESCRIBE
        let describe_sql = format!("DESCRIBE {}", sql);
        let columns: Vec<String> = match conn.prepare(&describe_sql) {
            Ok(mut desc_stmt) => {
                let mut cols = Vec::new();
                if let Ok(mut desc_rows) = desc_stmt.query([]) {
                    while let Ok(Some(row)) = desc_rows.next() {
                        if let Ok(name) = row.get::<_, String>(0) {
                            cols.push(name);
                        }
                    }
                }
                cols
            }
            Err(_) => Vec::new(),
        };

        // Now execute the actual query
        let mut stmt = conn.prepare(sql)?;
        let mut row_iter = stmt.query([])?;

        let mut rows: Vec<Value> = Vec::new();
        let mut first_row = true;
        let mut actual_columns = columns.clone();

        while let Some(row) = row_iter.next()? {
            // If we don't have columns yet, infer from first row
            if first_row && actual_columns.is_empty() {
                // We'll just use numbered columns as fallback
                for i in 0..100 {
                    if row.get::<_, Option<String>>(i).is_ok()
                        || row.get::<_, Option<i64>>(i).is_ok()
                        || row.get::<_, Option<f64>>(i).is_ok()
                    {
                        actual_columns.push(format!("column_{}", i));
                    } else {
                        break;
                    }
                }
                first_row = false;
            }

            let mut row_obj = serde_json::Map::new();
            for (i, col_name) in actual_columns.iter().enumerate() {
                let value = self.get_value_from_row(row, i);
                row_obj.insert(col_name.clone(), value);
            }
            rows.push(Value::Object(row_obj));
        }

        let execution_time_ms = start.elapsed().as_millis() as u64;
        let row_count = rows.len();

        Ok(QueryResult {
            columns: actual_columns,
            rows,
            row_count,
            execution_time_ms,
        })
    }

    pub fn query_table(
        &self,
        conn: &Connection,
        table_name: &str,
        page: u32,
        page_size: u32,
        order_by: Option<&str>,
        order_desc: bool,
    ) -> Result<QueryResult> {
        let offset = page * page_size;
        let order_clause = match order_by {
            Some(col) => {
                let direction = if order_desc { "DESC" } else { "ASC" };
                format!(" ORDER BY \"{}\" {}", col.replace("\"", "\"\""), direction)
            }
            None => String::new(),
        };
        let sql = format!(
            "SELECT * FROM \"{}\"{}  LIMIT {} OFFSET {}",
            table_name, order_clause, page_size, offset
        );
        self.execute_query(conn, &sql)
    }

    fn get_value_from_row(&self, row: &duckdb::Row, idx: usize) -> Value {
        // Try different types
        if let Ok(v) = row.get::<_, Option<i64>>(idx) {
            return v.map(Value::from).unwrap_or(Value::Null);
        }
        if let Ok(v) = row.get::<_, Option<f64>>(idx) {
            return v.map(|f| json!(f)).unwrap_or(Value::Null);
        }
        if let Ok(v) = row.get::<_, Option<bool>>(idx) {
            return v.map(Value::from).unwrap_or(Value::Null);
        }
        if let Ok(v) = row.get::<_, Option<String>>(idx) {
            return v.map(Value::from).unwrap_or(Value::Null);
        }
        Value::Null
    }

    /// Initialize the embeddings table if it doesn't exist
    pub fn init_embeddings_table(&self, conn: &Connection) -> Result<()> {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS _duckbake_embeddings (
                id INTEGER PRIMARY KEY,
                table_name VARCHAR NOT NULL,
                source_column VARCHAR NOT NULL,
                row_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding FLOAT[] NOT NULL,
                embedding_model VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_embeddings_table
                ON _duckbake_embeddings(table_name, source_column);
            "#,
        )?;
        Ok(())
    }

    /// Store embeddings for a batch of rows
    pub fn store_embeddings(
        &self,
        conn: &Connection,
        table_name: &str,
        column_name: &str,
        rows: Vec<(i64, String, Vec<f32>)>, // (row_id, content, embedding)
        model: &str,
    ) -> Result<()> {
        self.init_embeddings_table(conn)?;

        let mut stmt = conn.prepare(
            r#"
            INSERT INTO _duckbake_embeddings
                (table_name, source_column, row_id, content, embedding, embedding_model)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )?;

        for (row_id, content, embedding) in rows {
            // Convert Vec<f32> to a format DuckDB can handle
            let embedding_str = format!(
                "[{}]",
                embedding.iter().map(|f| f.to_string()).collect::<Vec<_>>().join(",")
            );
            stmt.execute(duckdb::params![
                table_name,
                column_name,
                row_id,
                content,
                embedding_str,
                model
            ])?;
        }

        Ok(())
    }

    /// Get vectorization status for a table
    pub fn get_vectorization_status(
        &self,
        conn: &Connection,
        table_name: &str,
    ) -> Result<VectorizationStatus> {
        let vectorized_columns = self.get_vectorized_columns(conn, table_name);

        let (embedding_count, embedding_model): (i64, Option<String>) = conn
            .query_row(
                r#"
                SELECT COUNT(*), MAX(embedding_model)
                FROM _duckbake_embeddings
                WHERE table_name = ?
                "#,
                [table_name],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap_or((0, None));

        Ok(VectorizationStatus {
            table_name: table_name.to_string(),
            is_vectorized: !vectorized_columns.is_empty(),
            vectorized_columns,
            embedding_count,
            embedding_model,
        })
    }

    /// Remove vectorization for a table
    pub fn remove_vectorization(&self, conn: &Connection, table_name: &str) -> Result<()> {
        conn.execute(
            "DELETE FROM _duckbake_embeddings WHERE table_name = ?",
            [table_name],
        )?;
        Ok(())
    }

    /// Get text content from specified columns for vectorization
    pub fn get_text_for_vectorization(
        &self,
        conn: &Connection,
        table_name: &str,
        columns: &[String],
        batch_size: usize,
        offset: usize,
    ) -> Result<Vec<(i64, String)>> {
        // Combine columns into a single text field
        let column_concat = columns
            .iter()
            .map(|c| format!("COALESCE(CAST(\"{}\" AS VARCHAR), '')", c))
            .collect::<Vec<_>>()
            .join(" || ' ' || ");

        let sql = format!(
            r#"
            SELECT rowid, {} as combined_text
            FROM "{}"
            LIMIT {} OFFSET {}
            "#,
            column_concat, table_name, batch_size, offset
        );

        let mut stmt = conn.prepare(&sql)?;
        let rows: Vec<(i64, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(rows)
    }

    /// Semantic search using cosine similarity
    pub fn semantic_search(
        &self,
        conn: &Connection,
        table_name: &str,
        query_embedding: &[f32],
        limit: usize,
    ) -> Result<Vec<(i64, String, f64)>> {
        // Build the embedding array literal
        let embedding_str = format!(
            "[{}]",
            query_embedding.iter().map(|f| f.to_string()).collect::<Vec<_>>().join(",")
        );

        let sql = format!(
            r#"
            SELECT
                row_id,
                content,
                list_cosine_similarity(embedding, {}::FLOAT[]) as similarity
            FROM _duckbake_embeddings
            WHERE table_name = ?
            ORDER BY similarity DESC
            LIMIT ?
            "#,
            embedding_str
        );

        let mut stmt = conn.prepare(&sql)?;
        let results: Vec<(i64, String, f64)> = stmt
            .query_map(duckdb::params![table_name, limit as i64], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(results)
    }

    /// Get text columns from a table (VARCHAR, TEXT types)
    pub fn get_text_columns(&self, conn: &Connection, table_name: &str) -> Result<Vec<String>> {
        let mut stmt = conn.prepare(
            r#"
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = ?
            AND table_schema = 'main'
            AND (data_type LIKE '%VARCHAR%' OR data_type LIKE '%TEXT%' OR data_type LIKE '%CHAR%')
            ORDER BY ordinal_position
            "#,
        )?;

        let columns: Vec<String> = stmt
            .query_map([table_name], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(columns)
    }
}
