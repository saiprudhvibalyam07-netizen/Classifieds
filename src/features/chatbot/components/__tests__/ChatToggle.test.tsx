import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatToggle } from '../ChatToggle'

describe('ChatToggle', () => {
  it('renders as a button with chat icon when closed', () => {
    render(<ChatToggle isOpen={false} onClick={() => {}} />)
    const button = screen.getByRole('button', { name: /open chat/i })
    expect(button).toBeInTheDocument()
  })

  it('renders close icon when open', () => {
    render(<ChatToggle isOpen={true} onClick={() => {}} />)
    const button = screen.getByRole('button', { name: /close chat/i })
    expect(button).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<ChatToggle isOpen={false} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows unread badge when unreadCount > 0', () => {
    render(<ChatToggle isOpen={false} onClick={() => {}} unreadCount={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows 9+ for large unread counts', () => {
    render(<ChatToggle isOpen={false} onClick={() => {}} unreadCount={15} />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('hides unread badge when chat is open', () => {
    render(<ChatToggle isOpen={true} onClick={() => {}} unreadCount={3} />)
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('has correct aria attributes', () => {
    render(<ChatToggle isOpen={false} onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
  })
})
