export type NotificationType =
  | 'new_message' | 'offer_received' | 'offer_accepted' | 'offer_rejected'
  | 'offer_countered' | 'listing_shared' | 'mention' | 'reaction'
  | 'conversation_added' | 'message_edited' | 'message_deleted'

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
  type: 'image' | 'file' | 'voice'
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

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  message_attachments: MessageAttachmentRow[]
  is_read: boolean
  type: 'text' | 'image' | 'file' | 'system' | 'offer' | 'listing_share' | 'call_start' | 'call_end' | 'call_missed' | null
  content: string | null
  metadata: Record<string, unknown>
  is_deleted: boolean
  updated_at: string | null
  created_at: string
  profile?: { id: string; full_name: string | null; avatar_url: string | null }
}

export interface NotificationEvent {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}
