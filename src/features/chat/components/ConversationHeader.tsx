import { useState } from 'react'
import { User, Phone, Video, MoreVertical, Trash2 } from 'lucide-react'
import type { ChatConversation } from '../types'

type Props = {
  conversation: ChatConversation
  currentUserId: string
  onBack?: () => void
  onDelete?: () => void
  onVoiceCall?: () => void
  onVideoCall?: () => void
}

function getOtherParticipant(
  conversation: ChatConversation,
  userId: string
): { id: string; full_name: string | null; avatar_url: string | null } | null {
  if (conversation.buyer_id === userId) return conversation.seller ?? null
  if (conversation.seller_id === userId) return conversation.buyer ?? null
  return null
}

export function ConversationHeader({ conversation, currentUserId, onBack, onDelete, onVoiceCall, onVideoCall }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const otherUser = getOtherParticipant(conversation, currentUserId)
  const name = otherUser?.full_name ?? 'Unknown'
  const avatarUrl = otherUser?.avatar_url
  const listingTitle =
    conversation.listing && typeof conversation.listing === 'object' && 'title' in conversation.listing
      ? (conversation.listing as Record<string, string>).title
      : null

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3" data-testid="conversation-header">
      {onBack && (
        <button
          onClick={onBack}
          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
          aria-label="Back to conversations"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className="relative">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} width={36} height={36} className="h-9 w-9 rounded-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
            <User className="h-5 w-5 text-gray-500" />
          </div>
        )}
        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
        {listingTitle && (
          <p className="truncate text-xs text-gray-500">Re: {listingTitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onVoiceCall}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Voice call"
          data-testid="voice-call-button"
        >
          <Phone className="h-5 w-5" />
        </button>
        <button
          onClick={onVideoCall}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Video call"
          data-testid="video-call-button"
        >
          <Video className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="More options"
            data-testid="chat-menu-button"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg" data-testid="chat-menu-dropdown">
                {onDelete && (
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete conversation
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
