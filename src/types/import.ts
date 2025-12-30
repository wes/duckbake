export interface ImportPreview {
  fileName: string;
  fileType: string;
  columns: PreviewColumn[];
  sampleRows: unknown[][];
  totalRowsEstimate: number | null;
}

export interface PreviewColumn {
  name: string;
  inferredType: string;
}

export interface ImportResult {
  tableName: string;
  rowsImported: number;
  columnsCount: number;
}

export type ImportMode = "create" | "replace" | "append";
