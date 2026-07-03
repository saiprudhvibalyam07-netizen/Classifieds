import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { conversationService } from '../services/conversationService'
import { realtimeService } from '../services/realtimeService'

export function useUnreadCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0)
      return
    }

    try {
      const total = await conversationService.fetchUnreadCount(user.id)
      if (mountedRef.current) setCount(total)
    } catch {
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    mountedRef.current = true
    refresh()

    const unsubConversations = realtimeService.subscribeToConversations(user.id, refresh)
    const unsubReads = realtimeService.subscribeToMessageReads(user.id, refresh)

    return () => {
      mountedRef.current = false
      unsubConversations()
      unsubReads()
    }
  }, [user, refresh])

  return { count, error: null, refresh }
}
