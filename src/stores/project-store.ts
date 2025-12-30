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
  currentQuery: string;
  queryHistory: QueryHistoryItem[];

  setCurrentProject: (project: Project | null) => void;
  selectTable: (table: string | null) => void;
  setQuery: (query: string) => void;
  addToHistory: (item: QueryHistoryItem) => void;
  clearHistory: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  selectedTable: null,
  currentQuery: "",
  queryHistory: [],

  setCurrentProject: (project) =>
    set({
      currentProject: project,
      selectedTable: null,
      currentQuery: "",
      queryHistory: [],
    }),
  selectTable: (table) => set({ selectedTable: table }),
  setQuery: (query) => set({ currentQuery: query }),
  addToHistory: (item) =>
    set((state) => ({
      queryHistory: [item, ...state.queryHistory].slice(0, 100),
    })),
  clearHistory: () => set({ queryHistory: [] }),
}));
