import { useState, type UIEvent } from 'react'
import { ChevronUp, Loader, RefreshCw, WifiOff } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useChatStore } from '../state/chatStore'
import { ConversationSearch } from './ConversationSearch'
import { ConversationItem } from './ConversationItem'
import { SidebarSkeleton } from './LoadingSkeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import type { ChatConversation } from '../types'

type Props = {
  conversations: ChatConversation[]
  activeConvId: string | null
  loading: boolean
  loadingMore: boolean
  error: string | null
  unreadIds: Set<string>
  hasMore: boolean
  isOnline: boolean
  queueSize: number
  syncStatus: string
  onLoadMore: () => void
  onRetry: () => void
}

export function ConversationSidebar({
  conversations,
  activeConvId,
  loading,
  loadingMore,
  error,
  unreadIds,
  hasMore,
  isOnline,
  queueSize,
  syncStatus,
  onLoadMore,
  onRetry,
}: Props) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const presence = useChatStore((s) => s.presence)

  const filtered = searchQuery.trim()
    ? conversations.filter((c) => {
        const other = c.buyer_id === user?.id ? c.seller : c.buyer
        const name = other?.full_name?.toLowerCase() ?? ''
        const listing = c.listing
          ? ((c.listing as Record<string, unknown>).title as string)?.toLowerCase() ?? ''
          : ''
        const q = searchQuery.toLowerCase()
        return name.includes(q) || listing.includes(q)
      })
    : conversations

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasMore && !loadingMore) {
      onLoadMore()
    }
  }

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-bold text-gray-900">Messages</h2>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
              <WifiOff className="h-3 w-3" />
              Offline
            </span>
          )}
          {queueSize > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
              <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {queueSize}
            </span>
          )}
        </div>
      </div>

      <ConversationSearch value={searchQuery} onChange={setSearchQuery} />

      <div className="flex-1 overflow-y-auto" onScroll={handleScroll} role="list" aria-label="Conversations" data-testid="chat-conversation-list">
        {loading ? (
          <SidebarSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No conversations found' : 'No conversations yet'}
            description={searchQuery ? 'Try a different search term' : 'Contact a seller from a listing'}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => {
              const otherUserId = c.buyer_id === user?.id ? c.seller_id : c.buyer_id
              return (
                <div key={c.id} role="listitem" aria-selected={c.id === activeConvId}>
                  <ConversationItem
                    conversation={c}
                    currentUserId={user?.id ?? ''}
                    isActive={c.id === activeConvId}
                    isUnread={unreadIds.has(c.id)}
                    onlineStatus={otherUserId ? (presence[otherUserId] ?? null) : null}
                  />
                </div>
              )
            })}
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {hasMore && !loadingMore && !loading && (
          <button
            onClick={onLoadMore}
            className="flex w-full items-center justify-center gap-1 py-3 text-xs font-medium text-primary-600 transition hover:bg-gray-50 hover:underline"
          >
            <ChevronUp className="h-3 w-3" />
            Load more
          </button>
        )}
      </div>
    </div>
  )
}
