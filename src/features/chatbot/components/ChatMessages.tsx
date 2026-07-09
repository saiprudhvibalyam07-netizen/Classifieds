import { useEffect, useRef } from 'react'
import type { ChatbotMessage } from '../types'
import { MessageBubble } from './MessageBubble'
import { AssistantBubble } from './AssistantBubble'
import { TypingIndicator } from './TypingIndicator'
import { WelcomeMessage } from './WelcomeMessage'
import type { ChatbotRole } from '../types'

interface ChatMessagesProps {
  messages: ChatbotMessage[]
  isTyping: boolean
  role: ChatbotRole
  showWelcome: boolean
  onPromptClick: (prompt: string) => void
  onRetry: (messageId: string) => void
}

export function ChatMessages({
  messages,
  isTyping,
  role,
  showWelcome,
  onPromptClick,
  onRetry,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900" role="log" aria-label="Chat messages" aria-live="polite">
      {showWelcome && messages.length === 0 ? (
        <WelcomeMessage role={role} onPromptClick={onPromptClick} />
      ) : (
        <div className="py-3">
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <MessageBubble key={msg.id} message={msg} onRetry={onRetry} />
            ) : (
              <AssistantBubble key={msg.id} message={msg} />
            )
          )}
        </div>
      )}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
