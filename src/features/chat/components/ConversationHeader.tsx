import { Link } from 'react-router-dom'
import { Phone, Search, MoreVertical, User } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useChatStore } from '../state/chatStore'
import { getOtherParticipant } from '../utils/messageUtils'
import type { ChatConversation } from '../types'

type Props = {
  conversation: ChatConversation
}

export function ConversationHeader({ conversation }: Props) {
  const { user } = useAuth()
  const presence = useChatStore((s) => s.presence)
  const other = getOtherParticipant(conversation, user?.id ?? '')
  const otherUserId = conversation.buyer_id === user?.id ? conversation.seller_id : conversation.buyer_id
  const status = otherUserId ? presence[otherUserId] ?? 'offline' : 'offline'

  const listing = conversation.listing as Record<string, unknown> | undefined
  const images = listing?.images as Array<Record<string, unknown>> | undefined
  const title = listing?.title as string | undefined
  const price = listing?.price as number | undefined

  const statusLabel = status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline'

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
      <Link
        to={`/listings/${conversation.listing_id ?? ''}`}
        className="group flex flex-1 items-center gap-3 overflow-hidden"
      >
        <div className="relative flex-shrink-0">
          {other?.avatar_url ? (
            <img
              src={other.avatar_url}
              alt={other?.full_name ?? ''}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              <User className="h-5 w-5 text-gray-500" />
            </div>
          )}
          {status === 'online' && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 group-hover:underline">
            {other?.full_name ?? 'Unknown'}
          </p>
          <p className="text-[11px] text-gray-500">{statusLabel}</p>
        </div>

        {listing && (
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {images && images[0] ? (
                <img
                  src={images[0].url as string}
                  alt={title ?? ''}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
                  No img
                </div>
              )}
            </div>
            <div className="min-w-0 max-w-[140px]">
              <p className="truncate text-xs text-gray-600">{title}</p>
              {price != null && (
                <p className="text-xs font-semibold text-primary-600">
                  ${price.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </Link>

      <div className="flex items-center gap-0.5">
        <button
          disabled
          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Search in conversation (coming soon)"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          disabled
          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Voice call (coming soon)"
        >
          <Phone className="h-5 w-5" />
        </button>
        <button
          disabled
          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="More options (coming soon)"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
