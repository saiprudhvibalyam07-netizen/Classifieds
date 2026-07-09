import { ChatProvider, useChatContext } from '../contexts/ChatContext'
import { ChatToggle } from './ChatToggle'
import { ChatPanel } from './ChatPanel'
import { CHATBOT_CONFIG } from '../config'
import { useAuth } from '../../../hooks/useAuth'

function ChatWidgetInner() {
  const { isOpen, toggleChat } = useChatContext()

  if (!CHATBOT_CONFIG.enabled) return null

  return (
    <>
      <ChatToggle isOpen={isOpen} onClick={toggleChat} />
      {isOpen && <ChatPanel />}
    </>
  )
}

export function ChatWidget() {
  const { user } = useAuth()
  // Keying the provider by identity guarantees a full remount (fresh reducer
  // state) whenever the authenticated user changes. This makes it impossible
  // for one account's conversation/messages to persist into another's session,
  // even for a single render frame.
  const identityKey = user?.id ?? 'guest'
  return (
    <ChatProvider key={identityKey}>
      <ChatWidgetInner />
    </ChatProvider>
  )
}