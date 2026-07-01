import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, User } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useConversations } from '../hooks/useConversations'
import { useMessages } from '../hooks/useMessages'
import { usePresence } from '../hooks/usePresence'
import { useTypingIndicator } from '../hooks/useTypingIndicator'
import { useToast } from '../hooks/useToast'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { useChatStore } from '../state/chatStore'
import { chatMutations } from '../api/chatMutations'
import { getOtherParticipant } from '../utils/messageUtils'
import { ConversationSidebar } from '../components/ConversationSidebar'
import { ConversationHeader } from '../components/ConversationHeader'
import { MessageArea } from '../components/MessageArea'
import { MessageComposer } from '../components/MessageComposer'
import { EmptyState } from '../components/EmptyState'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { ToastContainer } from '../components/ToastContainer'
import type { ChatConversation } from '../types'

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

function MobileHeader({ name, avatarUrl, onBack }: { name: string; avatarUrl: string | null | undefined; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-2 py-2">
      <button
        onClick={onBack}
        className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
        aria-label="Back to conversations"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name ?? ''} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <User className="h-4 w-4 text-gray-500" />
          </div>
        )}
        <p className="text-sm font-medium text-gray-900">{name}</p>
      </div>
    </div>
  )
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
    refetch,
    unreadIds,
    hasMore: convHasMore,
    markConversationRead,
    loadMore,
    getConversationById,
  } = useConversations()

  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null)
  const [showList, setShowList] = useState(true)
  const { show } = useToast()
  const fetchedConvRef = useRef(false)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const { queueSize, syncStatus, isOnline } = useOfflineQueue()

  const {
    messages,
    loading: msgLoading,
    loadingOlder,
    error: msgError,
    sending,
    hasMore: msgHasMore,
    send,
    edit,
    remove,
    upload,
    loadOlder,
    retry,
  } = useMessages(activeConvId)

  const { broadcastTyping } = useTypingIndicator(activeConvId)
  usePresence()

  const createOrOpenConversation = useCallback(async (listingId: string, sellerId: string) => {
    if (!user) return

    const existing = conversations.find(
      (c) => c.listing_id === listingId && c.seller_id === sellerId && c.buyer_id === user.id
    )

    if (existing) {
      setActiveConvId(existing.id)
      navigate(`/messages?conversation=${existing.id}`, { replace: true })
      setShowList(false)
      return
    }

    try {
      const data = await chatMutations.createConversation(listingId, user.id, sellerId)
      await refetch()
      setActiveConvId(data.id)
      navigate(`/messages?conversation=${data.id}`, { replace: true })
      setShowList(false)
    } catch (err) {
      show({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create conversation' })
    }
  }, [conversations, navigate, refetch, user, show])

  useEffect(() => {
    const params = new URLSearchParams(searchParamsStr)
    const convParam = params.get('conversation')
    const listingParam = params.get('listing')
    const sellerParam = params.get('seller')

    if (convParam) {
      setActiveConvId(convParam)
      setShowList(false)
    } else if (listingParam && sellerParam && user) {
      createOrOpenConversation(listingParam, sellerParam)
    }
  }, [searchParamsStr, user, createOrOpenConversation])

  useEffect(() => {
    if (!activeConvId) {
      setActiveConv(null)
      setActiveConversation(null)
      return
    }

    markConversationRead(activeConvId)
    setActiveConversation(activeConvId)

    const found = conversations.find((c) => c.id === activeConvId)
    if (found) {
      setActiveConv(found)
      return
    }

    if (conversations.length === 0 && !convLoading && !fetchedConvRef.current) {
      fetchedConvRef.current = true
      getConversationById(activeConvId).then((conv) => {
        if (conv) setActiveConv(conv)
      })
    }
  }, [activeConvId, conversations, convLoading, markConversationRead, setActiveConversation, getConversationById])

  function handleBack() {
    setActiveConvId(null)
    setActiveConv(null)
    setShowList(true)
    navigate('/messages', { replace: true })
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-gray-500">Sign in to view your messages.</p>
      </div>
    )
  }

  const otherUser = activeConv ? getOtherParticipant(activeConv, user.id) : null

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl flex-col">
      {!isOnline && <ConnectionBanner />}

      <div className="flex flex-1 overflow-hidden">
        {(!isMobile || showList) && (
          <div className={`flex flex-col border-r border-gray-200 bg-white ${
            isMobile ? 'w-full' : 'w-[360px] xl:w-[400px]'
          }`}>
            <ConversationSidebar
              conversations={conversations}
              activeConvId={activeConvId}
              loading={convLoading}
              loadingMore={loadingMore}
              error={convError}
              unreadIds={unreadIds}
              hasMore={convHasMore}
              isOnline={isOnline}
              queueSize={queueSize}
              syncStatus={syncStatus}
              onLoadMore={loadMore}
              onRetry={refetch}
            />
          </div>
        )}

        {(!isMobile || !showList) && (
          <div className="flex flex-1 flex-col bg-gray-50">
            {activeConv ? (
              <>
                {isMobile && (
                  <MobileHeader
                    name={otherUser?.full_name ?? 'Unknown'}
                    avatarUrl={otherUser?.avatar_url}
                    onBack={handleBack}
                  />
                )}

                <ConversationHeader conversation={activeConv} />

                <MessageArea
                  messages={messages}
                  loading={msgLoading}
                  loadingOlder={loadingOlder}
                  error={msgError}
                  hasMore={msgHasMore}
                  onLoadOlder={loadOlder}
                  onEdit={edit}
                  onDelete={remove}
                  onRetry={retry ?? (() => {})}
                />

                <MessageComposer
                  onSend={send}
                  sending={sending}
                  onUpload={upload}
                  onTyping={broadcastTyping}
                />
              </>
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

      <ToastContainer />
    </div>
  )
}
