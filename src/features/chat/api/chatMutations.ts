import { supabase } from '../../../lib/supabase'
import type { ChatConversation, ChatMessage, MessageAttachmentRow } from '../types'
import type { IChatMutations } from './chatRepository'

class SupabaseChatMutations implements IChatMutations {
  async createConversation(
    listingId: string,
    buyerId: string,
    sellerId: string
  ): Promise<ChatConversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as unknown as ChatConversation
  }

  async deleteConversation(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    attachments?: { type: string; url: string; name: string; size: number; storage_path: string; mime_type: string }[]
  ): Promise<ChatMessage> {
    const messageText = content.trim().slice(0, 1000)

    let messageType: string = 'text'
    if (attachments && attachments.length > 0) {
      const firstImage = attachments.find((a) => a.type === 'image')
      messageType = firstImage ? 'image' : 'file'
    }

    const payload: Record<string, unknown> = {
      conversation_id: conversationId,
      sender_id: senderId,
      message: messageText || '',
      content: messageText || null,
      type: messageType,
      metadata: {},
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
        message_id: message.id,
        type: att.type === 'image' ? 'image' : 'file',
        storage_path: att.storage_path,
        public_url: att.url,
        filename: att.name,
        mime_type: att.mime_type,
        size_bytes: att.size,
      }))

      const { data: inserted, error: attError } = await supabase
        .from('message_attachments')
        .insert(attachmentRows)
        .select()

      if (attError) throw new Error(attError.message)

      result.message_attachments = inserted as unknown as MessageAttachmentRow[]
    }

    return result
  }

  async editMessage(id: string, senderId: string, newContent: string): Promise<void> {
    const trimmed = newContent.trim().slice(0, 1000)
    const { error } = await supabase
      .from('messages')
      .update({ message: trimmed, content: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('sender_id', senderId)

    if (error) throw new Error(error.message)
  }

  async deleteMessage(id: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('sender_id', senderId)

    if (error) throw new Error(error.message)
  }

  async markConversationRead(conversationId: string, userId: string): Promise<void> {
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

    window.dispatchEvent(new CustomEvent('unread-refresh'))
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: File
  ): Promise<{ publicUrl: string; signedUrl: string; path: string }> {
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
    if (uploadError) throw new Error(uploadError.message)

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 7)

    if (signedError) throw new Error(signedError.message)

    return { publicUrl: signedData.signedUrl, signedUrl: signedData.signedUrl, path }
  }

  async updatePresence(userId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('user_presence')
      .upsert({ user_id: userId, status, last_seen_at: new Date().toISOString() })

    if (error && !error.message.includes('does not exist')) {
      throw new Error(error.message)
    }
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notification_events')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
  }
}

export const chatMutations: IChatMutations = new SupabaseChatMutations()
