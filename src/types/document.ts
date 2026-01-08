export interface Document {
  id: string;
  projectId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  pageCount: number | null;
  wordCount: number;
  title: string | null;
  author: string | null;
  creationDate: string | null;
  headings: string | null; // JSON string of HeadingInfo[]
  content: string;
  uploadedAt: string;
  isVectorized: boolean;
}

export interface DocumentInfo {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  pageCount: number | null;
  wordCount: number;
  isVectorized: boolean;
  uploadedAt: string;
}

export interface DocumentVectorizationProgress {
  documentId: string;
  documentName: string;
  totalChunks: number;
  processedChunks: number;
  status:
    | "pending"
    | "loading_model"
    | "processing"
    | "completed"
    | "cancelled"
    | "error";
  error: string | null;
}

export interface HeadingInfo {
  level: number;
  text: string;
  offset: number;
}

export interface DocumentSearchResult {
  documentId: string;
  documentName: string;
  content: string;
  similarity: number;
}
