import type { SupportMessage } from '../types'

interface MessageBubbleProps {
  message: SupportMessage
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={[
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
            isUser
              ? 'rounded-br-md bg-primary-600 text-white'
              : 'rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
            message.status === 'error' ? 'opacity-60 ring-1 ring-red-400' : '',
          ].join(' ')}
        >
          {message.content}
        </div>
        <span className="mt-1 px-1 text-[11px] text-gray-400 dark:text-gray-500">
          {formatTime(message.timestamp)}
          {message.status === 'sending' && ' · sending…'}
          {message.status === 'error' && ' · failed'}
        </span>
      </div>
    </div>
  )
}
