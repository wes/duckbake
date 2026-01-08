export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  databaseFile: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface ProjectStats {
  projectId: string;
  tableCount: number;
  totalRows: number;
  conversationCount: number;
  savedQueryCount: number;
  documentCount: number;
  storageSize: number;
}
