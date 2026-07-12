import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatConversation, ChatMessage } from '../types'
import { ConversationHeader } from './ConversationHeader'
import { MessageBubble } from './MessageBubble'
import { AttachmentPicker } from './AttachmentPicker'
import { ReplyPreview } from './ReplyPreview'
import { UploadProgress } from './UploadProgress'
import { ConversationSearch } from './ConversationSearch'
import { CallUI } from './CallUI'
import { attachmentService } from '../services/attachmentService'


function isSameDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (target.getTime() === today.getTime()) return 'Today'
  if (target.getTime() === yesterday.getTime()) return 'Yesterday'

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

type Props = {
  conversation: ChatConversation
  currentUserId: string
  messages: ChatMessage[]
  loading: boolean
  loadingOlder: boolean
  error: string | null
  sending: boolean
  hasMore: boolean
  onSend: (text: string, attachments?: { type: string; url: string; name: string; size: number; storage_path: string; mime_type: string }[], replyTo?: string | null) => void
  onLoadOlder: () => void
  onBack?: () => void
  onEditMessage?: (messageId: string, newContent: string) => void
  onDeleteMessage?: (messageId: string, forEveryone?: boolean) => void
  onAddReaction?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
  onSearch?: (query: string) => Promise<{ messageId: string; content: string; createdAt: string }[]>
}

