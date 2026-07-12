import { Headphones } from 'lucide-react'

interface WelcomeMessageProps {
  title?: string
  message: string
}

export function WelcomeMessage({
  title = 'How can we help?',
  message,
}: WelcomeMessageProps) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
        <Headphones className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  )
}
