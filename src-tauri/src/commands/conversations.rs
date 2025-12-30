use tauri::State;
use uuid::Uuid;

use crate::error::Result;
use crate::models::{ChatMessage, Conversation, ConversationWithMessages};
use crate::state::AppState;

#[tauri::command]
pub async fn list_conversations(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<Conversation>> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    // Ensure conversations table exists
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS _duckbake_conversations (
            id VARCHAR PRIMARY KEY,
            project_id VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS _duckbake_messages (
            id VARCHAR PRIMARY KEY,
            conversation_id VARCHAR NOT NULL,
            role VARCHAR NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES _duckbake_conversations(id)
        );
        "#,
    )?;

    let mut stmt = conn.prepare(
        r#"
        SELECT id, project_id, title,
               CAST(created_at AS VARCHAR) as created_at,
               CAST(updated_at AS VARCHAR) as updated_at
        FROM _duckbake_conversations
        WHERE project_id = ?
        ORDER BY updated_at DESC
        "#,
    )?;

    let conversations: Vec<Conversation> = stmt
        .query_map([&project_id], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                created_at: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                updated_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(conversations)
}

#[tauri::command]
pub async fn create_conversation(
    state: State<'_, AppState>,
    project_id: String,
    title: Option<String>,
) -> Result<Conversation> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    // Ensure table exists
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS _duckbake_conversations (
            id VARCHAR PRIMARY KEY,
            project_id VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS _duckbake_messages (
            id VARCHAR PRIMARY KEY,
            conversation_id VARCHAR NOT NULL,
            role VARCHAR NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES _duckbake_conversations(id)
        );
        "#,
    )?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let title = title.unwrap_or_else(|| "New conversation".to_string());

    conn.execute(
        r#"
        INSERT INTO _duckbake_conversations (id, project_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        "#,
        duckdb::params![&id, &project_id, &title, &now, &now],
    )?;

    Ok(Conversation {
        id,
        project_id,
        title,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn get_conversation(
    state: State<'_, AppState>,
    project_id: String,
    conversation_id: String,
) -> Result<ConversationWithMessages> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    // Get conversation
    let conversation: Conversation = conn.query_row(
        r#"
        SELECT id, project_id, title,
               CAST(created_at AS VARCHAR) as created_at,
               CAST(updated_at AS VARCHAR) as updated_at
        FROM _duckbake_conversations
        WHERE id = ?
        "#,
        [&conversation_id],
        |row| {
            Ok(Conversation {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                created_at: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                updated_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
            })
        },
    )?;

    // Get messages
    let mut stmt = conn.prepare(
        r#"
        SELECT id, role, content, CAST(created_at AS VARCHAR) as created_at
        FROM _duckbake_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        "#,
    )?;

    let messages: Vec<ChatMessage> = stmt
        .query_map([&conversation_id], |row| {
            Ok(ChatMessage {
                id: row.get(0)?,
                role: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                context_tables: None,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ConversationWithMessages {
        id: conversation.id,
        project_id: conversation.project_id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        messages,
    })
}

#[tauri::command]
pub async fn update_conversation(
    state: State<'_, AppState>,
    project_id: String,
    conversation_id: String,
    title: String,
) -> Result<Conversation> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        r#"
        UPDATE _duckbake_conversations
        SET title = ?, updated_at = ?
        WHERE id = ?
        "#,
        duckdb::params![&title, &now, &conversation_id],
    )?;

    let conversation: Conversation = conn.query_row(
        r#"
        SELECT id, project_id, title,
               CAST(created_at AS VARCHAR) as created_at,
               CAST(updated_at AS VARCHAR) as updated_at
        FROM _duckbake_conversations
        WHERE id = ?
        "#,
        [&conversation_id],
        |row| {
            Ok(Conversation {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                created_at: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                updated_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
            })
        },
    )?;

    Ok(conversation)
}

#[tauri::command]
pub async fn delete_conversation(
    state: State<'_, AppState>,
    project_id: String,
    conversation_id: String,
) -> Result<()> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    // Delete messages first
    conn.execute(
        "DELETE FROM _duckbake_messages WHERE conversation_id = ?",
        [&conversation_id],
    )?;

    // Delete conversation
    conn.execute(
        "DELETE FROM _duckbake_conversations WHERE id = ?",
        [&conversation_id],
    )?;

    Ok(())
}

#[tauri::command]
pub async fn add_message(
    state: State<'_, AppState>,
    project_id: String,
    conversation_id: String,
    role: String,
    content: String,
) -> Result<ChatMessage> {
    let db_path = {
        let storage = state.storage.lock();
        let project = storage.get_project(&project_id)?;
        storage.get_database_path(&project)
    };

    let conn = state.duckdb.get_connection(&project_id, &db_path)?;
    let conn = conn.lock();

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        r#"
        INSERT INTO _duckbake_messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
        "#,
        duckdb::params![&id, &conversation_id, &role, &content, &now],
    )?;

    // Update conversation's updated_at
    conn.execute(
        "UPDATE _duckbake_conversations SET updated_at = ? WHERE id = ?",
        duckdb::params![&now, &conversation_id],
    )?;

    Ok(ChatMessage {
        id,
        role,
        content,
        created_at: now,
        context_tables: None,
    })
}
