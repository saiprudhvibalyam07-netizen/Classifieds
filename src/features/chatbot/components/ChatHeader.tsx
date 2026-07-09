import { Bot, X } from 'lucide-react'
import type { ChatbotRole } from '../types'
import { ChatMenu } from './ChatMenu'

interface ChatHeaderProps {
  role: ChatbotRole
  onClose: () => void
  onMinimize?: () => void
  onNewChat: () => void
  onClearConversation: () => void
  onAbout: () => void
}

const roleTitles: Record<ChatbotRole, string> = {
  visitor: 'ValBot Assistant',
  buyer: 'ValBot Assistant',
  seller: 'ValBot Seller Help',
  admin: 'ValBot Admin',
}

export function ChatHeader({ role, onClose, onNewChat, onClearConversation, onAbout }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between rounded-t-xl bg-primary-600 px-4 py-3 text-white">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold leading-tight">{roleTitles[role]}</h2>
          <p className="text-[10px] leading-tight text-white/70">Online</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ChatMenu
          onNewChat={onNewChat}
          onClearConversation={onClearConversation}
          onAbout={onAbout}
        />
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
