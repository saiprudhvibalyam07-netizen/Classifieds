import { MessageCircle, X, Minimize } from 'lucide-react'

interface ChatToggleProps {
  isOpen: boolean
  onClick: () => void
  unreadCount?: number
  isMinimized?: boolean
  onMinimize?: () => void
}

export function ChatToggle({ isOpen, onClick, unreadCount, isMinimized, onMinimize }: ChatToggleProps) {
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-300 hover:bg-primary-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
    >
      {isMinimized ? (
        <Minimize className="h-6 w-6 transition-transform duration-200" onClick={(e) => {
          e.stopPropagation()
          onMinimize?.()
        }} />
      ) : isOpen ? (
        <X className="h-6 w-6 transition-transform duration-200" />
      ) : (
        <MessageCircle className="h-6 w-6 transition-transform duration-200" />
      )}
      {!isOpen && unreadCount && unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  )
}
