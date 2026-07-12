import { MessageCircle, X } from 'lucide-react'

interface FloatingButtonProps {
  isOpen: boolean
  online?: boolean
  onClick: () => void
}

export function FloatingButton({ isOpen, online = true, onClick }: FloatingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close support chat' : 'Open support chat'}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 sm:bottom-6 sm:right-6"
    >
      {online && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-primary-600 bg-green-500" />
        </span>
      )}
      {isOpen ? (
        <X className="h-6 w-6 transition-transform duration-200" />
      ) : (
        <MessageCircle className="h-6 w-6 transition-transform duration-200" />
      )}
    </button>
  )
}
