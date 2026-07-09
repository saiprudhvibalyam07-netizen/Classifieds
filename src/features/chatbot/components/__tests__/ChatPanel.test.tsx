import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatProvider } from '../../contexts/ChatContext'
import { ChatPanel } from '../ChatPanel'
import '../../__tests__/setup'

function renderWithProvider() {
  return render(
    <ChatProvider>
      <ChatPanel />
    </ChatProvider>
  )
}

describe('ChatPanel', () => {
  it('renders chat header with role title', () => {
    renderWithProvider()
    expect(screen.getByText('ValBot Assistant')).toBeInTheDocument()
  })

  it('renders chat input', () => {
    renderWithProvider()
    expect(screen.getByLabelText('Message input')).toBeInTheDocument()
  })

  it('has dialog ARIA role', () => {
    renderWithProvider()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    renderWithProvider()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Chat with ValBot')
  })
})
