import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { useChatStore } from '../state/chatStore'

type TypingPayload = { type: 'typing' | 'stopped_typing'; userId: string }

export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth()
  const setTyping = useChatStore((s) => s.setTyping)
  const lastBroadcastRef = useRef(0)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!conversationId || !user) return

    const channel = supabase.channel(`typing-${conversationId}`)
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingPayload
        if (data.userId !== user.id) {
          setTyping(conversationId, data.userId, true)
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
          typingTimerRef.current = setTimeout(() => setTyping(conversationId, data.userId, false), 5000)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [conversationId, user, setTyping])

  const broadcastTyping = useCallback(() => {
    if (!conversationId || !user) return

    const now = Date.now()
    if (now - lastBroadcastRef.current > 2000) {
      lastBroadcastRef.current = now
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { type: 'typing', userId: user.id } satisfies TypingPayload,
      })
    }

    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { type: 'stopped_typing', userId: user.id } satisfies TypingPayload,
      })
    }, 3000)
  }, [conversationId, user])

  const stopTyping = useCallback(() => {
    if (!conversationId || !user) return

    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { type: 'stopped_typing', userId: user.id } satisfies TypingPayload,
    })
  }, [conversationId, user])

  return { broadcastTyping, stopTyping }
}
