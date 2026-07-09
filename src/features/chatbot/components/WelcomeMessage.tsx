import { Bot } from 'lucide-react'
import type { ChatbotRole } from '../types'
import { mockConversationProvider } from '../services/mockConversationProvider'
import { SuggestedPrompts } from './SuggestedPrompts'

interface WelcomeMessageProps {
  role: ChatbotRole
  onPromptClick: (prompt: string) => void
}

export function WelcomeMessage({ role, onPromptClick }: WelcomeMessageProps) {
  const prompts = mockConversationProvider.getStarterPrompts(role)

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
          <Bot className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">ValBot</p>
          <p className="text-xs text-gray-500">AI Assistant</p>
        </div>
      </div>
      <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        <p className="leading-relaxed">{mockConversationProvider.getRoleResponse(role)}</p>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-gray-500">Try asking:</p>
        <SuggestedPrompts prompts={prompts} onPromptClick={onPromptClick} />
      </div>
    </div>
  )
}
