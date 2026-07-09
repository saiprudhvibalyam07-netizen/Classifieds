import { useEffect } from 'react'
import { useChatContext } from '../contexts/ChatContext'
import { useChatAuth } from './useChatAuth'
import { conversationManager } from '../services/conversationManager'
import { CHATBOT_CONFIG } from '../config'

export function useChat() {
  const chat = useChatContext()
  const { userId, sessionId, role, isAuthenticated } = useChatAuth()

  useEffect(() => {
    if (!CHATBOT_CONFIG.enabled) return

    // Same user closing/reopening the widget: the conversation already lives in
    // state (the provider is keyed by identity and stays mounted), so there is
    // nothing to reload — keep it visible immediately, with no loading flicker.
    if (chat.conversation && chat.conversation.userId === userId) return

    let cancelled = false

    async function init() {
      const existing = await conversationManager.getActiveConversation(userId)
      if (cancelled) return
      // Ownership guard: only reuse a conversation that actually belongs to the
      // current user. A mismatched row (or stale/empty state) must never render.
      const owned = existing && existing.userId === userId ? existing : null
      if (owned) {
        const messages = await conversationManager.getMessages(owned.id)
        if (!cancelled) {
          chat.restoreConversation(owned, messages)
        }
      } else {
        await chat.startNewConversation(role)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [userId, role])

  return {
    ...chat,
    userId,
    sessionId,
    role,
    isAuthenticated,
  }
}
