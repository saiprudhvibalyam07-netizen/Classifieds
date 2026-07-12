import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface MessageInputProps {
  onSend: (text: string) => void
  placeholder?: string
  disabled?: boolean
}

export function MessageInput({
  onSend,
  placeholder = 'Type your message…',
  disabled,
}: MessageInputProps) {
  const [value, setValue] = useState('')

  function submit() {
    const text = value.trim()
    if (!text) return
    onSend(text)
    setValue('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
    >
      <label htmlFor="support-message-input" className="sr-only">
        Type your message
      </label>
      <textarea
        id="support-message-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-gray-900"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  )
}
