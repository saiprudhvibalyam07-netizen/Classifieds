export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
  OFFER: 'offer',
  LISTING_SHARE: 'listing_share',
  CALL_START: 'call_start',
  CALL_END: 'call_end',
  CALL_MISSED: 'call_missed',
  VOICE: 'voice',
  VIDEO: 'video',
  DOCUMENT: 'document',
} as const

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES]

export const ATTACHMENT_TYPES = {
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  VIDEO: 'video',
  DOCUMENT: 'document',
} as const

export type AttachmentType = (typeof ATTACHMENT_TYPES)[keyof typeof ATTACHMENT_TYPES]

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
} as const

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS]

export function typeFromAttachments(types: string[]): MessageType {
  const set = new Set(types)
  if (set.has('image')) return MESSAGE_TYPES.IMAGE
  if (set.has('video')) return MESSAGE_TYPES.VIDEO
  if (set.has('voice')) return MESSAGE_TYPES.VOICE
  if (set.has('document')) return MESSAGE_TYPES.DOCUMENT
  return MESSAGE_TYPES.FILE
}


