import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { chatApi } from '../api/chatApi'
import { chatMutations } from '../api/chatMutations'
import { subscribeToMessages } from '../api/chatSubscriptions'
import type { ChatMessage } from '../types'
import { generateStoragePath, validateFile } from '../utils/uploadUtils'
import { useChatStore } from '../state/chatStore'
import { useOfflineQueue } from './useOfflineQueue'

export function useMessages(conversationId: string | null) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const addToast = useChatStore((s) => s.addToast)
  const mountedRef = useRef(true)
  const { enqueue, isOnline } = useOfflineQueue()

  const loadMessages = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const page = await chatApi.fetchMessages(id)
      if (mountedRef.current) {
        setMessages(page.data)
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
        addToast({ type: 'error', message: 'Failed to load messages' })
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [addToast])

  const loadingOlderRef = useRef(false)

  const loadOlder = useCallback(async () => {
    if (!conversationId || !nextCursor || loadingOlderRef.current) return

    loadingOlderRef.current = true
    setLoadingOlder(true)
    setError(null)

    try {
      const page = await chatApi.fetchMessages(conversationId, nextCursor)
      if (mountedRef.current) {
        setMessages((prev) => [...page.data, ...prev])
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load older messages')
        addToast({ type: 'error', message: 'Failed to load older messages' })
      }
    } finally {
      if (mountedRef.current) {
        loadingOlderRef.current = false
        setLoadingOlder(false)
      }
    }
  }, [conversationId, nextCursor, addToast])

  useEffect(() => {
    mountedRef.current = true

    if (!conversationId || !user) {
      setMessages([])
      setLoading(false)
      return
    }

    loadMessages(conversationId)
    chatMutations.markConversationRead(conversationId, user.id).catch(() => {})

    const unsubscribe = subscribeToMessages(
      conversationId,
      (payload) => {
        if (mountedRef.current) {
          const newMsg = payload.new as unknown as ChatMessage
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg])
        }
      },
      (payload) => {
        if (mountedRef.current) {
          const updated = payload.new as unknown as ChatMessage
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        }
      },
      (payload) => {
        if (mountedRef.current) {
          const deletedId = (payload.old as Record<string, unknown>).id as string
          setMessages((prev) => prev.filter((m) => m.id !== deletedId))
        }
      }
    )

    return () => {
      mountedRef.current = false
      unsubscribe()
    }
  }, [conversationId, user?.id, loadMessages])

  const send = useCallback(async (text: string, oldAttachments?: { type: 'image' | 'file'; url: string; name: string; size: number; storage_path: string; mime_type: string }[]) => {
    if (!conversationId || !user) {
      addToast({ type: 'error', message: 'Cannot send message' })
      return
    }

    const trimmed = text.trim()
    if (!trimmed && (!oldAttachments || oldAttachments.length === 0)) return

    if (!isOnline) {
      const queueAttachments = oldAttachments?.map((a) => ({
        type: a.type,
        url: a.url,
        name: a.name,
        size: a.size,
        storage_path: a.storage_path,
        mime_type: a.mime_type,
      }))
      const hasImage = oldAttachments?.some((a) => a.type === 'image')
      await enqueue('send_message', {
        conversation_id: conversationId,
        sender_id: user.id,
        message: trimmed || '',
        content: trimmed || null,
        type: oldAttachments && oldAttachments.length > 0 ? (hasImage ? 'image' : 'file') : 'text',
        metadata: {},
        attachments: queueAttachments,
      })
      addToast({ type: 'info', message: 'Message queued — you are offline' })
      return
    }

    setSending(true)
    setError(null)

    try {
      const data = await chatMutations.sendMessage(conversationId, user.id, trimmed, oldAttachments)
      if (mountedRef.current) {
        setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data])
      }
      window.dispatchEvent(new CustomEvent('unread-refresh'))
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
        addToast({ type: 'error', message: 'Failed to send message. Please try again.' })
      }
    } finally {
      if (mountedRef.current) setSending(false)
    }
  }, [conversationId, user, addToast, enqueue, isOnline])

  const edit = useCallback(async (messageId: string, newText: string): Promise<boolean> => {
    if (!user || !newText.trim()) return false

    try {
      await chatMutations.editMessage(messageId, user.id, newText)
      if (mountedRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, message: newText.trim(), updated_at: new Date().toISOString() } : m
          )
        )
      }
      return true
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to edit message')
        addToast({ type: 'error', message: 'Failed to edit message' })
      }
      return false
    }
  }, [user, addToast])

  const remove = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user) return false

    try {
      await chatMutations.deleteMessage(messageId, user.id)
      if (mountedRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
      }
      return true
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete message')
        addToast({ type: 'error', message: 'Failed to delete message' })
      }
      return false
    }
  }, [user, addToast])

  const upload = useCallback(async (file: File): Promise<{ type: 'image' | 'file'; url: string; name: string; size: number; storage_path: string; mime_type: string } | null> => {
    if (!conversationId) return null

    const isImage = file.type.startsWith('image/')

    const validation = validateFile(file, isImage)
    if (!validation.valid) {
      addToast({ type: 'error', message: validation.error! })
      return null
    }

    try {
      const bucket = isImage ? 'chat-images' : 'chat-files'
      const path = generateStoragePath(conversationId, file.name)
      const result = await chatMutations.uploadFile(bucket, path, file)

      return {
        type: isImage ? 'image' : 'file',
        url: result.signedUrl,
        name: file.name,
        size: file.size,
        storage_path: result.path,
        mime_type: file.type,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      if (mountedRef.current) {
        addToast({ type: 'error', message: `Upload failed: ${msg}` })
      }
      return null
    }
  }, [conversationId, addToast])

  return {
    messages,
    loading,
    loadingOlder,
    error,
    sending,
    hasMore,
    send,
    edit,
    remove,
    upload,
    loadOlder,
    retry: () => conversationId ? loadMessages(conversationId) : undefined,
  }
}
