import { MessageSquare } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
}

export function EmptyState({
  title = 'No messages yet',
  description = 'Send a message and our support team will get back to you.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
        <MessageSquare className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}
