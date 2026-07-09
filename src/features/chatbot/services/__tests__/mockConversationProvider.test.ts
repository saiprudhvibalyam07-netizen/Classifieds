import { describe, it, expect } from 'vitest'
import { mockConversationProvider } from '../mockConversationProvider'

describe('mockConversationProvider', () => {
  it('returns greeting response for empty messages', async () => {
    const response = await mockConversationProvider.sendMessage('', 'visitor')
    expect(response.content).toContain('Welcome')
    expect(response.delay).toBeGreaterThanOrEqual(800)
    expect(response.delay).toBeLessThanOrEqual(2000)
  })

  it('returns greeting for hi/hello', async () => {
    const res1 = await mockConversationProvider.sendMessage('hi', 'visitor')
    expect(res1.content).toContain('Welcome')

    const res2 = await mockConversationProvider.sendMessage('Hello', 'buyer')
    expect(res2.content).toContain('search listings')
  })

  it('returns role-specific responses', async () => {
    const visitor = await mockConversationProvider.sendMessage('hi', 'visitor')
    expect(visitor.content).toContain('Welcome')

    const buyer = await mockConversationProvider.sendMessage('hi', 'buyer')
    expect(buyer.content).toContain('search listings')

    const seller = await mockConversationProvider.sendMessage('hi', 'seller')
    expect(seller.content).toContain('manage your listings')

    const admin = await mockConversationProvider.sendMessage('hi', 'admin')
    expect(admin.content).toContain('administration')
  })

  it('returns goodbye response', async () => {
    const response = await mockConversationProvider.sendMessage('thanks bye', 'visitor')
    expect(response.content).toContain('welcome')
  })

  it('returns category response', async () => {
    const response = await mockConversationProvider.sendMessage('show me categories', 'visitor')
    expect(response.content).toContain('Mobiles')
    expect(response.content).toContain('Vehicles')
  })

  it('returns buying response', async () => {
    const response = await mockConversationProvider.sendMessage('how to buy', 'buyer')
    expect(response.content).toContain('Buying')
  })

  it('returns selling response', async () => {
    const response = await mockConversationProvider.sendMessage('how to sell', 'seller')
    expect(response.content).toContain('listing')
  })

  it('returns safety response', async () => {
    const response = await mockConversationProvider.sendMessage('is it safe', 'visitor')
    expect(response.content).toContain('Safety')
  })

  it('returns policy response', async () => {
    const response = await mockConversationProvider.sendMessage('what are the fees', 'visitor')
    expect(response.content).toContain('free')
  })

  it('returns follow-up for unrecognized queries', async () => {
    const response = await mockConversationProvider.sendMessage('xylophone pricing', 'visitor')
    expect(response.content.length).toBeGreaterThan(0)
  })

  it('provides starter prompts for each role', () => {
    const visitorPrompts = mockConversationProvider.getStarterPrompts('visitor')
    expect(visitorPrompts.length).toBeGreaterThan(0)
    expect(visitorPrompts.length).toBeLessThanOrEqual(4)

    const adminPrompts = mockConversationProvider.getStarterPrompts('admin')
    expect(adminPrompts.length).toBeGreaterThan(0)
  })

  it('falls back to visitor prompts for unknown roles', () => {
    const prompts = mockConversationProvider.getStarterPrompts('unknown' as never)
    expect(prompts.length).toBeGreaterThan(0)
  })
})
