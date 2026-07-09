import { getMemory, deleteMemory, deleteUserMemories } from './memoryStore'
import { buildUserProfile } from './userProfile'
import { logger } from './logger'

const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'pwd',
  'credit_card', 'card_number', 'cvv', 'ccv',
  'aadhaar', 'pan_card', 'ssn', 'social_security',
  'bank_account', 'account_number', 'ifsc', 'routing_number',
  'phone', 'mobile', 'mobile_number', 'contact_number',
])

const SENSITIVE_PATTERNS = [
  /\b(?:\d[ -]*?){13,19}\b/,
  /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/,
  /\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b/,
  /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/,
]

export interface PrivacyFilterResult {
  filtered: boolean
  reason?: string
  sensitiveDataDetected?: string[]
}

export interface PrivacyAuditLog {
  userId: string
  action: string
  timestamp: string
  details: string
}

const auditLogs: PrivacyAuditLog[] = []

export async function filterSensitiveData(
  userId: string | null,
  _sessionId: string | null,
  content: string
): Promise<PrivacyFilterResult> {
  const detected: string[] = []

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      detected.push('potential_payment_info')
      break
    }
  }

  const lower = content.toLowerCase()
  for (const key of SENSITIVE_KEYS) {
    if (lower.includes(key)) {
      detected.push(key)
    }
  }

  if (detected.length > 0) {
    logger.warn('sensitive_data_filtered', { details: { userId, detected } })
    return {
      filtered: true,
      reason: 'Content may contain sensitive personal information',
      sensitiveDataDetected: detected,
    }
  }

  return { filtered: false }
}

export async function scrubSensitiveMemories(userId: string): Promise<number> {
  const memories = await getMemory({ userId, limit: 500 })
  let scrubbed = 0

  for (const memory of memories) {
    if (SENSITIVE_KEYS.has(memory.key)) {
      await deleteMemory(memory.id)
      scrubbed++
      continue
    }
    const valStr = typeof memory.value === 'string' ? memory.value : JSON.stringify(memory.value)
    const result = await filterSensitiveData(userId, null, valStr)
    if (result.filtered) {
      await deleteMemory(memory.id)
      scrubbed++
    }
  }

  if (scrubbed > 0) {
    logger.info('sensitive_memories_scrubbed', { details: { userId, scrubbed } })
    addAuditLog(userId, 'scrub_sensitive_memories', `Scrubbed ${scrubbed} memory entries`)
  }

  return scrubbed
}

export async function exportUserData(userId: string): Promise<object> {
  const profile = await buildUserProfile(userId, 'buyer' as const)
  const memories = await getMemory({ userId, limit: 500 })

  const safeMemories = memories.map((m) => ({
    id: m.id,
    key: m.key,
    scope: m.scope,
    value: m.value,
    confidence: m.confidence,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }))

  const data = {
    userId,
    exportedAt: new Date().toISOString(),
    profile: {
      ...profile,
      preferences: profile.preferences.filter((p) => !SENSITIVE_KEYS.has(p.key)),
    },
    memories: safeMemories,
  }

  logger.info('user_data_exported', { details: { userId, memoryCount: memories.length } })
  addAuditLog(userId, 'export_data', 'User requested data export')

  return data
}

export async function deleteAllUserData(userId: string): Promise<void> {
  const count = await deleteUserMemories(userId)

  logger.info('user_data_deleted', { details: { userId, memoriesDeleted: count } })
  addAuditLog(userId, 'delete_all_data', `Deleted ${count} memory entries`)
}

export interface PrivacySettings {
  memoryEnabled: boolean
  preferenceLearning: boolean
  conversationSummarization: boolean
  dataRetentionDays: number
  allowPersonalization: boolean
}

const userPrivacySettings = new Map<string, PrivacySettings>()

export function getPrivacySettings(userId: string): PrivacySettings {
  return userPrivacySettings.get(userId) ?? {
    memoryEnabled: true,
    preferenceLearning: true,
    conversationSummarization: true,
    dataRetentionDays: 30,
    allowPersonalization: true,
  }
}

export function updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): PrivacySettings {
  const current = getPrivacySettings(userId)
  const updated = { ...current, ...settings }
  userPrivacySettings.set(userId, updated)

  logger.info('privacy_settings_updated', { details: { userId, settings: updated } })
  addAuditLog(userId, 'update_privacy_settings', `Updated privacy settings`)

  return updated
}

export function getAuditLogs(userId?: string): PrivacyAuditLog[] {
  if (userId) {
    return auditLogs.filter((log) => log.userId === userId)
  }
  return [...auditLogs]
}

function addAuditLog(userId: string, action: string, details: string): void {
  auditLogs.push({
    userId,
    action,
    timestamp: new Date().toISOString(),
    details,
  })
}

export function clearAuditLogs(): void {
  auditLogs.length = 0
}
