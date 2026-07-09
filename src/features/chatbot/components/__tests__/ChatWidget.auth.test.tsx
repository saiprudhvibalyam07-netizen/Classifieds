import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Control the current auth user without mounting the full AuthProvider.
const authRef = vi.hoisted(() => ({ user: null as any }))
vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => authRef.user,
}))

// Controllable conversation persistence layer.
const cm = vi.hoisted(() => ({
  getActiveConversation: vi.fn(),
  getMessages: vi.fn(),
  createConversation: vi.fn(),
  saveMessage: vi.fn(),
  resetSession: vi.fn(),
}))
vi.mock('../../services/conversationManager', () => ({ conversationManager: cm }))

// Deterministic assistant responses so send flows resolve without the network.
vi.mock('../../services/provider', () => ({
  getConversationProvider: () => ({
    sendMessage: vi.fn(async (_content: string, _role: string, opts?: { onToken?: (t: string) => void }) => {
      opts?.onToken?.('reply')
      return { content: 'reply', delay: 0 }
    }),
    getRoleResponse: () => '',
    getStarterPrompts: () => [],
  }),
}))

import { ChatWidget } from '../ChatWidget'

function makeConv(userId: string | null) {
  return {
    id: `conv-${userId ?? 'guest'}`,
    userId,
    sessionId: null,
    role: 'visitor' as const,
    title: null,
    status: 'active' as const,
    messageCount: 0,
    lastActivity: new Date().toISOString(),
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function authValue(user: { id: string; role: string } | null) {
  return {
    user,
    profile: user ? { role: user.role } : null,
    loading: false,
    signOut: async () => {},
  }
}

const idOf = (user: { id: string; role: string } | null) => user?.id ?? 'guest'

let msgCounter = 0
beforeEach(() => {
  vi.clearAllMocks()
  msgCounter = 0
  cm.getActiveConversation.mockImplementation((userId: string | null) =>
    Promise.resolve(makeConv(userId))
  )
  cm.getMessages.mockResolvedValue([])
  cm.createConversation.mockImplementation((userId: string | null) =>
    Promise.resolve(makeConv(userId))
  )
  cm.saveMessage.mockImplementation((_convId: string, role: 'user' | 'assistant', content: string) =>
    Promise.resolve({
      id: `msg-${role}-${msgCounter++}`,
      conversationId: 'conv-x',
      role,
      content,
      createdAt: new Date().toISOString(),
      status: 'sent' as const,
    })
  )
  cm.resetSession.mockClear()
})

async function openAndSend(user: { id: string; role: string } | null, label: string) {
  authRef.user = authValue(user)
  fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
  await waitFor(() => expect(screen.getByLabelText('Message input')).not.toBeDisabled())
  const input = screen.getByLabelText('Message input')
  fireEvent.change(input, { target: { value: label } })
  fireEvent.click(screen.getByLabelText('Send message'))
  await screen.findByText(label)
}

describe('Chatbot cross-user data isolation', () => {
  const cases: Array<[string, { id: string; role: string } | null, { id: string; role: string } | null]> = [
    ['User A → User B', { id: 'A', role: 'buyer' }, { id: 'B', role: 'seller' }],
    ['Guest → User', null, { id: 'U1', role: 'buyer' }],
    ['User → Guest', { id: 'U2', role: 'buyer' }, null],
    ['Buyer → Seller', { id: 'B1', role: 'buyer' }, { id: 'S1', role: 'seller' }],
    ['Seller → Buyer', { id: 'S2', role: 'seller' }, { id: 'B2', role: 'buyer' }],
    ['Admin → User', { id: 'ADM', role: 'admin' }, { id: 'U3', role: 'buyer' }],
  ]

  it.each(cases)('%s: previous user messages never appear for the next user', async (_name, from, to) => {
    const fromLabel = `msg-${idOf(from)}`
    const toLabel = `msg-${idOf(to)}`

    authRef.user = authValue(from)
    const { rerender } = render(<ChatWidget />)

    await openAndSend(from, fromLabel)

    // Switch accounts.
    authRef.user = authValue(to)
    rerender(<ChatWidget />)

    // Immediately after switching, the previous user's message must be gone:
    // the provider remounts with fresh state and clears all caches.
    expect(screen.queryByText(fromLabel)).not.toBeInTheDocument()
    expect(cm.resetSession).toHaveBeenCalled()

    // The next user opens the chat and starts a fresh conversation.
    await openAndSend(to, toLabel)

    // The previous user's data must never resurface.
    expect(screen.queryByText(fromLabel)).not.toBeInTheDocument()
    expect(screen.getByText(toLabel)).toBeInTheDocument()
  })

  it('clears caches when the widget unmounts', async () => {
    authRef.user = authValue({ id: 'X', role: 'buyer' })
    const { unmount } = render(<ChatWidget />)
    await openAndSend({ id: 'X', role: 'buyer' }, 'msg-X')
    unmount()
    expect(cm.resetSession).toHaveBeenCalled()
  })

  it('preserves the conversation when the same user closes and reopens', async () => {
    authRef.user = authValue({ id: 'A', role: 'buyer' })
    render(<ChatWidget />)
    await openAndSend({ id: 'A', role: 'buyer' }, 'msg-A')

    // Close, then reopen — no identity change, so state must persist.
    fireEvent.click(screen.getAllByRole('button', { name: /close chat/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))

    // The previous message is visible immediately; no reload, no clearing.
    expect(screen.getByText('msg-A')).toBeInTheDocument()
    // Reopen did not re-fetch or reset the session.
    expect(cm.getActiveConversation).toHaveBeenCalledTimes(1)
    expect(cm.resetSession).not.toHaveBeenCalled()
  })
})
