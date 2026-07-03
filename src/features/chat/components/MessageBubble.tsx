import { useState, useCallback } from 'react'
import { CheckCheck, Pencil, Trash2, Copy, Reply, MoreHorizontal, X } from 'lucide-react'
import type { ChatMessage, MessageReactionGroup } from '../types'
import { ImageBubble } from './ImageBubble'
import { VideoBubble } from './VideoBubble'
import { DocumentBubble } from './DocumentBubble'
import { VoiceNoteBubble } from './VoiceNoteBubble'
import { ReactionPicker } from './ReactionPicker'
import { MessageStatus } from './MessageStatus'

const REACTION_ORDER = ['👍', '❤️', '😂', '😮', '😢', '👎']

function formatMessageTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function groupReactions(msg: ChatMessage, currentUserId: string): MessageReactionGroup[] {
  if (!msg.reactions || msg.reactions.length === 0) return []
  const counts = new Map<string, { count: number; hasReacted: boolean }>()
  for (const r of msg.reactions) {
    const existing = counts.get(r.emoji) || { count: 0, hasReacted: false }
    existing.count++
    if (r.profile_id === currentUserId) existing.hasReacted = true
    counts.set(r.emoji, existing)
  }
  return REACTION_ORDER
    .filter((e) => counts.has(e))
    .map((emoji) => ({ emoji, ...counts.get(emoji)! }))
}

function isImageType(t: string | undefined | null): boolean {
  return t === 'image' || t === 'jpg' || t === 'jpeg' || t === 'png' || t === 'webp' || t === 'gif'
}

function isVideoType(t: string | undefined | null): boolean {
  return t === 'video' || t === 'mp4' || t === 'mov' || t === 'avi' || t === 'mkv'
}

function isVoiceType(t: string | undefined | null): boolean {
  return t === 'voice' || t === 'audio'
}

function isDocumentType(t: string | undefined | null): boolean {
  return t === 'document' || t === 'file'
}

