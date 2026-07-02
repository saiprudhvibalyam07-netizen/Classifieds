import { MessageSquare } from 'lucide-react'

type Props = {
  icon?: React.ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center" data-testid="chat-empty-state">
      <div className="mb-4 text-gray-300">
        {icon ?? <MessageSquare className="h-12 w-12" />}
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  )
}
