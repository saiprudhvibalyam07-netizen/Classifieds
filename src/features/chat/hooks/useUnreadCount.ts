import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { chatApi } from '../api/chatApi'
import { subscribeToUnread } from '../api/chatSubscriptions'

export function useUnreadCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0)
      return
    }

    try {
      const total = await chatApi.fetchUnreadCount(user.id)
      if (mountedRef.current) setCount(total)
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch unread count')
      }
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    mountedRef.current = true
    refresh()

    const unsubscribe = subscribeToUnread(user.id, refresh)

    function onRefresh() { refresh() }
    window.addEventListener('unread-refresh', onRefresh)

    return () => {
      mountedRef.current = false
      unsubscribe()
      window.removeEventListener('unread-refresh', onRefresh)
    }
  }, [user, refresh])

  return { count, error, refresh }
}
