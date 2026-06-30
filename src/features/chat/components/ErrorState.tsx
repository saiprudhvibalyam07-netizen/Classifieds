import { AlertCircle } from 'lucide-react'

type Props = {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
      <p className="text-sm text-red-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  )
}
