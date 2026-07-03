import { supabase } from '../../../lib/supabase'
import type { ChatMessage, MessageAttachmentRow, MessageReaction, Page } from '../types'
import { MESSAGE_TYPES, typeFromAttachments } from '../constants'

const PAGE_SIZE = 25

const MESSAGE_SELECT = '*, profile:profiles!messages_sender_id_fkey(id, full_name, avatar_url), message_attachments(*), reply_message:reply_to(id, sender_id, message, content, created_at, profile:profiles!messages_sender_id_fkey(id, full_name, avatar_url))'

interface AttachmentInput {
  type: string
  url: string
  name: string
  size: number
  storage_path: string
  mime_type: string
  width?: number
  height?: number
}

export const messageService = {
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

    const withReactions = await this.loadReactionsForMessages(items.map(m => m.id))

    const enriched = items.map(msg => ({
      ...msg,
      reactions: withReactions.get(msg.id) || [],
    }))

    const nextCursor = items.length > 0 ? items[items.length - 1].created_at : null

    return { data: enriched.reverse(), nextCursor, hasMore }
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    attachments?: AttachmentInput[],
    replyTo?: string | null,
  ): Promise<ChatMessage> {
    const messageText = content.trim().slice(0, 1000)

    let messageType: string = MESSAGE_TYPES.TEXT
    if (attachments && attachments.length > 0) {
      messageType = typeFromAttachments(attachments.map(a => a.type))
    }

    const payload: Record<string, unknown> = {
      conversation_id: conversationId,
      sender_id: senderId,
      message: messageText || '',
      content: messageText || null,
      type: messageType,
      metadata: {},
    }

    if (replyTo) {
      payload.reply_to = replyTo
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert(payload)
      .select('*, profile:profiles!messages_sender_id_fkey(id, full_name, avatar_url), message_attachments(*)')
      .single()

    if (error) throw new Error(error.message)

    let result = message as unknown as ChatMessage

    if (attachments && attachments.length > 0) {
      const attachmentRows = attachments.map((att) => ({
        message_id: result.id,
        type: att.type,
        storage_path: att.storage_path,
        public_url: att.url,
        filename: att.name,
        mime_type: att.mime_type,
        size_bytes: att.size,
        width: 'width' in att ? (att as AttachmentInput).width ?? null : null,
        height: 'height' in att ? (att as AttachmentInput).height ?? null : null,
      }))

      const { data: inserted, error: attError } = await supabase
        .from('message_attachments')
        .insert(attachmentRows)
        .select()

      if (attError) throw new Error(attError.message)

      result.message_attachments = inserted as unknown as MessageAttachmentRow[]
    }

    return result
  },

  async editMessage(id: string, senderId: string, newContent: string): Promise<void> {
    const trimmed = newContent.trim().slice(0, 1000)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('messages')
      .update({ message: trimmed, content: trimmed, is_edited: true, edited_at: now })
      .eq('id', id)
      .eq('sender_id', senderId)

    if (error) throw new Error(error.message)
  },

  async deleteMessage(id: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, message: '', content: null })
      .eq('id', id)
      .eq('sender_id', senderId)

    if (error) throw new Error(error.message)
  },

  async deleteForEveryone(id: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('sender_id', senderId)

    if (error) throw new Error(error.message)
  },

  async addReaction(messageId: string, profileId: string, emoji: string): Promise<void> {
    const { error } = await supabase
      .from('message_reactions')
      .upsert(
        { message_id: messageId, profile_id: profileId, emoji },
        { onConflict: 'message_id,profile_id,emoji', ignoreDuplicates: true }
      )

    if (error) throw new Error(error.message)
  },

  async removeReaction(messageId: string, profileId: string, emoji: string): Promise<void> {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('profile_id', profileId)
      .eq('emoji', emoji)

    if (error) throw new Error(error.message)
  },

  async fetchReactions(messageId: string): Promise<MessageReaction[]> {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)

    if (error) throw new Error(error.message)
    return (data ?? []) as MessageReaction[]
  },

  async loadReactionsForMessages(messageIds: string[]): Promise<Map<string, MessageReaction[]>> {
    if (messageIds.length === 0) return new Map()

    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds)

    if (error) throw new Error(error.message)

    const map = new Map<string, MessageReaction[]>()
    for (const reaction of (data ?? []) as MessageReaction[]) {
      const existing = map.get(reaction.message_id) || []
      existing.push(reaction)
      map.set(reaction.message_id, existing)
    }
    return map
  },

  async fetchMessage(id: string): Promise<ChatMessage | null> {
    if (!id) return null
    const { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as unknown as ChatMessage | null
  },

  async fetchReplyMessage(messageId: string): Promise<ChatMessage | null> {
    if (!messageId) return null
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, message, content, created_at, profile:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
      .eq('id', messageId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as unknown as ChatMessage | null
  },

  async searchMessages(conversationId: string, query: string): Promise<{ messageId: string; content: string; createdAt: string }[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, message, content, created_at')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .ilike('message', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    return (data ?? []).map(m => ({
      messageId: m.id,
      content: m.message || m.content || '',
      createdAt: m.created_at,
    }))
  },
}
