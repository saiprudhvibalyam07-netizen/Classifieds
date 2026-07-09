import { Check, CheckCheck, AlertCircle, User } from 'lucide-react'
import type { ChatbotMessage } from '../types'
import { cn } from '../../../utils/cn'

interface MessageBubbleProps {
  message: ChatbotMessage
  onRetry?: (messageId: string) => void
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isFailed = message.status === 'failed'
  const isSending = message.status === 'sending'

  if (!isUser) return null

  return (
    <div className={cn('flex gap-2 px-4 py-1.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
          <User className="h-4 w-4 text-primary-600" />
        </div>
      )}
      <div className={cn('max-w-[80%]', isUser ? 'order-1' : 'order-2')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md',
            isFailed && 'opacity-70'
          )}
        >
          <p>{message.content}</p>
        </div>
        <div className={cn('mt-1 flex items-center gap-1', isUser ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
          {isUser && (
            <span className="text-[10px]">
              {isSending && <Check className="h-3 w-3 text-gray-400" />}
              {message.status === 'sent' && <CheckCheck className="h-3 w-3 text-blue-400" />}
              {isFailed && (
                <button
                  onClick={() => onRetry?.(message.id)}
                  className="flex items-center gap-1 text-red-500 hover:text-red-600"
                  aria-label="Retry sending message"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-[10px]">Failed</span>
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
