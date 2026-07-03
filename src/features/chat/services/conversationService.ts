import { supabase } from '../../../lib/supabase'
import type { ChatConversation, Page } from '../types'

const PAGE_SIZE = 25

const CONVERSATION_SELECT = '*, listing:listings(*, images:listing_images(id, url)), buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url), seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)'

export const conversationService = {
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
  },

  async fetchConversationById(id: string): Promise<ChatConversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as unknown as ChatConversation | null
  },

  async findOrCreate(listingId: string, buyerId: string, sellerId: string): Promise<ChatConversation> {
    const { data: existing } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .maybeSingle()

    if (existing) return existing as unknown as ChatConversation

    const { data: created, error: insertError } = await supabase
      .from('conversations')
      .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
      .select(CONVERSATION_SELECT)
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: retry } = await supabase
          .from('conversations')
          .select(CONVERSATION_SELECT)
          .eq('listing_id', listingId)
          .eq('buyer_id', buyerId)
          .maybeSingle()

        if (retry) return retry as unknown as ChatConversation
      }
      throw new Error(insertError.message)
    }

    return created as unknown as ChatConversation
  },

  async deleteConversation(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  async markRead(conversationId: string, userId: string): Promise<void> {
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)

    if (!unreadMessages || unreadMessages.length === 0) return

    const reads = unreadMessages.map((m) => ({
      message_id: m.id,
      profile_id: userId,
    }))

    const { error } = await supabase
      .from('message_reads')
      .upsert(reads, { onConflict: 'message_id,profile_id', ignoreDuplicates: true })

    if (error) throw new Error(error.message)
  },

  async fetchUnreadIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase.rpc('chat_unread_conversation_ids', { p_user_id: userId })

    if (error) throw new Error(error.message)
    return new Set((data ?? []).map((r: { conversation_id: string }) => r.conversation_id))
  },

  async fetchUnreadCount(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('chat_unread_count', { p_user_id: userId })

    if (error) throw new Error(error.message)
    return data ?? 0
  },
}
