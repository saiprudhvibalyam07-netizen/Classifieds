import { useEffect, useRef } from 'react'
import type { SupportMessage } from '../types'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { WelcomeMessage } from './WelcomeMessage'
import { EmptyState } from './EmptyState'

interface ChatWindowProps {
  open: boolean
  title: string
  subtitle?: string
  online?: boolean
  welcomeMessage: string
  messages: SupportMessage[]
  typing?: boolean
  inputPlaceholder?: string
  onClose: () => void
  onClear?: () => void
  onSend: (text: string) => void
}

export function ChatWindow({
  open,
  title,
  subtitle,
  online = true,
  welcomeMessage,
  messages,
  typing = false,
  inputPlaceholder,
  onClose,
  onClear,
  onSend,
}: ChatWindowProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  const body =
    messages.length === 0 && welcomeMessage ? (
      <WelcomeMessage message={welcomeMessage} />
    ) : messages.length === 0 ? (
      <EmptyState />
    ) : (
      <MessageList messages={messages} typing={typing} />
    )

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={`${title} support chat`}
      tabIndex={-1}
      className={[
        'fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-300 ease-out',
        'bottom-0 right-0 top-0 w-full sm:bottom-24 sm:right-6 sm:top-auto sm:h-[34rem] sm:w-[24rem] sm:rounded-2xl',
        open
          ? 'translate-y-0 opacity-100 sm:translate-y-0 sm:scale-100'
          : 'pointer-events-none translate-y-full opacity-0 sm:translate-y-4 sm:scale-95',
      ].join(' ')}
    >
      <ChatHeader
        title={title}
        subtitle={subtitle}
        online={online}
        onClose={onClose}
        onClear={onClear}
      />
      {body}
      <MessageInput onSend={onSend} placeholder={inputPlaceholder} />
    </div>
  )
}
