import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { conversationService } from '../services/conversationService'
import { realtimeService } from '../services/realtimeService'
import type { ChatConversation } from '../types'

export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const mountedRef = useRef(true)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setConversations([])
      setUnreadIds(new Set())
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [page, unreadData] = await Promise.all([
        conversationService.fetchConversations(user.id),
        conversationService.fetchUnreadIds(user.id),
      ])
      if (mountedRef.current) {
        setConversations(page.data)
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
        setUnreadIds(unreadData)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [user])

  const loadMore = useCallback(async () => {
    if (!user || !nextCursor || loadingMore) return

    setLoadingMore(true)
    setError(null)

    try {
      const page = await conversationService.fetchConversations(user.id, nextCursor)
      if (mountedRef.current) {
        setConversations((prev) => [...prev, ...page.data])
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load more conversations')
      }
    } finally {
      if (mountedRef.current) setLoadingMore(false)
    }
  }, [user, nextCursor, loadingMore])

  useEffect(() => {
    mountedRef.current = true
    fetchAll()

    let unsubscribe: (() => void) | null = null
    if (user) {
      unsubscribe = realtimeService.subscribeToConversations(user.id, () => { fetchAll() })
    }

    return () => {
      mountedRef.current = false
      if (unsubscribe) unsubscribe()
    }
  }, [user, fetchAll])

  const refreshUnread = useCallback(async () => {
    if (!user) return
    try {
      const ids = await conversationService.fetchUnreadIds(user.id)
      if (mountedRef.current) setUnreadIds(ids)
    } catch {
    }
  }, [user])

  return {
    conversations,
    loading,
    loadingMore,
    error,
    unreadIds,
    hasMore,
    refetch: fetchAll,
    loadMore,
    refreshUnread,
  }
}
