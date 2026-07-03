import type { MessageType, AttachmentType, MessageStatus } from './constants'

export interface ChatConversation {
  id: string
  listing_id: string | null
  buyer_id: string
  seller_id: string
  title: string | null
  is_group: boolean
  last_message: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
  listing?: Record<string, unknown>
  buyer?: { id: string; full_name: string | null; avatar_url: string | null }
  seller?: { id: string; full_name: string | null; avatar_url: string | null }
}

export interface MessageAttachmentRow {
  id: string
  message_id: string
  type: AttachmentType
  storage_path: string
  public_url: string
  filename: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  thumbnail_url: string | null
  thumbnail_width: number | null
  thumbnail_height: number | null
  blur_hash: string | null
  file_hash: string | null
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'error'
  created_at: string
  sort_order: number
}

export interface MessageReaction {
  id: string
  message_id: string
  profile_id: string
  emoji: string
  created_at: string
}

export interface MessageReactionGroup {
  emoji: string
  count: number
  hasReacted: boolean
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  message_attachments: MessageAttachmentRow[]
  is_read: boolean
  type: MessageType | null
  content: string | null
  metadata: Record<string, unknown>
  reply_to: string | null
  is_deleted: boolean
  is_edited: boolean
  edited_at: string | null
  updated_at: string | null
  created_at: string
  profile?: { id: string; full_name: string | null; avatar_url: string | null }
  reply_message?: ChatMessage | null
  reactions?: MessageReaction[]
  status?: MessageStatus
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

export interface Page<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface AttachmentUpload {
  id: string
  file: File
  type: AttachmentType
  previewUrl?: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  result?: {
    type: AttachmentType
    url: string
    name: string
    size: number
    storage_path: string
    mime_type: string
  }
  error?: string
}

export interface ReplyInfo {
  messageId: string
  senderName: string
  content: string
}

export interface ConversationSearchResult {
  messageId: string
  content: string
  createdAt: string
  matchIndex: number
}
