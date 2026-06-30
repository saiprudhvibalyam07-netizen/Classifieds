import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { chatApi } from '../api/chatApi'
import { chatMutations } from '../api/chatMutations'
import { subscribeToConversations } from '../api/chatSubscriptions'
import { useChatStore } from '../state/chatStore'
import type { ChatConversation } from '../types'

export function useConversations() {
  const { user } = useAuth()
  const addToast = useChatStore((s) => s.addToast)
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
        chatApi.fetchConversations(user.id),
        chatApi.fetchUnreadConversationIds(user.id),
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
      const page = await chatApi.fetchConversations(user.id, nextCursor)
      if (mountedRef.current) {
        setConversations((prev) => [...prev, ...page.data])
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load more conversations')
        addToast({ type: 'error', message: 'Failed to load more conversations' })
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
      unsubscribe = subscribeToConversations(user.id, () => { fetchAll() })
    }

    return () => {
      mountedRef.current = false
      if (unsubscribe) unsubscribe()
    }
  }, [user, fetchAll])

  const markConversationRead = useCallback((conversationId: string) => {
    setUnreadIds((prev) => {
      const next = new Set(prev)
      next.delete(conversationId)
      return next
    })
  }, [])

  const removeConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      await chatMutations.deleteConversation(conversationId)
      if (mountedRef.current) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      }
      return true
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete conversation')
        addToast({ type: 'error', message: 'Failed to delete conversation' })
      }
      return false
    }
  }, [])

  const getConversationById = useCallback(async (id: string): Promise<ChatConversation | null> => {
    try {
      return await chatApi.fetchConversationById(id)
    } catch {
      return null
    }
  }, [])

  return {
    conversations,
    loading,
    loadingMore,
    error,
    unreadIds,
    hasMore,
    refetch: fetchAll,
    loadMore,
    deleteConversation: removeConversation,
    markConversationRead,
    getConversationById,
  }
}
