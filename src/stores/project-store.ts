import { create } from "zustand";
import type { Project } from "@/types";

interface QueryHistoryItem {
  id: string;
  sql: string;
  executedAt: string;
  rowCount: number;
  executionTimeMs: number;
}

interface ProjectState {
  currentProject: Project | null;
  selectedTable: string | null;
  // Map of projectId -> SQL query text
  projectQueries: Record<string, string>;
  queryHistory: QueryHistoryItem[];

  setCurrentProject: (project: Project | null) => void;
  selectTable: (table: string | null) => void;
  setQuery: (projectId: string, query: string) => void;
  getQuery: (projectId: string) => string;
  addToHistory: (item: QueryHistoryItem) => void;
  clearHistory: () => void;
}

const DEFAULT_QUERY = "SELECT * FROM ";

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  selectedTable: null,
  projectQueries: {},
  queryHistory: [],

  setCurrentProject: (project) =>
    set({
      currentProject: project,
      selectedTable: null,
      queryHistory: [],
    }),
  selectTable: (table) => set({ selectedTable: table }),
  setQuery: (projectId, query) =>
    set((state) => ({
      projectQueries: {
        ...state.projectQueries,
        [projectId]: query,
      },
    })),
  getQuery: (projectId) => {
    const state = get();
    return state.projectQueries[projectId] ?? DEFAULT_QUERY;
  },
  addToHistory: (item) =>
    set((state) => ({
      queryHistory: [item, ...state.queryHistory].slice(0, 100),
    })),
  clearHistory: () => set({ queryHistory: [] }),
}));
