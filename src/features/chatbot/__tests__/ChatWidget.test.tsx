import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatWidget } from '../components/ChatWidget'
import './setup'

describe('ChatWidget', () => {
  it('renders the floating toggle button', () => {
    render(<ChatWidget />)
    const toggle = screen.getByRole('button', { name: /open chat/i })
    expect(toggle).toBeInTheDocument()
  })

  it('opens the chat panel when toggle is clicked', () => {
    render(<ChatWidget />)
    const toggle = screen.getByRole('button', { name: /open chat/i })
    fireEvent.click(toggle)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes the chat panel when close is clicked', () => {
    render(<ChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const closeButtons = screen.getAllByLabelText('Close chat')
    expect(closeButtons.length).toBeGreaterThanOrEqual(1)
    fireEvent.click(closeButtons[0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the chat header when opened', () => {
    render(<ChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
    expect(screen.getByText('ValBot Assistant')).toBeInTheDocument()
  })

  it('shows chat input when opened', () => {
    render(<ChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
    expect(screen.getByLabelText('Message input')).toBeInTheDocument()
  })
})
