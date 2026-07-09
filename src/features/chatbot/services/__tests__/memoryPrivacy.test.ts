import { describe, it, expect, beforeEach } from 'vitest'
import {
  filterSensitiveData, scrubSensitiveMemories, exportUserData, deleteAllUserData,
  getPrivacySettings, updatePrivacySettings, getAuditLogs, clearAuditLogs,
} from '../memoryPrivacy'
import { clearAllMemories, storeMemory } from '../memoryStore'
import type { MemoryEntry } from '../../types'

describe('MemoryPrivacy', () => {
  beforeEach(async () => {
    await clearAllMemories()
    clearAuditLogs()
  })

  describe('filterSensitiveData', () => {
    it('detects credit card numbers', async () => {
      const result = await filterSensitiveData('user-1', null, 'My card is 4111 1111 1111 1111')
      expect(result.filtered).toBe(true)
      expect(result.sensitiveDataDetected).toBeDefined()
      expect(result.sensitiveDataDetected!.length).toBeGreaterThan(0)
    })

    it('detects Aadhaar-like numbers', async () => {
      const result = await filterSensitiveData('user-1', null, 'My Aadhaar is 1234 5678 9012')
      expect(result.filtered).toBe(true)
    })

    it('detects sensitive key words', async () => {
      const result = await filterSensitiveData('user-1', null, 'My password is secret123')
      expect(result.filtered).toBe(true)
    })

    it('allows normal content through', async () => {
      const result = await filterSensitiveData('user-1', null, 'I am looking for a laptop in Mumbai')
      expect(result.filtered).toBe(false)
    })
  })

  describe('scrubSensitiveMemories', () => {
    it('removes entries with sensitive data', async () => {
      await storeMemory({
        id: 'mem-1', userId: 'user-1', sessionId: null, scope: 'preference',
        key: 'password', value: 'secret123', confidence: 0.5,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null,
      })
      await storeMemory({
        id: 'mem-2', userId: 'user-1', sessionId: null, scope: 'preference',
        key: 'color', value: 'blue', confidence: 0.5,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null,
      })
      const scrubbed = await scrubSensitiveMemories('user-1')
      expect(scrubbed).toBe(1)
    })

    it('returns 0 when no sensitive data found', async () => {
      await storeMemory({
        id: 'mem-1', userId: 'user-1', sessionId: null, scope: 'preference',
        key: 'color', value: 'blue', confidence: 0.5,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null,
      })
      const scrubbed = await scrubSensitiveMemories('user-1')
      expect(scrubbed).toBe(0)
    })
  })

  describe('exportUserData', () => {
    it('exports user data without sensitive fields', async () => {
      await storeMemory({
        id: 'mem-1', userId: 'user-1', sessionId: null, scope: 'preference',
        key: 'color', value: 'blue', confidence: 0.5,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null,
      })
      const data = await exportUserData('user-1')
      expect(data).toHaveProperty('userId', 'user-1')
      expect(data).toHaveProperty('exportedAt')
      expect(data).toHaveProperty('profile')
      expect(data).toHaveProperty('memories')
      expect((data as any).memories).toHaveLength(1)
    })
  })

  describe('deleteAllUserData', () => {
    it('deletes all memories for a user', async () => {
      await storeMemory({
        id: 'mem-1', userId: 'user-1', sessionId: null, scope: 'preference',
        key: 'color', value: 'blue', confidence: 0.5,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null,
      })
      await deleteAllUserData('user-1')
      const logs = getAuditLogs('user-1')
      expect(logs.length).toBeGreaterThanOrEqual(1)
      expect(logs.some((l) => l.action === 'delete_all_data')).toBe(true)
    })
  })

  describe('privacy settings', () => {
    it('returns defaults for new user', () => {
      const settings = getPrivacySettings('new-user')
      expect(settings.memoryEnabled).toBe(true)
      expect(settings.preferenceLearning).toBe(true)
      expect(settings.conversationSummarization).toBe(true)
      expect(settings.dataRetentionDays).toBe(30)
      expect(settings.allowPersonalization).toBe(true)
    })

    it('updates settings for a user', () => {
      const updated = updatePrivacySettings('user-1', { memoryEnabled: false, dataRetentionDays: 7 })
      expect(updated.memoryEnabled).toBe(false)
      expect(updated.dataRetentionDays).toBe(7)
      expect(updated.preferenceLearning).toBe(true)
      const current = getPrivacySettings('user-1')
      expect(current.memoryEnabled).toBe(false)
    })

    it('logs privacy setting changes', () => {
      updatePrivacySettings('user-1', { memoryEnabled: false })
      const logs = getAuditLogs('user-1')
      expect(logs.length).toBeGreaterThanOrEqual(1)
      expect(logs[0].action).toBe('update_privacy_settings')
    })
  })

  describe('getAuditLogs', () => {
    it('returns logs filtered by userId', () => {
      updatePrivacySettings('user-1', { memoryEnabled: false })
      updatePrivacySettings('user-2', { preferenceLearning: false })
      const user1Logs = getAuditLogs('user-1')
      expect(user1Logs.every((l) => l.userId === 'user-1')).toBe(true)
      expect(user1Logs.length).toBeGreaterThanOrEqual(1)
      const allLogs = getAuditLogs()
      expect(allLogs.length).toBeGreaterThanOrEqual(2)
    })
  })
})
