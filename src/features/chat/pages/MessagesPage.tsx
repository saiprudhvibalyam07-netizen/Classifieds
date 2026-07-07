import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useConversations } from '../hooks/useConversations'
import { useConversation } from '../hooks/useConversation'
import { useMessages } from '../hooks/useMessages'
import { conversationService } from '../services/conversationService'
import { messageService } from '../services/messageService'
import { ConversationList } from '../components/ConversationList'
import { ConversationDetail } from '../components/ConversationDetail'
import { SidebarSkeleton, MessagesSkeleton } from '../components/LoadingSkeleton'
import { ErrorState } from '../components/ErrorState'
import { EmptyState } from '../components/EmptyState'
import { SEO } from '../../../components/SEO'

const DESKTOP_BREAKPOINT = 768

function useIsMobile() {
  const [mobile, setMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < DESKTOP_BREAKPOINT : true
  )

  useEffect(() => {
    let frameId: number | null = null
    function handleResize() {
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        setMobile(window.innerWidth < DESKTOP_BREAKPOINT)
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [])

  return mobile
}

export function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const searchParamsStr = useMemo(() => searchParams.toString(), [searchParams])
  const isMobile = useIsMobile()

  const {
    conversations,
    loading: convLoading,
    loadingMore,
    error: convError,
    unreadIds,
    hasMore: convHasMore,
    refetch,
    loadMore,
    refreshUnread,
  } = useConversations()

  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)

  const { conversation: activeConv, loading: convDetailLoading } = useConversation(activeConvId)

  const {
    messages,
    loading: msgLoading,
    loadingOlder,
    error: msgError,
    sending,
    hasMore: msgHasMore,
    send,
    loadOlder,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useMessages(activeConvId)

  useEffect(() => {
    const params = new URLSearchParams(searchParamsStr)
    const convParam = params.get('conversation')
    const listingParam = params.get('listing')
    const sellerParam = params.get('seller')

    if (convParam) {
      setActiveConvId(convParam)
      setShowList(false)
    } else if (listingParam && sellerParam && user) {
      if (sellerParam === user.id) {
        navigate('/messages?new=true&listing=' + listingParam + '&seller=' + sellerParam, { replace: true })
        return
      }

      conversationService.findOrCreate(listingParam, user.id, sellerParam)
        .then((conv) => {
          setActiveConvId(conv.id)
          setShowList(false)
          navigate(`/messages?conversation=${conv.id}`, { replace: true })
          refetch()
        })
        .catch(() => {
          navigate('/messages', { replace: true })
        })
    }
  }, [searchParamsStr, user, navigate, refetch])

  useEffect(() => {
    if (activeConvId && user) {
      conversationService.markRead(activeConvId, user.id).catch(() => {})
      refreshUnread()
    }
  }, [activeConvId, user, refreshUnread])

  function handleSelectConversation(id: string) {
    setActiveConvId(id)
    setShowList(false)
    navigate(`/messages?conversation=${id}`, { replace: true })
  }

  function handleBack() {
    setActiveConvId(null)
    setShowList(true)
    navigate('/messages', { replace: true })
  }

  function handleSend(text: string, attachments?: { type: string; url: string; name: string; size: number; storage_path: string; mime_type: string }[], replyTo?: string | null) {
    send(text, attachments, replyTo)
  }

  const handleSearch = useCallback(async (query: string) => {
    if (!activeConvId) return []
    return messageService.searchMessages(activeConvId, query)
  }, [activeConvId])

  if (!user) {
    return (
      <>
        <SEO title="Messages" description="Sign in to view your conversations on ValClassifieds." url="/messages" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-sm text-gray-500">Sign in to view your messages.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO title="Messages" description="View your conversations and messages on ValClassifieds." url="/messages" />
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl flex-col">
      <div className="flex flex-1 overflow-hidden">
        {(!isMobile || showList) && (
          <div className={`flex flex-col border-r border-gray-200 bg-white ${
            isMobile ? 'w-full' : 'w-[360px] xl:w-[400px]'
          }`}>
            <div className="border-b border-gray-200 px-4 py-3">
              <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
            </div>

            {convLoading ? (
              <SidebarSkeleton />
            ) : convError ? (
              <ErrorState message={convError} onRetry={refetch} />
            ) : (
              <ConversationList
                conversations={conversations}
                activeConvId={activeConvId}
                unreadIds={unreadIds}
                currentUserId={user.id}
                onSelect={handleSelectConversation}
              />
            )}

            {convHasMore && !convLoading && (
              <div className="border-t border-gray-100 p-3">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full rounded-lg py-2 text-center text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}

        {(!isMobile || !showList) && (
          <div className="flex flex-1 flex-col bg-gray-50">
            {activeConv ? (
              <ConversationDetail
                conversation={activeConv}
                currentUserId={user.id}
                messages={messages}
                loading={msgLoading}
                loadingOlder={loadingOlder}
                error={msgError}
                sending={sending}
                hasMore={msgHasMore}
                onSend={handleSend}
                onLoadOlder={loadOlder}
                onBack={isMobile ? handleBack : undefined}
                onEditMessage={editMessage}
                onDeleteMessage={deleteMessage}
                onAddReaction={addReaction}
                onRemoveReaction={removeReaction}
                onSearch={handleSearch}
              />
            ) : msgLoading || convDetailLoading ? (
              <MessagesSkeleton />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  title="Select a conversation"
                  description={isMobile ? '' : 'Choose a conversation from the sidebar'}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
