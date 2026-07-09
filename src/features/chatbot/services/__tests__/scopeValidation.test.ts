import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../promptBuilder'
import { validateResponse } from '../responseValidator'

describe('Scope Validation — Out-of-Domain Refusal', () => {
  describe('System Prompt — Scope Restrictions', () => {
    const prompt = buildSystemPrompt('visitor')

    it('limits to ValClassifieds marketplace', () => {
      expect(prompt).toContain('ValClassifieds')
    })

    it('defines marketplace scope section', () => {
      expect(prompt).toContain('Marketplace Scope')
    })

    it('covers posting and managing listings', () => {
      expect(prompt).toContain('Posting, editing, and managing listings')
    })

    it('covers browsing and searching', () => {
      expect(prompt).toContain('Browsing, searching, and filtering listings')
    })

    it('covers categories and item types', () => {
      expect(prompt).toContain('Categories and item types')
    })

    it('covers account management', () => {
      expect(prompt).toContain('Account creation and management')
    })

    it('covers platform policies', () => {
      expect(prompt).toContain('Platform policies, fees, and guidelines')
    })
  })

  describe('Out-of-Scope Topics', () => {
    const prompt = buildSystemPrompt('visitor')

    const outOfScopeTopics = [
      { topic: 'general knowledge', keyword: 'General knowledge' },
      { topic: 'weather', keyword: 'Weather' },
      { topic: 'news', keyword: 'Current events' },
    ]

    outOfScopeTopics.forEach(({ topic, keyword }) => {
      it(`does not claim ability for: ${topic}`, () => {
        expect(prompt).not.toContain(keyword)
      })
    })
  })

  describe('Response Validator — False Positive Guard', () => {
    const safeMarketplaceResponses = [
      'You can browse items by using the search bar at the top of the page.',
      'To post a listing, click the Create Listing button and fill in the details.',
      'Our categories include Electronics, Furniture, Vehicles, and more.',
      'Safety tip: always meet in a public place when exchanging items.',
      'You can edit your listing by going to My Listings and clicking Edit.',
      'Account registration is free and takes only a few minutes.',
      'Please contact our support team for help with account issues.',
      'I recommend checking our safety guidelines before making a purchase.',
      'You can filter search results by price range and location.',
    ]

    safeMarketplaceResponses.forEach((response) => {
      it(`allows valid marketplace response: ${response.slice(0, 40)}`, () => {
        expect(validateResponse(response).valid).toBe(true)
      })
    })
  })
})
