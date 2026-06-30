import { describe, it, expect } from 'vitest'
import { formatConversationDate, getOtherParticipant } from '../utils/messageUtils'
import type { ChatConversation } from '../types'

describe('formatConversationDate', () => {
  it('returns "just now" equivalent for recent dates', () => {
    const result = formatConversationDate(new Date().toISOString())
    expect(result).toBeTruthy()
  })

  it('returns "Yesterday" for one day ago', () => {
    const d = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
    expect(formatConversationDate(d)).toBe('Yesterday')
  })
})

describe('getOtherParticipant', () => {
  const user1 = { id: 'user-1', full_name: 'Alice', avatar_url: null }
  const user2 = { id: 'user-2', full_name: 'Bob', avatar_url: null }

  const conv: ChatConversation = {
    id: 'conv-1',
    listing_id: 'listing-1',
    seller_id: 'user-1',
    buyer_id: 'user-2',
    title: null,
    is_group: false,
    seller: user1,
    buyer: user2,
    last_message: null,
    last_message_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  it('returns the seller when current user is the buyer', () => {
    const other = getOtherParticipant(conv, 'user-2')
    expect(other?.id).toBe('user-1')
    expect(other?.full_name).toBe('Alice')
  })

  it('returns the buyer when current user is the seller', () => {
    const other = getOtherParticipant(conv, 'user-1')
    expect(other?.id).toBe('user-2')
    expect(other?.full_name).toBe('Bob')
  })

  it('returns undefined for unknown user', () => {
    const other = getOtherParticipant(conv, 'unknown')
    expect(other).toBeUndefined()
  })
})
