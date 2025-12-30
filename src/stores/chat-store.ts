import { create } from "zustand";
import type { ChatMessage, Conversation } from "@/types";

interface ChatState {
  // Current conversation
  currentConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;

  // Conversations list
  conversations: Conversation[];

  // Actions
  setCurrentConversation: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  startStreaming: () => void;
  appendToStreaming: (chunk: string) => void;
  finalizeStreaming: (messageId: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
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

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  startStreaming: () => set({ isStreaming: true, streamingContent: "" }),

  appendToStreaming: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  finalizeStreaming: (messageId) => {
    const content = get().streamingContent;
    set((state) => ({
      isStreaming: false,
      streamingContent: "",
      messages: [
        ...state.messages,
        {
          id: messageId,
          role: "assistant",
          content,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  clearMessages: () => set({ messages: [], currentConversationId: null }),
}));
