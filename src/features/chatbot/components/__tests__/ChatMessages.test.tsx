import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessages } from '../ChatMessages'
import type { ChatbotMessage } from '../../types'

describe('ChatMessages', () => {
  const mockMessages: ChatbotMessage[] = [
    {
      id: '1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hello',
      createdAt: new Date().toISOString(),
      status: 'sent',
    },
    {
      id: '2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'Hi there!',
      createdAt: new Date().toISOString(),
      status: 'sent',
    },
  ]

  it('renders messages', () => {
    render(
      <ChatMessages
        messages={mockMessages}
        isTyping={false}
        role="visitor"
        showWelcome={false}
        onPromptClick={() => {}}
        onRetry={() => {}}
      />
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('shows typing indicator when isTyping is true', () => {
    render(
      <ChatMessages
        messages={mockMessages}
        isTyping={true}
        role="visitor"
        showWelcome={false}
        onPromptClick={() => {}}
        onRetry={() => {}}
      />
    )
    expect(screen.getByText('Typing...')).toBeInTheDocument()
  })

  it('shows welcome screen when showWelcome is true and no messages', () => {
    render(
      <ChatMessages
        messages={[]}
        isTyping={false}
        role="visitor"
        showWelcome={true}
        onPromptClick={() => {}}
        onRetry={() => {}}
      />
    )
    expect(screen.getByText('ValBot')).toBeInTheDocument()
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    render(
      <ChatMessages
        messages={mockMessages}
        isTyping={false}
        role="visitor"
        showWelcome={false}
        onPromptClick={() => {}}
        onRetry={() => {}}
      />
    )
    const log = screen.getByRole('log')
    expect(log).toHaveAttribute('aria-label', 'Chat messages')
    expect(log).toHaveAttribute('aria-live', 'polite')
  })
})
