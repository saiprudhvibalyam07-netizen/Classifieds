import { create } from 'zustand'
import type { Toast } from '../types'

interface ChatStore {
  activeConversationId: string | null
  showConversationList: boolean
  typingUsers: Record<string, string[]>
  toasts: Toast[]
  presence: Record<string, 'online' | 'away' | 'offline'>

  setActiveConversation: (id: string | null) => void
  setShowConversationList: (show: boolean) => void
  setTyping: (convId: string, userId: string, isTyping: boolean) => void
  addToast: (toast: Toast | Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setPresence: (userId: string, status: 'online' | 'away' | 'offline') => void
  removePresence: (userId: string) => void
  clearPresence: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  activeConversationId: null,
  showConversationList: true,
  typingUsers: {},
  toasts: [],
  presence: {},

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setShowConversationList: (show) => set({ showConversationList: show }),

  setTyping: (convId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[convId] ?? []
      const next = isTyping
        ? current.includes(userId) ? current : [...current, userId]
        : current.filter((id) => id !== userId)
      return { typingUsers: { ...state.typingUsers, [convId]: next } }
    }),

  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, 'id' in toast ? toast : { ...toast, id: crypto.randomUUID() }],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setPresence: (userId, status) =>
    set((state) => ({
      presence: { ...state.presence, [userId]: status },
    })),

  removePresence: (userId) =>
    set((state) => {
      const next = { ...state.presence }
      delete next[userId]
      return { presence: next }
    }),

  clearPresence: () => set({ presence: {} }),
}))
