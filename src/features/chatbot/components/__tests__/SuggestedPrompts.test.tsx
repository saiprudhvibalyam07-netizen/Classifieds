import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestedPrompts } from '../SuggestedPrompts'

describe('SuggestedPrompts', () => {
  it('renders all prompts', () => {
    const prompts = ['What is this?', 'Browse categories', 'Help me buy']
    render(<SuggestedPrompts prompts={prompts} onPromptClick={() => {}} />)
    prompts.forEach((p) => {
      expect(screen.getByText(p)).toBeInTheDocument()
    })
  })

  it('calls onPromptClick when a prompt is clicked', () => {
    const onPromptClick = vi.fn()
    render(<SuggestedPrompts prompts={['Browse categories']} onPromptClick={onPromptClick} />)
    fireEvent.click(screen.getByText('Browse categories'))
    expect(onPromptClick).toHaveBeenCalledWith('Browse categories')
  })

  it('returns null for empty prompts', () => {
    const { container } = render(<SuggestedPrompts prompts={[]} onPromptClick={() => {}} />)
    expect(container.innerHTML).toBe('')
  })
})
