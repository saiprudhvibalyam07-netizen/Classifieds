import { X, Reply } from 'lucide-react'

type Props = {
  senderName: string
  content: string
  onCancel: () => void
}

export function ReplyPreview({ senderName, content, onCancel }: Props) {
  return (
    <div className="flex items-center gap-2 border-l-4 border-primary-500 bg-primary-50 px-4 py-2" data-testid="reply-preview">
      <Reply className="h-4 w-4 flex-shrink-0 text-primary-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-primary-700">{senderName}</p>
        <p className="truncate text-xs text-gray-600">{content}</p>
      </div>
      <button
        onClick={onCancel}
        className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-primary-100 hover:text-gray-600"
        aria-label="Cancel reply"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
