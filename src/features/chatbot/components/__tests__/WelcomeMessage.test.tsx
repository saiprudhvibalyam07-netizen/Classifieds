import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeMessage } from '../WelcomeMessage'

describe('WelcomeMessage', () => {
  it('renders welcome text for visitor role', () => {
    render(<WelcomeMessage role="visitor" onPromptClick={() => {}} />)
    expect(screen.getByText('ValBot')).toBeInTheDocument()
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('renders starter prompts', () => {
    render(<WelcomeMessage role="visitor" onPromptClick={() => {}} />)
    const prompts = screen.getAllByRole('button')
    expect(prompts.length).toBeGreaterThan(0)
  })

  it('calls onPromptClick when prompt is clicked', () => {
    const onPromptClick = vi.fn()
    render(<WelcomeMessage role="visitor" onPromptClick={onPromptClick} />)
    const prompts = screen.getAllByRole('button')
    if (prompts.length > 0) {
      fireEvent.click(prompts[0])
      expect(onPromptClick).toHaveBeenCalledTimes(1)
    }
  })
})
