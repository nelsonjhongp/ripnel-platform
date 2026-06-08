import { create } from 'zustand';
import * as api from '@/lib/api-chatbot';

export type ChatMessage = api.ChatMessage;
export type ChatConversation = api.ChatConversation;

interface ChatStore {
  isOpen: boolean;
  isMaximized: boolean;
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  toggleMaximize: () => void;
  setMaximized: (maximized: boolean) => void;
  setActiveConversation: (id: string) => Promise<void>;
  sendMessage: (prompt: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen: false,
  isMaximized: false,
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,

  toggleOpen: () => {
    const next = !get().isOpen;
    set({ isOpen: next });
    if (next && get().conversations.length === 0) {
      get().loadConversations();
    }
  },

  setOpen: (open) => {
    set({ isOpen: open });
    if (open && get().conversations.length === 0) {
      get().loadConversations();
    }
  },

  toggleMaximize: () => set((s) => ({ isMaximized: !s.isMaximized })),

  setMaximized: (maximized) => set({ isMaximized: maximized }),

  setActiveConversation: async (id) => {
    set({ activeConversationId: id, isLoadingMessages: true, error: null });
    try {
      const messages = await api.getMessages(id);
      set({ messages, isLoadingMessages: false });
    } catch {
      set({ error: 'Error al cargar mensajes', isLoadingMessages: false });
    }
  },

  sendMessage: async (prompt) => {
    const { activeConversationId, isSending } = get();
    if (isSending || !prompt.trim()) return;

    set({ isSending: true, error: null });

    const tempUserMsg: ChatMessage = {
      message_id: `temp-${Date.now()}`,
      role: 'user',
      content: prompt,
      metadata: null,
      created_at: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, tempUserMsg],
      isSending: true,
    }));

    try {
      const result = await api.sendMessage(activeConversationId, prompt);

      const assistantMsg: ChatMessage = {
        message_id: result.message_id,
        role: 'assistant',
        content: result.response,
        metadata: result.cached ? { cached: true } : null,
        created_at: new Date().toISOString(),
      };

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        activeConversationId: result.conversation_id,
        isSending: false,
        isOpen: true,
      }));

      get().loadConversations();
    } catch (err) {
      set({
        isSending: false,
        error: err instanceof Error ? err.message : 'Error al enviar mensaje',
        messages: get().messages.slice(0, -1),
      });
    }
  },

  loadConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const conversations = await api.getConversations();
      set({ conversations, isLoadingConversations: false });
    } catch {
      set({ error: 'Error al cargar conversaciones', isLoadingConversations: false });
    }
  },

  deleteConversation: async (id) => {
    try {
      await api.deleteConversationApi(id);
      const { activeConversationId } = get();
      set((s) => ({
        conversations: s.conversations.filter((c) => c.conversation_id !== id),
        activeConversationId:
          activeConversationId === id ? null : activeConversationId,
        messages: activeConversationId === id ? [] : s.messages,
      }));
    } catch {
      set({ error: 'Error al eliminar conversacion' });
    }
  },

  clearError: () => set({ error: null }),
}));
