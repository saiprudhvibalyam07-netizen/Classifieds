import type { ChatConversation, ChatMessage, NotificationEvent } from '../types'

export interface Page<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface IChatApi {
  fetchConversations(userId: string, cursor?: string): Promise<Page<ChatConversation>>
  fetchConversationById(id: string): Promise<ChatConversation | null>
  fetchConversationByParticipants(listingId: string, buyerId: string, sellerId: string): Promise<ChatConversation | null>
  fetchConversationIds(userId: string): Promise<string[]>
  fetchUnreadConversationIds(userId: string): Promise<Set<string>>
  fetchUnreadCount(userId: string): Promise<number>
  fetchMessages(conversationId: string, cursor?: string): Promise<Page<ChatMessage>>
  fetchNotifications(userId: string): Promise<NotificationEvent[]>
}

export interface IChatMutations {
  createConversation(listingId: string, buyerId: string, sellerId: string): Promise<ChatConversation>
  deleteConversation(id: string): Promise<void>
  sendMessage(conversationId: string, senderId: string, content: string, attachments?: { type: string; url: string; name: string; size: number; storage_path: string; mime_type: string }[]): Promise<ChatMessage>
  editMessage(id: string, senderId: string, newContent: string): Promise<void>
  deleteMessage(id: string, senderId: string): Promise<void>
  markConversationRead(conversationId: string, userId: string): Promise<void>
  uploadFile(bucket: string, path: string, file: File): Promise<{ publicUrl: string; signedUrl: string; path: string }>
  updatePresence(userId: string, status: string): Promise<void>
  markNotificationRead(notificationId: string, userId: string): Promise<void>
}