type Props = {
  message: ChatMessage
  isOwn: boolean
  currentUserId: string
  onReply?: (messageId: string, senderName: string, content: string) => void
  onEdit?: (messageId: string, currentContent: string) => void
  onDelete?: (messageId: string, forEveryone?: boolean) => void
  onCopy?: (content: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
}

export function MessageBubble({ message, isOwn, currentUserId, onReply, onEdit, onDelete, onCopy, onReact, onRemoveReaction }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.message || message.content || '')
  const editInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.focus()
  }, [])

  const isDeleted = message.is_deleted
  const isEdited = message.is_edited
  const hasAttachments = message.message_attachments && message.message_attachments.length > 0
  const reactions = groupReactions(message, currentUserId)
  const textContent = message.message || message.content || ''

  function handleEditSubmit() {
    if (editText.trim() && editText.trim() !== (message.message || message.content)) {
      onEdit?.(message.id, editText.trim())
    }
    setEditing(false)
  }

  function handleCopy() {
    onCopy?.(textContent)
    setMenuOpen(false)
  }

  function handleReply() {
    const senderName = message.profile?.full_name || 'Unknown'
    onReply?.(message.id, senderName, textContent)
    setMenuOpen(false)
  }

  function handleReact(emoji: string) {
    const existing = message.reactions?.find((r) => r.emoji === emoji && r.profile_id === currentUserId)
    if (existing) {
      onRemoveReaction?.(message.id, emoji)
    } else {
      onReact?.(message.id, emoji)
    }
  }

  if (isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[75%] rounded-2xl bg-gray-100 px-4 py-2.5">
          <p className="text-xs italic text-gray-400">This message was deleted</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`group flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`relative rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
          }`}
          data-testid="chat-message-bubble"
        >
          {message.reply_to && message.reply_message && (
            <div className={`mb-1.5 rounded-lg border-l-4 px-2 py-1 text-xs ${
              isOwn ? 'border-primary-300 bg-primary-500/30' : 'border-gray-300 bg-gray-50'
            }`}>
              <p className={`font-medium ${isOwn ? 'text-primary-100' : 'text-gray-600'}`}>
                {message.reply_message.profile?.full_name || 'Unknown'}
              </p>
              <p className={`truncate ${isOwn ? 'text-primary-200' : 'text-gray-500'}`}>
                {message.reply_message.message || message.reply_message.content || ''}
              </p>
            </div>
          )}

          {hasAttachments && message.message_attachments.map((att) => {
            const attType = att.type || ''
            if (isImageType(attType)) {
              return (
                <ImageBubble
                  key={att.id}
                  src={att.public_url}
                  alt={att.filename}
                  width={att.width}
                  height={att.height}
                />
              )
            }
            if (isVideoType(attType)) {
              return (
                <VideoBubble
                  key={att.id}
                  src={att.public_url}
                  filename={att.filename}
                  mimeType={att.mime_type}
                  thumbnailUrl={att.thumbnail_url}
                />
              )
            }
            if (isVoiceType(attType)) {
              return (
                <VoiceNoteBubble
                  key={att.id}
                  src={att.public_url}
                  duration={null}
                />
              )
            }
            if (isDocumentType(attType)) {
              return (
                <DocumentBubble
                  key={att.id}
                  filename={att.filename}
                  mimeType={att.mime_type}
                  sizeBytes={att.size_bytes}
                  url={att.public_url}
                />
              )
            }
            return null
          })}

          {editing ? (
            <div className="flex gap-1">
              <input
                ref={editInputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit(); if (e.key === 'Escape') setEditing(false) }}
                className={`flex-1 rounded border bg-transparent px-2 py-1 text-sm outline-none ${
                  isOwn ? 'border-primary-400 text-white placeholder:text-primary-200' : 'border-gray-300'
                }`}
                aria-label="Edit message"
              />
              <button onClick={handleEditSubmit} className="self-start rounded p-1 hover:bg-black/10" aria-label="Save edit">
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditing(false)} className="self-start rounded p-1 hover:bg-black/10" aria-label="Cancel edit">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            textContent && (
              <p className="text-sm whitespace-pre-wrap break-words">{textContent}</p>
            )
          )}

          <div className={`mt-1 flex items-center justify-end gap-1 ${isOwn ? '' : 'flex-row-reverse'}`}>
            <span className={`text-[10px] ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
              {formatMessageTime(message.created_at)}
            </span>
            {isEdited && (
              <span className={`text-[10px] ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
                edited
              </span>
            )}
            {isOwn && <MessageStatus status={message.status || 'read'} />}
          </div>
        </div>

        {reactions.length > 0 && (
          <div className={`mt-0.5 flex gap-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`} data-testid="message-reactions">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleReact(r.emoji)}
                className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition hover:scale-110 ${
                  r.hasReacted
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
                aria-label={`${r.emoji} ${r.count}`}
                aria-pressed={r.hasReacted}
              >
                <span className="text-xs">{r.emoji}</span>
                <span className="text-[10px] text-gray-500">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className={`relative mt-0.5 flex items-center gap-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <ReactionPicker
            messageId={message.id}
            onReact={handleReact}
            currentReactions={reactions.filter((r) => r.hasReacted).map((r) => r.emoji)}
          />

          {!editing && (
            <button
              onClick={handleReply}
              className="rounded-full p-1 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
              aria-label="Reply"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          )}

          {(isOwn && !editing) && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full p-1 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                aria-label="Message actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className={`absolute z-20 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ${
                    isOwn ? 'right-0' : 'left-0'
                  }`}>
                    <button
                      onClick={() => { handleCopy(); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                    {isOwn && (
                      <>
                        <button
                          onClick={() => { setEditing(true); setMenuOpen(false) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => { onDelete?.(message.id); setMenuOpen(false) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete for me
                        </button>
                        <button
                          onClick={() => { onDelete?.(message.id, true); setMenuOpen(false) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