export function ConversationDetail({
  conversation,
  currentUserId,
  messages,
  loading,
  loadingOlder,
  error,
  sending,
  hasMore,
  onSend,
  onLoadOlder,
  onBack,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onSearch,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevMessageCountRef = useRef(messages.length)

  const [uploads, setUploads] = useState<{ id: string; name: string; progress: number; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string }[]>([])
  const [replyTo, setReplyTo] = useState<{ messageId: string; senderName: string; content: string } | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const [callState, setCallState] = useState<'none' | 'incoming' | 'calling' | 'ongoing' | 'missed' | 'declined' | 'ended'>('none')
  const [callType, setCallType] = useState<'voice' | 'video'>('voice')
  const [callDuration, setCallDuration] = useState(0)
  const callTimerRef = useRef<ReturnType<typeof setInterval>>()

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-primary-400', 'rounded-lg')
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400', 'rounded-lg'), 2000)
    }
  }, [])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    const input = inputRef.current
    if (!input) return
    const text = input.value.trim()
    if (!text && uploads.length === 0 && replyTo) return
    if (!text && uploads.length === 0) return

    if (uploads.length > 0) {
      const files = uploads.filter((u) => u.status === 'pending')
      for (const upload of files) {
        setUploads((prev) => prev.map((u) => u.id === upload.id ? { ...u, status: 'uploading' as const } : u))
      }
    }

    onSend(text, [], replyTo?.messageId)
    input.value = ''
    setReplyTo(null)
  }

  async function handleSelectFiles(files: FileList) {
    const fileArray = Array.from(files)
    for (const file of fileArray) {
      const id = `${Date.now()}-${file.name}`
      try {
        attachmentService.validate(file)
        setUploads((prev) => [...prev, { id, name: file.name, progress: 0, status: 'pending' }])
        const result = await attachmentService.upload(conversation.id, file, (progress) => {
          setUploads((prev) => prev.map((u) => u.id === id ? { ...u, progress } : u))
        })
        setUploads((prev) => prev.map((u) => u.id === id ? { ...u, status: 'done' as const, progress: 100 } : u))
        onSend('', [result], replyTo?.messageId)
        setReplyTo(null)
      } catch (err) {
        setUploads((prev) => prev.map((u) => u.id === id ? { ...u, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' } : u))
      }
    }
  }

  function handleReply(messageId: string, senderName: string, content: string) {
    setReplyTo({ messageId, senderName, content })
    inputRef.current?.focus()
  }

  function handleCopy(content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setToast({ message: 'Copied to clipboard', type: 'success' })
      setTimeout(() => setToast(null), 2000)
    })
  }

  async function handleRecordVoice() {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        const id = `${Date.now()}-voice`
        try {
          attachmentService.validate(file)
          setUploads((prev) => [...prev, { id, name: file.name, progress: 0, status: 'pending' }])
          const result = await attachmentService.upload(conversation.id, file, (progress) => {
            setUploads((prev) => prev.map((u) => u.id === id ? { ...u, progress } : u))
          })
          setUploads((prev) => prev.map((u) => u.id === id ? { ...u, status: 'done' as const, progress: 100 } : u))
          onSend('', [result], replyTo?.messageId)
          setReplyTo(null)
        } catch (err) {
          setUploads((prev) => prev.map((u) => u.id === id ? { ...u, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' } : u))
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      setToast({ message: 'Microphone access denied', type: 'error' })
      setTimeout(() => setToast(null), 2000)
    }
  }

  function handleVoiceCall() {
    setCallType('voice')
    setCallState('calling')
    setTimeout(() => {
      setCallState('missed')
    }, 10000)
  }

  function handleVideoCall() {
    setCallType('video')
    setCallState('calling')
    setTimeout(() => {
      setCallState('missed')
    }, 10000)
  }

  function handleEndCall() {
    if (callTimerRef.current) clearInterval(callTimerRef.current)
    setCallState('ended')
  }

  function handleDismissCall() {
    if (callTimerRef.current) clearInterval(callTimerRef.current)
    setCallState('none')
    setCallDuration(0)
  }

  useEffect(() => {
    if (callState === 'ongoing') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1)
      }, 1000)
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
  }, [callState])

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <ConversationHeader
        conversation={conversation}
        currentUserId={currentUserId}
        onBack={onBack}
        onVoiceCall={handleVoiceCall}
        onVideoCall={handleVideoCall}
      />

      {showSearch && onSearch && (
        <ConversationSearch
          onSearch={onSearch}
          onJumpTo={(id) => { scrollToMessage(id); setShowSearch(false) }}
          onClose={() => setShowSearch(false)}
        />
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 min-h-0"
        data-testid="chat-message-area"
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && hasMore && (
          <button
            onClick={onLoadOlder}
            disabled={loadingOlder}
            className="mb-4 w-full rounded-lg py-2 text-center text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            {loadingOlder ? 'Loading...' : 'Load older messages'}
          </button>
        )}

        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const isOwn = msg.sender_id === currentUserId
            const showDateSep = idx === 0 || !isSameDay(messages[idx - 1].created_at, msg.created_at)

            return (
              <div key={msg.id} id={`msg-${msg.id}`}>
                {showDateSep && (
                  <div className="relative mb-3 mt-2 flex items-center justify-center">
                    <span className="relative z-10 bg-gray-50 px-3 text-xs text-gray-400">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  currentUserId={currentUserId}
                  onReply={handleReply}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onCopy={handleCopy}
                  onReact={onAddReaction}
                  onRemoveReaction={onRemoveReaction}
                />
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="relative flex-shrink-0 border-t border-gray-200 bg-white">
        {toast && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-xs text-white shadow-lg">
            {toast.message}
          </div>
        )}

        <UploadProgress
          uploads={uploads}
          onDismiss={(id) => setUploads((prev) => prev.filter((u) => u.id !== id))}
        />

        {replyTo && (
          <ReplyPreview
            senderName={replyTo.senderName}
            content={replyTo.content}
            onCancel={() => setReplyTo(null)}
          />
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2 px-4 py-3 pb-safe">
          <AttachmentPicker
            onSelectFiles={handleSelectFiles}
            onRecordVoice={handleRecordVoice}
            disabled={sending}
          />
          <div className="relative flex flex-1 items-end gap-2 min-w-0">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 min-w-0 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
              data-testid="chat-message-input"
              aria-label="Message input"
            />
            {onSearch && (
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Search"
                data-testid="search-messages-button"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            data-testid="chat-send-button"
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>

      {callState !== 'none' && (
        <CallUI
          callType={callType}
          callState={callState}
          callerName={''}
          duration={callDuration}
          onEnd={handleEndCall}
          onDismiss={handleDismissCall}
        />
      )}
    </div>
  )
}
