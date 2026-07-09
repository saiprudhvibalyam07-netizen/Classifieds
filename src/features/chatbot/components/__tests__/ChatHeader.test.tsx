import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatHeader } from '../ChatHeader'

describe('ChatHeader', () => {
  it('renders the title for visitor role', () => {
    render(<ChatHeader role="visitor" onClose={() => {}} />)
    expect(screen.getByText('ValBot Assistant')).toBeInTheDocument()
  })

  it('renders the title for admin role', () => {
    render(<ChatHeader role="admin" onClose={() => {}} />)
    expect(screen.getByText('ValBot Admin')).toBeInTheDocument()
  })

  it('renders the title for seller role', () => {
    render(<ChatHeader role="seller" onClose={() => {}} />)
    expect(screen.getByText('ValBot Seller Help')).toBeInTheDocument()
  })

  it('shows online status', () => {
    render(<ChatHeader role="visitor" onClose={() => {}} />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<ChatHeader role="visitor" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close chat'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
