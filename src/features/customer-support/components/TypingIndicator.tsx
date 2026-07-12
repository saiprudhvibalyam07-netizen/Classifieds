import { Headphones } from 'lucide-react'

interface TypingIndicatorProps {
  label?: string
}

export function TypingIndicator({ label = 'Support is typing' }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start" role="status" aria-label={label}>
      <div className="flex max-w-[80%] items-end gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
          <Headphones className="h-4 w-4" />
        </div>
        <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <div className="flex items-center gap-1">
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
