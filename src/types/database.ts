export interface TableInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  isVectorized: boolean;
  vectorizedColumns: string[];
}

export interface VectorizationStatus {
  tableName: string;
  isVectorized: boolean;
  vectorizedColumns: string[];
  embeddingCount: number;
  embeddingModel: string | null;
}

export interface VectorizationProgress {
  tableName: string;
  totalRows: number;
  processedRows: number;
  status: "pending" | "processing" | "completed" | "error";
  error: string | null;
}

export interface SemanticSearchResult {
  rowId: number;
  content: string;
  similarity: number;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

export interface FilterConfig {
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike";
  value: string;
}

export interface TableContext {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
  sampleRows?: Record<string, unknown>[];
}

export interface ProjectContext {
  tables: TableContext[];
}
