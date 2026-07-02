import { useState, useRef, useEffect } from 'react'
import { Pencil, Trash2, X, Check, File } from 'lucide-react'
import type { ChatMessage } from '../types'
import { formatMessageTime } from '../utils/messageUtils'

type Props = {
  message: ChatMessage
  isOwn: boolean
  onEdit: (id: string, newText: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export function MessageBubble({ message, isOwn, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.message)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function handleSave() {
    if (!editText.trim() || editText.trim() === message.message) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onEdit(message.id, editText)
    setSaving(false)
    if (ok) setEditing(false)
  }

  function handleCancel() {
    setEditText(message.message)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') handleCancel()
  }

  async function handleDelete() {
    if (!window.confirm('Delete this message?')) return
    await onDelete(message.id)
  }

  const hasAttachments = message.message_attachments && message.message_attachments.length > 0

  return (
    <div className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} px-1`} data-testid="chat-message-bubble">
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {isOwn && !editing && (
          <div className={`mb-1 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <button
              onClick={() => { setEditText(message.message); setEditing(true) }}
              className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Edit message"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
              aria-label="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isOwn
              ? 'rounded-br-sm bg-primary-600 text-white'
              : 'rounded-bl-sm bg-white text-gray-900 ring-1 ring-gray-200'
          }`}
        >
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={1000}
                className="flex-1 rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={handleSave}
                disabled={saving || !editText.trim()}
                className="rounded p-1 text-primary-200 transition hover:text-white disabled:opacity-40"
                aria-label="Save edit"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                className="rounded p-1 text-primary-200 transition hover:text-white"
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {message.message && (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {message.message}
                </p>
              )}

              {hasAttachments && (
                <div className={message.message ? 'mt-2 space-y-2' : 'space-y-2'}>
                  {message.message_attachments.map((att, i) =>
                    att.type === 'image' ? (
                      <a
                        key={i}
                        href={att.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg"
                      >
                        <img
                          src={att.public_url}
                          alt={att.filename}
                          className="max-h-60 w-full rounded-lg object-cover transition hover:opacity-90"
                        />
                      </a>
                    ) : (
                      <a
                        key={i}
                        href={att.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 rounded-lg p-2.5 text-xs transition ${
                          isOwn
                            ? 'bg-primary-700 text-primary-100 hover:bg-primary-800'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <File className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{att.filename}</span>
                      </a>
                    )
                  )}
                </div>
              )}

              <div className={`mt-1 flex items-center gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {message.updated_at && (
                  <span className={`text-[10px] ${isOwn ? 'text-primary-300' : 'text-gray-500'}`}>
                    edited
                  </span>
                )}
                <span className={`text-[10px] ${isOwn ? 'text-primary-200' : 'text-gray-500'}`}>
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
