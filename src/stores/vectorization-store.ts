import { create } from "zustand";
import type { VectorizationProgress } from "@/types";

interface VectorizationState {
  // Map of tableName -> progress
  activeVectorizations: Map<string, VectorizationProgress>;
  setProgress: (tableName: string, progress: VectorizationProgress | null) => void;
  isVectorizing: (tableName: string) => boolean;
  getProgress: (tableName: string) => VectorizationProgress | undefined;
  clearAll: () => void;
}

export const useVectorizationStore = create<VectorizationState>((set, get) => ({
  activeVectorizations: new Map(),

  setProgress: (tableName, progress) =>
    set((state) => {
      const newMap = new Map(state.activeVectorizations);
      if (progress === null || progress.status === "completed" || progress.status === "error" || progress.status === "cancelled") {
        newMap.delete(tableName);
      } else {
        newMap.set(tableName, progress);
      }
      return { activeVectorizations: newMap };
    }),

  isVectorizing: (tableName) => {
    const progress = get().activeVectorizations.get(tableName);
    return progress?.status === "loading_model" || progress?.status === "processing";
  },

  getProgress: (tableName) => get().activeVectorizations.get(tableName),

  clearAll: () => set({ activeVectorizations: new Map() }),
}));
