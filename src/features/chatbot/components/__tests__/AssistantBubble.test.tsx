import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssistantBubble } from '../AssistantBubble'
import type { ChatbotMessage } from '../../types'

function createAssistantMessage(overrides: Partial<ChatbotMessage> = {}): ChatbotMessage {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Here are some listings for you.',
    createdAt: new Date().toISOString(),
    status: 'sent',
    ...overrides,
  }
}

describe('AssistantBubble', () => {
  it('renders assistant message content', () => {
    render(<AssistantBubble message={createAssistantMessage()} />)
    expect(screen.getByText('Here are some listings for you.')).toBeInTheDocument()
  })

  it('renders bot avatar', () => {
    const { container } = render(<AssistantBubble message={createAssistantMessage()} />)
    const botIcon = container.querySelector('.lucide-bot')
    expect(botIcon).toBeInTheDocument()
  })

  it('shows streaming indicator when isStreaming is true', () => {
    const { container } = render(
      <AssistantBubble message={createAssistantMessage()} isStreaming={true} />
    )
    const pulseElement = container.querySelector('.animate-pulse')
    expect(pulseElement).toBeInTheDocument()
  })
})
