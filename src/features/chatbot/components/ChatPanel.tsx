import { useState } from 'react'
import { useChat } from '../hooks/useChat'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ErrorState } from './ErrorState'
import { AboutValBot } from './AboutValBot'
import { ConfirmDialog } from './ConfirmDialog'

export function ChatPanel() {
  const {
    messages,
    isTyping,
    error,
    role,
    conversation,
    offline,
    closeChat,
    sendMessage,
    retryMessage,
    resetChat,
    startNewConversation,
  } = useChat()

  const [showAbout, setShowAbout] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const showWelcome = true

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleNewChat = async () => {
    resetChat()
    await startNewConversation(role)
  }

  const handleClearConfirm = async () => {
    setShowClearConfirm(false)
    resetChat()
    await startNewConversation(role)
  }

  return (
    <div
      className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 transition-all duration-300"
      style={{ height: 'min(600px, calc(100vh - 120px))' }}
      role="dialog"
      aria-label="Chat with ValBot"
      aria-modal="true"
    >
      <ChatHeader
        role={role}
        onClose={closeChat}
        onNewChat={handleNewChat}
        onClearConversation={() => setShowClearConfirm(true)}
        onAbout={() => setShowAbout(true)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {error && (
          <ErrorState
            message={error}
            onDismiss={() => {}}
          />
        )}

        {offline && (
          <div className="mx-3 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            Temporary offline mode. This conversation will not be saved.
          </div>
        )}

        {!conversation ? (
          error ? (
            <ErrorState message={error} onDismiss={() => {}} />
          ) : (
            <LoadingState message="Starting conversation..." />
          )
        ) : (
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            role={role}
            showWelcome={showWelcome}
            onPromptClick={handlePromptClick}
            onRetry={retryMessage}
          />
        )}

        <ChatInput
          onSend={sendMessage}
          disabled={isTyping || !conversation}
          placeholder="Ask me anything about ValClassifieds..."
        />
      </div>

      {showAbout && <AboutValBot onClose={() => setShowAbout(false)} />}

      {showClearConfirm && (
        <ConfirmDialog
          title="Clear Conversation"
          message="This will remove all messages from this chat. Are you sure you want to continue?"
          confirmLabel="Clear"
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-xs text-gray-500">{message}</p>
      </div>
    </div>
  )
}
