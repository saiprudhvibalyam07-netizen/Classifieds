import { Bot } from 'lucide-react'
import type { ChatbotMessage } from '../types'

interface AssistantBubbleProps {
  message: ChatbotMessage
  isStreaming?: boolean
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function AssistantBubble({ message, isStreaming }: AssistantBubbleProps) {
  return (
    <div className="flex gap-2 px-4 py-1.5 justify-start">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
        <Bot className="h-4 w-4 text-primary-600" />
      </div>
      <div className="max-w-[80%]">
        <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm leading-relaxed text-gray-900 dark:text-gray-100 rounded-bl-md">
          {isStreaming ? (
            <span className="inline-flex gap-1">
              <span className="animate-pulse">{message.content}</span>
              <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-gray-400" />
            </span>
          ) : (
            <p>{message.content}</p>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1 justify-start">
          <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
