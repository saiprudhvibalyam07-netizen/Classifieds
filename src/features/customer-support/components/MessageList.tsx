import { useEffect, useRef } from 'react'
import type { SupportMessage } from '../types'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface MessageListProps {
  messages: SupportMessage[]
  typing?: boolean
}

export function MessageList({ messages, typing = false }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  return (
    <div
      className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4 dark:bg-gray-900"
      role="log"
      aria-live="polite"
      aria-label="Support conversation"
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {typing && <TypingIndicator />}
      <div ref={endRef} />
    </div>
  )
}
