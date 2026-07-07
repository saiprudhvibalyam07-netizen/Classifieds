import { User } from 'lucide-react'
import type { ChatConversation } from '../types'

function formatTime(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function truncateMessage(text: string | null, maxLength = 100): string {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

type Props = {
  conversations: ChatConversation[]
  activeConvId: string | null
  unreadIds: Set<string>
  currentUserId: string
  onSelect: (id: string) => void
}

export function ConversationList({ conversations, activeConvId, unreadIds, currentUserId, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500" data-testid="chat-conversation-list">
        No conversations yet.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" data-testid="chat-conversation-list">
      {conversations.map((conv) => {
        const isActive = conv.id === activeConvId
        const isUnread = unreadIds.has(conv.id)
        const isBuyer = conv.buyer_id === currentUserId
        const otherParticipant = isBuyer ? conv.seller : conv.buyer
        const name = otherParticipant?.full_name ?? 'Unknown'
        const avatarUrl = otherParticipant?.avatar_url

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
              isActive ? 'bg-primary-50 hover:bg-primary-50' : ''
            }`}
            data-testid="chat-conversation-item"
          >
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} width={40} height={40} className="h-10 w-10 flex-shrink-0 rounded-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>
                    {name}
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {formatTime(conv.last_message_at ?? conv.updated_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  <span className={`truncate text-xs ${isUnread ? 'font-medium text-gray-600' : 'text-gray-500'}`}>
                    {truncateMessage(conv.last_message, 60)}
                  </span>
                  {isUnread && (
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" data-testid="chat-unread-badge" />
                  )}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
