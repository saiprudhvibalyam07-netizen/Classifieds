import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageBubble } from '../MessageBubble'
import type { ChatbotMessage } from '../../types'

function createUserMessage(overrides: Partial<ChatbotMessage> = {}): ChatbotMessage {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello',
    createdAt: new Date().toISOString(),
    status: 'sent',
    ...overrides,
  }
}

describe('MessageBubble', () => {
  it('renders user message content', () => {
    render(<MessageBubble message={createUserMessage({ content: 'How do I sell?' })} />)
    expect(screen.getByText('How do I sell?')).toBeInTheDocument()
  })

  it('returns null for assistant messages', () => {
    const assistantMsg: ChatbotMessage = {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'I can help you sell',
      createdAt: new Date().toISOString(),
      status: 'sent',
    }
    const { container } = render(<MessageBubble message={assistantMsg} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows failed status with retry button', () => {
    const onRetry = vi.fn()
    render(
      <MessageBubble
        message={createUserMessage({ status: 'failed' })}
        onRetry={onRetry}
      />
    )
    expect(screen.getByText('Failed')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Retry sending message'))
    expect(onRetry).toHaveBeenCalledWith('msg-1')
  })

  it('shows sending status indicator', () => {
    const { container } = render(
      <MessageBubble message={createUserMessage({ status: 'sending' })} />
    )
    const checkIcon = container.querySelector('.lucide-check')
    expect(checkIcon).toBeInTheDocument()
  })

  it('shows sent status indicator', () => {
    const { container } = render(
      <MessageBubble message={createUserMessage({ status: 'sent' })} />
    )
    const checkCheckIcon = container.querySelector('.lucide-check-check')
    expect(checkCheckIcon).toBeInTheDocument()
  })
})
