import { supabase } from '../../../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type Unsubscribe = () => void

interface ConversationSubscriber {
  onChange: () => void
}

interface MessageSubscriber {
  onInsert: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onUpdate: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onDelete: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

interface ReactionSubscriber {
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

const conversationChannels = new Map<string, {
  channel: ReturnType<typeof supabase.channel>
  subscribers: Set<ConversationSubscriber>
}>()

const messageChannels = new Map<string, {
  channel: ReturnType<typeof supabase.channel>
  subscribers: Set<MessageSubscriber>
}>()

const reactionChannels = new Map<string, {
  channel: ReturnType<typeof supabase.channel>
  subscribers: Set<ReactionSubscriber>
}>()

function notifyConversationSubscribers(key: string) {
  const group = conversationChannels.get(key)
  if (!group) return
  for (const sub of group.subscribers) {
    sub.onChange()
  }
}

function notifyMessageInsert(key: string, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const group = messageChannels.get(key)
  if (!group) return
  for (const sub of group.subscribers) {
    sub.onInsert(payload)
  }
}

function notifyMessageUpdate(key: string, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const group = messageChannels.get(key)
  if (!group) return
  for (const sub of group.subscribers) {
    sub.onUpdate(payload)
  }
}

function notifyMessageDelete(key: string, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const group = messageChannels.get(key)
  if (!group) return
  for (const sub of group.subscribers) {
    sub.onDelete(payload)
  }
}

export const realtimeService = {
  subscribeToConversations(
    userId: string,
    onChange: () => void
  ): Unsubscribe {
    const key = `conversations-updates-${userId}`
    const subscriber: ConversationSubscriber = { onChange }

    const existing = conversationChannels.get(key)
    if (existing) {
      existing.subscribers.add(subscriber)
      return () => {
        existing.subscribers.delete(subscriber)
        if (existing.subscribers.size === 0) {
          supabase.removeChannel(existing.channel)
          conversationChannels.delete(key)
        }
      }
    }

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` },
        () => { notifyConversationSubscribers(key) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` },
        () => { notifyConversationSubscribers(key) }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `seller_id=eq.${userId}` },
        () => { notifyConversationSubscribers(key) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `seller_id=eq.${userId}` },
        () => { notifyConversationSubscribers(key) }
      )
      .subscribe()

    const group = { channel, subscribers: new Set([subscriber]) }
    conversationChannels.set(key, group)

    return () => {
      group.subscribers.delete(subscriber)
      if (group.subscribers.size === 0) {
        supabase.removeChannel(channel)
        conversationChannels.delete(key)
      }
    }
  },

  subscribeToMessages(
    conversationId: string,
    onInsert: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
    onUpdate: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
    onDelete: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  ): Unsubscribe {
    const key = `messages-${conversationId}`
    const subscriber: MessageSubscriber = { onInsert, onUpdate, onDelete }

    const existing = messageChannels.get(key)
    if (existing) {
      existing.subscribers.add(subscriber)
      return () => {
        existing.subscribers.delete(subscriber)
        if (existing.subscribers.size === 0) {
          supabase.removeChannel(existing.channel)
          messageChannels.delete(key)
        }
      }
    }

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => { notifyMessageInsert(key, payload) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => { notifyMessageUpdate(key, payload) }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => { notifyMessageDelete(key, payload) }
      )
      .subscribe()

    const group = { channel, subscribers: new Set([subscriber]) }
    messageChannels.set(key, group)

    return () => {
      group.subscribers.delete(subscriber)
      if (group.subscribers.size === 0) {
        supabase.removeChannel(channel)
        messageChannels.delete(key)
      }
    }
  },

  subscribeToReactions(
    conversationId: string,
    onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  ): Unsubscribe {
    const key = `reactions-${conversationId}`
    const subscriber: ReactionSubscriber = { onChange }

    const existing = reactionChannels.get(key)
    if (existing) {
      existing.subscribers.add(subscriber)
      return () => {
        existing.subscribers.delete(subscriber)
        if (existing.subscribers.size === 0) {
          supabase.removeChannel(existing.channel)
          reactionChannels.delete(key)
        }
      }
    }

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload) => { notifyReactionSubscribers(key, payload) }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload) => { notifyReactionSubscribers(key, payload) }
      )
      .subscribe()

    const group = { channel, subscribers: new Set([subscriber]) }
    reactionChannels.set(key, group)

    return () => {
      group.subscribers.delete(subscriber)
      if (group.subscribers.size === 0) {
        supabase.removeChannel(channel)
        reactionChannels.delete(key)
      }
    }
  },

  subscribeToMessageReads(
    userId: string,
    onChange: () => void
  ): Unsubscribe {
    const key = `message-reads-${userId}`

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads', filter: `profile_id=eq.${userId}` },
        () => { onChange() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  subscribeToReadReceipts(
    _conversationId: string,
    onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  ): Unsubscribe {
    const key = `read-receipts-${_conversationId}`

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (payload) => { onChange(payload) }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}

function notifyReactionSubscribers(key: string, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const group = reactionChannels.get(key)
  if (!group) return
  for (const sub of group.subscribers) {
    sub.onChange(payload)
  }
}
