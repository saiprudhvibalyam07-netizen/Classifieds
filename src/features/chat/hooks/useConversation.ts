import { useEffect, useState } from 'react'
import { conversationService } from '../services/conversationService'
import type { ChatConversation } from '../types'

export function useConversation(conversationId: string | null) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId) {
      setConversation(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    conversationService.fetchConversationById(conversationId)
      .then((data) => {
        if (!cancelled) {
          setConversation(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load conversation')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [conversationId])

  return { conversation, loading, error }
}
