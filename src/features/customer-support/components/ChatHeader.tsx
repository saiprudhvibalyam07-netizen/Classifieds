import { X, Headphones, Trash2 } from 'lucide-react'
import { OnlineStatus } from './OnlineStatus'

interface ChatHeaderProps {
  title: string
  subtitle?: string
  online?: boolean
  onClose: () => void
  onClear?: () => void
}

export function ChatHeader({ title, subtitle, online = true, onClose, onClear }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 bg-primary-600 px-4 py-3 text-white dark:bg-primary-800">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Headphones className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold leading-tight">{title}</h2>
          <OnlineStatus online={online} label={subtitle} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear chat"
            title="Clear chat"
            className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close support chat"
          className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
