import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { messageService } from '../services/messageService'
import { realtimeService } from '../services/realtimeService'
import type { ChatMessage } from '../types'
import { MESSAGE_STATUS } from '../constants'

export interface UseMessagesReturn {
  messages: ChatMessage[]
  loading: boolean
  loadingOlder: boolean
  error: string | null
  sending: boolean
  hasMore: boolean
  send: (text: string, attachments?: { type: string; url: string; name: string; size: number; storage_path: string; mime_type: string }[], replyTo?: string | null) => void
  loadOlder: () => void
  editMessage: (messageId: string, newContent: string) => Promise<void>
  deleteMessage: (messageId: string, forEveryone?: boolean) => Promise<void>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>
  refreshMessage: (messageId: string) => void
}

export function useMessages(conversationId: string | null): UseMessagesReturn {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const mountedRef = useRef(true)
  const loadingOlderRef = useRef(false)

  const loadMessages = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const page = await messageService.fetchMessages(id)
      if (mountedRef.current) {
        setMessages(page.data)
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const loadOlder = useCallback(async () => {
    if (!conversationId || !nextCursor || loadingOlderRef.current) return

    loadingOlderRef.current = true
    setLoadingOlder(true)
    setError(null)

    try {
      const page = await messageService.fetchMessages(conversationId, nextCursor)
      if (mountedRef.current) {
        setMessages((prev) => [...page.data, ...prev])
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load older messages')
      }
    } finally {
      if (mountedRef.current) {
        loadingOlderRef.current = false
        setLoadingOlder(false)
      }
    }
  }, [conversationId, nextCursor])

  const handleRealtimeReaction = useCallback((msgId: string) => {
    messageService.fetchReactions(msgId).then((reactions) => {
      if (mountedRef.current) {
        setMessages((prev) => prev.map((m) =>
          m.id === msgId ? { ...m, reactions } : m
        ))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    mountedRef.current = true

    if (!conversationId || !user) {
      setMessages([])
      setLoading(false)
      return
    }

    loadMessages(conversationId)

    const unsubscribe = realtimeService.subscribeToMessages(
      conversationId,
      async (payload) => {
        if (!mountedRef.current) return
        const raw = payload.new as Record<string, unknown>
        const newId = raw.id as string
        setMessages((prev) => {
          const existing = prev.find((m) => m.id === newId)
          if (existing) {
            return prev.map((m) =>
              m.id === newId
                ? { ...m, ...raw, status: MESSAGE_STATUS.DELIVERED }
                : m
            )
          }
          return [...prev, { ...raw, status: MESSAGE_STATUS.DELIVERED } as unknown as ChatMessage]
        })
        const hydrated = await messageService.fetchMessage(newId)
        if (mountedRef.current && hydrated) {
          setMessages((prev) => prev.map((m) =>
            m.id === newId ? { ...hydrated, status: MESSAGE_STATUS.DELIVERED } : m
          ))
        }
      },
      (payload) => {
        if (!mountedRef.current) return
        const raw = payload.new as Record<string, unknown>
        const updatedId = raw.id as string
        setMessages((prev) => prev.map((m) =>
          m.id === updatedId ? { ...m, ...raw } : m
        ))
      },
      (payload) => {
        if (!mountedRef.current) return
        const deletedId = (payload.old as Record<string, unknown>).id as string
        setMessages((prev) => prev.filter((m) => m.id !== deletedId))
      }
    )

    const unsubReactions = realtimeService.subscribeToReactions(
      conversationId,
      (payload) => {
        if (mountedRef.current) {
          const msgId = payload.new
            ? (payload.new as Record<string, unknown>).message_id as string
            : (payload.old as Record<string, unknown>).message_id as string
          if (msgId) handleRealtimeReaction(msgId)
        }
      }
    )

    const unsubReads = realtimeService.subscribeToReadReceipts(
      conversationId,
      (payload) => {
        if (!mountedRef.current) return
        const readMsgId = (payload.new as Record<string, unknown>).message_id as string
        if (!readMsgId) return
        setMessages((prev) => prev.map((m) =>
          m.id === readMsgId ? { ...m, status: MESSAGE_STATUS.READ } : m
        ))
      }
    )

    return () => {
      mountedRef.current = false
      unsubscribe()
      unsubReactions()
      unsubReads()
    }
  }, [conversationId, user?.id, loadMessages, handleRealtimeReaction])

  const send = useCallback(async (
    text: string,
    attachments?: { type: string; url: string; name: string; size: number; storage_path: string; mime_type: string }[],
    replyTo?: string | null
  ) => {
    if (!conversationId || !user) return

    const trimmed = text.trim()
    if (!trimmed && (!attachments || attachments.length === 0)) return

    setSending(true)
    setError(null)

    try {
      const data = await messageService.sendMessage(conversationId, user.id, trimmed, attachments, replyTo)
      if (mountedRef.current) {
        setMessages((prev) => prev.some((m) => m.id === data.id)
          ? prev.map((m) => m.id === data.id ? { ...data, status: MESSAGE_STATUS.DELIVERED } : m)
          : [...prev, { ...data, status: MESSAGE_STATUS.SENT }]
        )
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
      }
    } finally {
      if (mountedRef.current) setSending(false)
    }
  }, [conversationId, user])

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user) return
    const trimmed = newContent.trim().slice(0, 1000)
    const now = new Date().toISOString()
    let snapshot: ChatMessage | undefined
    setMessages((prev) => {
      snapshot = prev.find((m) => m.id === messageId)
      return prev.map((m) =>
        m.id === messageId
          ? { ...m, message: trimmed, content: trimmed, is_edited: true, edited_at: now }
          : m
      )
    })
    try {
      await messageService.editMessage(messageId, user.id, newContent)
    } catch (err) {
      if (snapshot && mountedRef.current) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? snapshot! : m))
      }
      setError(err instanceof Error ? err.message : 'Failed to edit message')
    }
  }, [user])

  const deleteMessage = useCallback(async (messageId: string, forEveryone?: boolean) => {
    if (!user) return
    let snapshot: ChatMessage | undefined
    setMessages((prev) => {
      snapshot = prev.find((m) => m.id === messageId)
      if (forEveryone) {
        return prev.filter((m) => m.id !== messageId)
      }
      return prev.map((m) =>
        m.id === messageId
          ? { ...m, is_deleted: true, message: '', content: null }
          : m
      )
    })
    try {
      if (forEveryone) {
        await messageService.deleteForEveryone(messageId, user.id)
      } else {
        await messageService.deleteMessage(messageId, user.id)
      }
    } catch (err) {
      if (snapshot && mountedRef.current) {
        setMessages((prev) => {
          if (forEveryone) return [...prev, snapshot!]
          return prev.map((m) => m.id === messageId ? snapshot! : m)
        })
      }
      setError(err instanceof Error ? err.message : 'Failed to delete message')
    }
  }, [user])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return
    try {
      await messageService.addReaction(messageId, user.id, emoji)
    } catch {}
  }, [user])

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return
    try {
      await messageService.removeReaction(messageId, user.id, emoji)
    } catch {}
  }, [user])

  const refreshMessage = useCallback((messageId: string) => {
    handleRealtimeReaction(messageId)
  }, [handleRealtimeReaction])

  return {
    messages,
    loading,
    loadingOlder,
    error,
    sending,
    hasMore,
    send,
    loadOlder,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    refreshMessage,
  }
}
