import { supabase } from '../../../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type Unsubscribe = () => void

export function subscribeToConversations(
  userId: string,
  onChange: () => void
): Unsubscribe {
  const channel = supabase
    .channel(`conversations-updates-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversations', filter: `seller_id=eq.${userId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `seller_id=eq.${userId}` },
      onChange
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export function subscribeToMessages(
  conversationId: string,
  onInsert: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  onUpdate: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  onDelete: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
): Unsubscribe {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      onInsert
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      onUpdate
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      onDelete
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export function subscribeToUnread(userId: string, onChange: () => void): Unsubscribe {
  const channel = supabase
    .channel(`unread-count-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'message_reads' },
      onChange
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}


