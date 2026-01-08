import { invoke } from "@tauri-apps/api/core";
import type {
  Project,
  ProjectSummary,
  ProjectStats,
  CreateProjectInput,
  TableInfo,
  TableSchema,
  QueryResult,
  ProjectContext,
  OllamaStatus,
  OllamaModel,
  ImportPreview,
  ImportResult,
  ImportMode,
  VectorizationStatus,
  SemanticSearchResult,
  Conversation,
  ConversationWithMessages,
  ChatMessage,
  SavedQuery,
  Document,
  DocumentInfo,
  DocumentSearchResult,
} from "@/types";

// Project commands
export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  return invoke("create_project", {
    name: input.name,
    description: input.description,
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return invoke("list_projects");
}

export async function openProject(id: string): Promise<Project> {
  return invoke("open_project", { id });
}

export async function deleteProject(id: string): Promise<void> {
  return invoke("delete_project", { id });
}

export async function updateProject(
  id: string,
  name?: string,
  description?: string
): Promise<Project> {
  return invoke("update_project", { id, name, description });
}

export async function getAllProjectStats(): Promise<ProjectStats[]> {
  return invoke("get_all_project_stats");
}

export async function exportProject(
  projectId: string,
  destinationPath: string
): Promise<void> {
  return invoke("export_project", { projectId, destinationPath });
}

export async function importProject(
  sourcePath: string,
  projectName: string
): Promise<Project> {
  return invoke("import_project", { sourcePath, projectName });
}

// Database commands
export async function getTables(projectId: string): Promise<TableInfo[]> {
  return invoke("get_tables", { projectId });
}

export async function getTableSchema(
  projectId: string,
  tableName: string
): Promise<TableSchema> {
  return invoke("get_table_schema", { projectId, tableName });
}

export async function executeQuery(
  projectId: string,
  sql: string
): Promise<QueryResult> {
  return invoke("execute_query", { projectId, sql });
}

export async function queryTable(
  projectId: string,
  tableName: string,
  page: number,
  pageSize: number,
  orderBy?: string,
  orderDesc?: boolean
): Promise<QueryResult> {
  return invoke("query_table", { projectId, tableName, page, pageSize, orderBy, orderDesc });
}

export async function getProjectContext(
  projectId: string
): Promise<ProjectContext> {
  return invoke("get_project_context", { projectId });
}

export async function deleteTable(
  projectId: string,
  tableName: string
): Promise<void> {
  return invoke("delete_table", { projectId, tableName });
}

// Import commands
export async function previewImport(
  projectId: string,
  filePath: string
): Promise<ImportPreview> {
  return invoke("preview_import", { projectId, filePath });
}

export async function importFile(
  projectId: string,
  filePath: string,
  tableName: string,
  mode: ImportMode
): Promise<ImportResult> {
  return invoke("import_file", { projectId, filePath, tableName, mode });
}

export async function getSupportedExtensions(): Promise<string[]> {
  return invoke("get_supported_extensions");
}

// Ollama commands
export async function checkOllamaStatus(): Promise<OllamaStatus> {
  return invoke("check_ollama_status");
}

export async function listOllamaModels(): Promise<OllamaModel[]> {
  return invoke("list_ollama_models");
}

export async function sendChatMessage(
  model: string,
  messages: [string, string][],
  context?: string
): Promise<void> {
  return invoke("send_chat_message", { model, messages, context });
}

export async function pullOllamaModel(model: string): Promise<void> {
  return invoke("pull_ollama_model", { model });
}

export async function deleteOllamaModel(model: string): Promise<void> {
  return invoke("delete_ollama_model", { model });
}

// Vectorization commands
export async function getVectorizationStatus(
  projectId: string,
  tableName: string
): Promise<VectorizationStatus> {
  return invoke("get_vectorization_status", { projectId, tableName });
}

export async function getTextColumns(
  projectId: string,
  tableName: string
): Promise<string[]> {
  return invoke("get_text_columns", { projectId, tableName });
}

export async function vectorizeTable(
  projectId: string,
  tableName: string,
  columns: string[]
): Promise<void> {
  return invoke("vectorize_table", { projectId, tableName, columns });
}

export async function removeVectorization(
  projectId: string,
  tableName: string
): Promise<void> {
  return invoke("remove_vectorization", { projectId, tableName });
}

export async function cancelVectorization(
  tableName: string
): Promise<void> {
  return invoke("cancel_vectorization", { tableName });
}

export async function semanticSearch(
  projectId: string,
  tableName: string,
  query: string,
  limit?: number
): Promise<SemanticSearchResult[]> {
  return invoke("semantic_search", { projectId, tableName, query, limit });
}

// Conversation commands
export async function listConversations(
  projectId: string
): Promise<Conversation[]> {
  return invoke("list_conversations", { projectId });
}

export async function createConversation(
  projectId: string,
  title?: string
): Promise<Conversation> {
  return invoke("create_conversation", { projectId, title });
}

export async function getConversation(
  projectId: string,
  conversationId: string
): Promise<ConversationWithMessages> {
  return invoke("get_conversation", { projectId, conversationId });
}

export async function updateConversation(
  projectId: string,
  conversationId: string,
  title: string
): Promise<Conversation> {
  return invoke("update_conversation", { projectId, conversationId, title });
}

export async function deleteConversation(
  projectId: string,
  conversationId: string
): Promise<void> {
  return invoke("delete_conversation", { projectId, conversationId });
}

export async function addMessage(
  projectId: string,
  conversationId: string,
  role: string,
  content: string
): Promise<ChatMessage> {
  return invoke("add_message", { projectId, conversationId, role, content });
}

// Saved query commands
export async function listSavedQueries(
  projectId: string
): Promise<SavedQuery[]> {
  return invoke("list_saved_queries", { projectId });
}

export async function saveQuery(
  projectId: string,
  name: string,
  sql: string
): Promise<SavedQuery> {
  return invoke("save_query", { projectId, name, sql });
}

export async function updateSavedQuery(
  projectId: string,
  queryId: string,
  name?: string,
  sql?: string
): Promise<SavedQuery> {
  return invoke("update_saved_query", { projectId, queryId, name, sql });
}

export async function deleteSavedQuery(
  projectId: string,
  queryId: string
): Promise<void> {
  return invoke("delete_saved_query", { projectId, queryId });
}

// Document commands
export async function uploadDocument(
  projectId: string,
  filePath: string
): Promise<DocumentInfo> {
  return invoke("upload_document", { projectId, filePath });
}

export async function getDocuments(projectId: string): Promise<DocumentInfo[]> {
  return invoke("get_documents", { projectId });
}

export async function getDocument(
  projectId: string,
  documentId: string
): Promise<Document> {
  return invoke("get_document", { projectId, documentId });
}

export async function deleteDocument(
  projectId: string,
  documentId: string
): Promise<void> {
  return invoke("delete_document", { projectId, documentId });
}

export async function vectorizeDocument(
  projectId: string,
  documentId: string
): Promise<void> {
  return invoke("vectorize_document", { projectId, documentId });
}

export async function getSupportedDocumentExtensions(): Promise<string[]> {
  return invoke("get_supported_document_extensions");
}

export async function semanticSearchDocuments(
  projectId: string,
  query: string,
  limit?: number
): Promise<DocumentSearchResult[]> {
  return invoke("semantic_search_documents", { projectId, query, limit });
}

export async function getDocumentChunksById(
  projectId: string,
  documentId: string,
  limit?: number
): Promise<DocumentSearchResult[]> {
  return invoke("get_document_chunks_by_id", { projectId, documentId, limit });
}
