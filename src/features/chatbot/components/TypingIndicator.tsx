import { Bot } from 'lucide-react'

interface TypingIndicatorProps {
  label?: string
}

export function TypingIndicator({ label = 'Typing...' }: TypingIndicatorProps) {
  return (
    <div className="flex gap-2 px-4 py-1.5 justify-start" role="status" aria-label={label}>
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
        <Bot className="h-4 w-4 text-primary-600" />
      </div>
      <div className="max-w-[80%]">
        <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm rounded-bl-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
          </div>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  )
}
