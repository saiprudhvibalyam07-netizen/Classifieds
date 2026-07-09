import { describe, it, expect, beforeEach } from 'vitest'
import { learnFromMessage, learnViewedListing, getLearnedPreferences } from '../preferenceLearner'
import { clearAllMemories } from '../memoryStore'
import { MEMORY_CONFIG } from '../../config'

describe('PreferenceLearner', () => {
  beforeEach(async () => {
    MEMORY_CONFIG.preferenceLearningEnabled = true
    await clearAllMemories()
  })

  describe('learnFromMessage', () => {
    it('extracts category preferences from user messages', async () => {
      const entries = await learnFromMessage('user-1', null, 'I am looking for a laptop and phone', 'user')
      const cats = entries.filter((e) => e.key === 'preferred_category')
      expect(cats.length).toBeGreaterThanOrEqual(1)
      const catValues = cats.map((c) => c.value)
      expect(catValues).toContain('Electronics')
    })

    it('returns empty for assistant messages', async () => {
      const entries = await learnFromMessage('user-1', null, 'I like electronics', 'assistant')
      expect(entries).toHaveLength(0)
    })

    it('returns empty when learning disabled', async () => {
      MEMORY_CONFIG.preferenceLearningEnabled = false
      const entries = await learnFromMessage('user-1', null, 'I like phones', 'user')
      expect(entries).toHaveLength(0)
    })

    it('extracts budget preferences', async () => {
      const entries = await learnFromMessage('user-1', null, 'Looking for something under 50000', 'user')
      const budgets = entries.filter((e) => e.key === 'budget_under' || e.key === 'budget_conscious')
      expect(budgets.length).toBeGreaterThanOrEqual(1)
    })

    it('extracts location preferences', async () => {
      const entries = await learnFromMessage('user-1', null, 'Looking for apartments in Mumbai', 'user')
      const locs = entries.filter((e) => e.key === 'preferred_location')
      expect(locs.length).toBeGreaterThanOrEqual(1)
      expect(locs[0].value).toBe('Mumbai')
    })

    it('deduplicates and boosts confidence on repeated preferences', async () => {
      await learnFromMessage('user-1', null, 'I like electronics', 'user')
      const entries1 = await getLearnedPreferences('user-1', null)
      const cat1 = entries1.find((e) => e.key === 'preferred_category')
      const conf1 = cat1?.confidence ?? 0

      await learnFromMessage('user-1', null, 'I really like electronics', 'user')
      const entries2 = await getLearnedPreferences('user-1', null)
      const cat2 = entries2.find((e) => e.key === 'preferred_category')
      expect(cat2!.confidence).toBeGreaterThan(conf1)
    })
  })

  describe('learnViewedListing', () => {
    it('stores a viewed listing preference', async () => {
      await learnViewedListing('user-1', null, 'iPhone 15', 'Electronics')
      const prefs = await getLearnedPreferences('user-1', null)
      const catPref = prefs.find((p) => p.key === 'preferred_category')
      expect(catPref).toBeDefined()
      expect(catPref!.value).toBe('Electronics')
    })

    it('does nothing without userId', async () => {
      await learnViewedListing(null, null, 'iPhone 15', 'Electronics')
      const prefs = await getLearnedPreferences(null, null)
      expect(prefs).toHaveLength(0)
    })
  })

  describe('getLearnedPreferences', () => {
    it('returns sorted preferences by confidence', async () => {
      await learnFromMessage('user-1', null, 'I want cheap furniture under 20000 in Delhi', 'user')
      const prefs = await getLearnedPreferences('user-1', null)
      expect(prefs.length).toBeGreaterThan(0)
      for (let i = 1; i < prefs.length; i++) {
        expect(prefs[i - 1].confidence).toBeGreaterThanOrEqual(prefs[i].confidence)
      }
    })

    it('returns empty for unknown user', async () => {
      const prefs = await getLearnedPreferences('unknown', null)
      expect(prefs).toHaveLength(0)
    })
  })
})
