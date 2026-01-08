import { create } from "zustand";
import type { DocumentVectorizationProgress } from "@/types";

interface DocumentState {
  selectedDocument: string | null;
  activeVectorizations: Map<string, DocumentVectorizationProgress>;

  selectDocument: (documentId: string | null) => void;
  setProgress: (
    documentId: string,
    progress: DocumentVectorizationProgress | null
  ) => void;
  isVectorizing: (documentId: string) => boolean;
  getProgress: (documentId: string) => DocumentVectorizationProgress | undefined;
  clearAll: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  selectedDocument: null,
  activeVectorizations: new Map(),

  selectDocument: (documentId) => set({ selectedDocument: documentId }),

  setProgress: (documentId, progress) =>
    set((state) => {
      const newMap = new Map(state.activeVectorizations);
      if (
        progress === null ||
        progress.status === "completed" ||
        progress.status === "error" ||
        progress.status === "cancelled"
      ) {
        newMap.delete(documentId);
      } else {
        newMap.set(documentId, progress);
      }
      return { activeVectorizations: newMap };
    }),

  isVectorizing: (documentId) => {
    const progress = get().activeVectorizations.get(documentId);
    return (
      progress?.status === "loading_model" || progress?.status === "processing"
    );
  },

  getProgress: (documentId) => get().activeVectorizations.get(documentId),

  clearAll: () =>
    set({ activeVectorizations: new Map(), selectedDocument: null }),
}));
