import { create } from "zustand";
import type { ChatMessage, Conversation } from "@/types";

export type ContextMode = "auto" | "data" | "documents";

interface ChatState {
  // Current conversation
  currentConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;

  // Context mode for chat
  contextMode: ContextMode;

  // Conversations list
  conversations: Conversation[];

  // Actions
  setCurrentConversation: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;

  setContextMode: (mode: ContextMode) => void;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  startStreaming: () => void;
  appendToStreaming: (chunk: string) => void;
  finalizeStreaming: (messageId: string) => void;
  clearMessages: () => void;
  resetForProject: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  contextMode: "auto",
  conversations: [],

  setCurrentConversation: (id) =>
    set({ currentConversationId: id, messages: [], streamingContent: "" }),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      messages: [],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
      messages: state.currentConversationId === id ? [] : state.messages,
    })),

  setContextMode: (mode) => set({ contextMode: mode }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  startStreaming: () => set({ isStreaming: true, streamingContent: "" }),

  appendToStreaming: (chunk) => {
    // Batch updates using internal buffer to reduce re-renders
    const state = get() as ChatState & { _streamBuffer?: string; _rafId?: number };

    // Initialize or append to buffer
    state._streamBuffer = (state._streamBuffer || "") + chunk;

    // Schedule update on next animation frame if not already scheduled
    if (!state._rafId) {
      state._rafId = requestAnimationFrame(() => {
        const buffered = state._streamBuffer || "";
        state._streamBuffer = "";
        state._rafId = undefined;
        set((s) => ({ streamingContent: s.streamingContent + buffered }));
      });
    }
  },

  finalizeStreaming: (messageId) => {
    const state = get() as ChatState & { _streamBuffer?: string; _rafId?: number };

    // Cancel any pending animation frame
    if (state._rafId) {
      cancelAnimationFrame(state._rafId);
      state._rafId = undefined;
    }

    // Flush any remaining buffer
    const finalContent = state.streamingContent + (state._streamBuffer || "");
    state._streamBuffer = "";

    set((s) => ({
      isStreaming: false,
      streamingContent: "",
      messages: [
        ...s.messages,
        {
          id: messageId,
          role: "assistant",
          content: finalContent,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  clearMessages: () => set({ messages: [], currentConversationId: null }),

  resetForProject: () =>
    set({
      currentConversationId: null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
      conversations: [],
    }),
}));
