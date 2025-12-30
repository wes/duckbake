import { create } from "zustand";

type ActiveTab = "browser" | "schema" | "query" | "chat";

interface AppState {
  sidebarOpen: boolean;
  activeTab: ActiveTab;
  ollamaConnected: boolean;
  selectedInferenceModel: string | null;
  selectedEmbeddingModel: string | null;
  pendingSql: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setOllamaConnected: (connected: boolean) => void;
  setInferenceModel: (model: string | null) => void;
  setEmbeddingModel: (model: string | null) => void;
  setPendingSql: (sql: string | null) => void;
  openInQueryEditor: (sql: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  activeTab: "browser",
  ollamaConnected: false,
  selectedInferenceModel: null,
  selectedEmbeddingModel: null,
  pendingSql: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setOllamaConnected: (connected) => set({ ollamaConnected: connected }),
  setInferenceModel: (model) => set({ selectedInferenceModel: model }),
  setEmbeddingModel: (model) => set({ selectedEmbeddingModel: model }),
  setPendingSql: (sql) => set({ pendingSql: sql }),
  openInQueryEditor: (sql) => set({ pendingSql: sql, activeTab: "query" }),
}));
