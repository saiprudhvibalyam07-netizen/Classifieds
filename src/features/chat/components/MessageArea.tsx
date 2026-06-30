import { useEffect, useRef, type UIEvent } from 'react'
import { ChevronUp, Loader } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useChatStore } from '../state/chatStore'
import { MessagesSkeleton } from './LoadingSkeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { DateSeparator } from './DateSeparator'
import { TypingIndicator } from './TypingIndicator'
import { MessageBubble } from './MessageBubble'
import { isSameDay } from '../utils/messageUtils'
import type { ChatMessage } from '../types'

type Props = {
  messages: ChatMessage[]
  loading: boolean
  loadingOlder: boolean
  error: string | null
  hasMore: boolean
  onLoadOlder: () => void
  onEdit: (id: string, newText: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onRetry: () => void
}

export function MessageArea({
  messages,
  loading,
  loadingOlder,
  error,
  hasMore,
  onLoadOlder,
  onEdit,
  onDelete,
  onRetry,
}: Props) {
  const { user } = useAuth()
  const typingUsers = useChatStore((s) => s.typingUsers)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  const conversationId = useChatStore((s) => s.activeConversationId)
  const typingNames = conversationId && (typingUsers[conversationId] ?? []).length > 0
    ? ['Someone']
    : []

  useEffect(() => {
    if (messages.length > prevLengthRef.current && prevLengthRef.current > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevLengthRef.current = messages.length
  }, [messages.length])

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollTop < 120 && hasMore && !loadingOlder) {
      onLoadOlder()
    }
  }

  function renderMessages() {
    if (loading) return <MessagesSkeleton />
    if (error) return <ErrorState message={error} onRetry={onRetry} />
    if (messages.length === 0) {
      return (
        <EmptyState
          title="No messages yet"
          description="Start the conversation by sending a message below"
        />
      )
    }

    const result: React.ReactNode[] = []
    let lastDate: string | null = null

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const msgDate = msg.created_at

      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        result.push(<DateSeparator key={`date-${msgDate}`} date={msgDate} />)
        lastDate = msgDate
      }

      result.push(
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id === user?.id}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )
    }

    return result
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gray-50"
      onScroll={handleScroll}
    >
      {loadingOlder && (
        <div className="flex justify-center py-3">
          <Loader className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {hasMore && !loadingOlder && !loading && (
        <button
          onClick={onLoadOlder}
          className="flex w-full items-center justify-center gap-1 py-3 text-xs font-medium text-primary-600 transition hover:bg-gray-100 hover:underline"
        >
          <ChevronUp className="h-3 w-3" />
          Load older messages
        </button>
      )}

      <div className="space-y-1 px-4 py-4">
        {renderMessages()}
      </div>

      {typingNames.length > 0 && (
        <TypingIndicator names={typingNames} />
      )}

      <div ref={bottomRef} />
    </div>
  )
}
