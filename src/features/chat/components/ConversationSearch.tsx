import { Search } from 'lucide-react'

type Props = {
  value: string
  onChange: (value: string) => void
}

export function ConversationSearch({ value, onChange }: Props) {
  return (
    <div className="relative px-3 py-2">
      <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search conversations..."
        className="w-full rounded-lg border-0 bg-gray-100 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Search conversations"
        data-testid="chat-conversation-search"
      />
    </div>
  )
}
