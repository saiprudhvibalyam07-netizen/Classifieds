import { supabase } from '../../../lib/supabase'
import type { ChatConversation, ChatMessage, NotificationEvent } from '../types'
import type { IChatApi, Page } from './chatRepository'

const PAGE_SIZE = 25

const CONVERSATION_SELECT = '*, listing:listings(*, images:listing_images(id, url)), buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url), seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)'

const MESSAGE_SELECT = '*, profile:profiles!messages_sender_id_fkey(id, full_name, avatar_url), message_attachments(*)'

class SupabaseChatApi implements IChatApi {
  async fetchConversations(userId: string, cursor?: string): Promise<Page<ChatConversation>> {
    let query = supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (cursor) {
      query = query.lt('updated_at', cursor)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const results = (data ?? []) as unknown as ChatConversation[]
    const hasMore = results.length > PAGE_SIZE
    const items = hasMore ? results.slice(0, PAGE_SIZE) : results
    const nextCursor = items.length > 0 ? items[items.length - 1].updated_at : null

    return { data: items, nextCursor, hasMore }
  }

  async fetchConversationById(id: string): Promise<ChatConversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as unknown as ChatConversation | null
  }

  async fetchConversationByParticipants(
    listingId: string,
    buyerId: string,
    sellerId: string
  ): Promise<ChatConversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .eq('seller_id', sellerId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as unknown as ChatConversation | null
  }

  async fetchConversationIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .limit(1000)

    if (error) throw new Error(error.message)
    return data?.map((c) => c.id) ?? []
  }

  async fetchUnreadConversationIds(userId: string): Promise<Set<string>> {
    const convIds = await this.fetchConversationIds(userId)
    if (convIds.length === 0) return new Set()

    const { data: readRows } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('profile_id', userId)

    const readIds = new Set(readRows?.map((r) => r.message_id) ?? [])

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .neq('sender_id', userId)
      .in('conversation_id', convIds)
      .limit(5000)

    if (error) throw new Error(error.message)

    const unreadConvs = new Set<string>()
    for (const msg of messages ?? []) {
      if (!readIds.has(msg.id)) {
        unreadConvs.add(msg.conversation_id)
      }
    }
    return unreadConvs
  }

  async fetchUnreadCount(userId: string): Promise<number> {
    const convIds = await this.fetchConversationIds(userId)
    if (convIds.length === 0) return 0

    const { data: readRows } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('profile_id', userId)

    const readIds = new Set(readRows?.map((r) => r.message_id) ?? [])

    const { data: allMessages, error } = await supabase
      .from('messages')
      .select('id')
      .neq('sender_id', userId)
      .in('conversation_id', convIds)
      .limit(5000)

    if (error) throw new Error(error.message)
    if (!allMessages) return 0

    const unread = allMessages.filter((m) => !readIds.has(m.id))
    return unread.length
  }

  async fetchMessages(conversationId: string, cursor?: string): Promise<Page<ChatMessage>> {
    let query = supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const results = (data ?? []) as unknown as ChatMessage[]
    const hasMore = results.length > PAGE_SIZE
    const items = hasMore ? results.slice(0, PAGE_SIZE) : results
    const nextCursor = items.length > 0 ? items[items.length - 1].created_at : null

    return { data: items.reverse(), nextCursor, hasMore }
  }

  async fetchNotifications(userId: string): Promise<NotificationEvent[]> {
    const { data, error } = await supabase
      .from('notification_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)
    return data ?? []
  }
}

export const chatApi: IChatApi = new SupabaseChatApi()
