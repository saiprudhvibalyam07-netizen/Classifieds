import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatWidget } from '../ChatWidget'

describe('ChatWidget', () => {
  it('renders the chat toggle button', () => {
    render(<ChatWidget />)
    const toggle = screen.getByRole('button', { name: /open chat/i })
    expect(toggle).toBeInTheDocument()
  })

  it('does not render panel initially', () => {
    render(<ChatWidget />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
