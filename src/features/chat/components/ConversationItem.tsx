import { memo } from 'react'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { formatRelativeTime, getOtherParticipant, truncateMessage } from '../utils/messageUtils'
import type { ChatConversation } from '../types'

type Props = {
  conversation: ChatConversation
  currentUserId: string
  isActive: boolean
  isUnread: boolean
  onlineStatus: 'online' | 'away' | 'offline' | null
}

function areEqual(prev: Props, next: Props) {
  return (
    prev.conversation.id === next.conversation.id &&
    prev.conversation.updated_at === next.conversation.updated_at &&
    prev.conversation.last_message === next.conversation.last_message &&
    prev.conversation.last_message_at === next.conversation.last_message_at &&
    prev.currentUserId === next.currentUserId &&
    prev.isActive === next.isActive &&
    prev.isUnread === next.isUnread &&
    prev.onlineStatus === next.onlineStatus
  )
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
  currentUserId,
  isActive,
  isUnread,
  onlineStatus,
}: Props) {
  const other = getOtherParticipant(conversation, currentUserId)
  const listingTitle = conversation.listing
    ? (conversation.listing as Record<string, unknown>).title as string
    : null

  return (
    <Link
      to={`/messages?conversation=${conversation.id}`}
      data-testid="chat-conversation-item"
      className={`group relative flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        isActive ? 'bg-primary-50' : ''
      } ${isUnread ? 'bg-blue-50/40' : ''}`}
    >
      <div className="relative flex-shrink-0">
        {other?.avatar_url ? (
          <img
            src={other.avatar_url}
            alt={other.full_name ?? ''}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
            <User className="h-5 w-5 text-gray-500" />
          </div>
        )}
        {onlineStatus === 'online' && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" aria-label="Online" title="Online" />
        )}
        {onlineStatus === 'away' && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-amber-400" aria-label="Away" title="Away" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>
            {other?.full_name ?? 'Unknown'}
          </p>
          <span className="flex-shrink-0 text-[11px] text-gray-500">
            {conversation.last_message_at
              ? formatRelativeTime(conversation.last_message_at)
              : ''}
          </span>
        </div>

        {listingTitle && (
          <p className="truncate text-[11px] text-gray-500">
            {listingTitle}
          </p>
        )}

        <div className="mt-0.5 flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-xs ${
            isUnread ? 'font-medium text-gray-700' : 'text-gray-500'
          }`}>
            {truncateMessage(conversation.last_message, 80) || 'No messages yet'}
          </p>
          {isUnread && (
            <span data-testid="chat-unread-badge" className="flex-shrink-0 rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label="Unread messages" title="Unread messages" />
          )}
        </div>
      </div>
    </Link>
  )
}, areEqual)
