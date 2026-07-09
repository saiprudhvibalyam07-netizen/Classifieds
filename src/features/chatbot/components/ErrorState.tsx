import { AlertTriangle, X } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onDismiss?: () => void
  onRetry?: () => void
}

export function ErrorState({ message, onDismiss, onRetry }: ErrorStateProps) {
  return (
    <div className="mx-4 my-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30" role="alert">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div className="flex-1">
          <p className="text-xs font-medium text-red-800 dark:text-red-200">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded p-0.5 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-800"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}
