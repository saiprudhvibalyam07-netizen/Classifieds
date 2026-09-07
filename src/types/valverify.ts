export type ValVerifyRecommendation = 'APPROVE' | 'REVIEW' | 'REJECT'

export type ValVerifyCheckStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT_RUN'

export type ValVerifyRunStatus = 'RUNNING' | 'COMPLETED' | 'ERROR'

export type ValVerifyCheck = {
  status: ValVerifyCheckStatus
  reason: string
}

export type ValVerifyError = {
  code: string
  message: string
  retryable: boolean
}

export type ValVerifyChecks = {
  title: ValVerifyCheck
  description: ValVerifyCheck
  category: ValVerifyCheck
  price: ValVerifyCheck
  location: ValVerifyCheck
  images: ValVerifyCheck
  consistency: ValVerifyCheck
}

export type ValVerifyAIAnalysis = {
  recommendation: ValVerifyRecommendation | null
  confidence: number | null
  riskScore: number | null
  checks: ValVerifyChecks
  summary: string | null
  reasons: string[]
}

export type ValVerifyServerMetadata = {
  schemaVersion: 1
  verificationStatus: ValVerifyRunStatus
  provider: 'gemini' | null
  model: string | null
  contentHash: string
  verifiedAt: string | null
  error: ValVerifyError | null
}

export type ValVerifyResult = ValVerifyAIAnalysis & ValVerifyServerMetadata

const CHECK_GROUPS = [
  'title',
  'description',
  'category',
  'price',
  'location',
  'images',
  'consistency',
] as const

const CHECK_STATUSES: ValVerifyCheckStatus[] = ['PASS', 'WARNING', 'FAIL', 'NOT_RUN']
const RECOMMENDATIONS: ValVerifyRecommendation[] = ['APPROVE', 'REVIEW', 'REJECT']
const RUN_STATUSES: ValVerifyRunStatus[] = ['RUNNING', 'COMPLETED', 'ERROR']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const expected = new Set(keys)
  const actual = Object.keys(value)

  return actual.length === expected.size && actual.every((key) => expected.has(key))
}

function isCheckStatus(value: unknown): value is ValVerifyCheckStatus {
  return typeof value === 'string' && CHECK_STATUSES.includes(value as ValVerifyCheckStatus)
}

function isRecommendation(value: unknown): value is ValVerifyRecommendation {
  return typeof value === 'string' && RECOMMENDATIONS.includes(value as ValVerifyRecommendation)
}

function isRunStatus(value: unknown): value is ValVerifyRunStatus {
  return typeof value === 'string' && RUN_STATUSES.includes(value as ValVerifyRunStatus)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNullableScore(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100)
}

function isValVerifyCheck(value: unknown): value is ValVerifyCheck {
  if (!isRecord(value) || !hasExactKeys(value, ['status', 'reason'])) return false

  return isCheckStatus(value.status) && typeof value.reason === 'string' && value.reason.length <= 280
}

function isValVerifyChecks(value: unknown): value is ValVerifyChecks {
  if (!isRecord(value) || !hasExactKeys(value, CHECK_GROUPS)) return false

  return CHECK_GROUPS.every((group) => isValVerifyCheck(value[group]))
}

function isValVerifyError(value: unknown): value is ValVerifyError {
  if (!isRecord(value) || !hasExactKeys(value, ['code', 'message', 'retryable'])) return false

  return typeof value.code === 'string'
    && typeof value.message === 'string'
    && typeof value.retryable === 'boolean'
}

function isReasons(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length > 8) return false

  for (const reason of value) {
    if (typeof reason !== 'string') return false
  }

  return true
}

function hasValidAnalysisFields(value: Record<string, unknown>): boolean {
  return (value.recommendation === null || isRecommendation(value.recommendation))
    && isNullableScore(value.confidence)
    && isNullableScore(value.riskScore)
    && isValVerifyChecks(value.checks)
    && (value.summary === null || (typeof value.summary === 'string' && value.summary.length <= 500))
    && isReasons(value.reasons)
}

function isValVerifyAnalysis(value: Record<string, unknown>): value is ValVerifyAIAnalysis {
  return hasExactKeys(value, ['recommendation', 'confidence', 'riskScore', 'checks', 'summary', 'reasons'])
    && hasValidAnalysisFields(value)
}

/** Returns true only when an untrusted AI analysis matches the shared shape. */
export function validateValVerifyAIAnalysis(input: unknown): input is ValVerifyAIAnalysis {
  return isRecord(input) && isValVerifyAnalysis(input)
}

/** Returns true only when an untrusted value matches the complete ValVerify result. */
export function validateValVerifyResult(input: unknown): input is ValVerifyResult {
  if (!isRecord(input)) return false

  const serverKeys = [
    'schemaVersion',
    'verificationStatus',
    'provider',
    'model',
    'contentHash',
    'verifiedAt',
    'error',
  ] as const

  if (!hasExactKeys(input, [
    'recommendation',
    'confidence',
    'riskScore',
    'checks',
    'summary',
    'reasons',
    ...serverKeys,
  ])) return false

  if (!hasValidAnalysisFields(input)) return false
  if (input.schemaVersion !== 1 || !isRunStatus(input.verificationStatus)) return false
  if (input.provider !== null && input.provider !== 'gemini') return false
  if (input.model !== null && typeof input.model !== 'string') return false
  if (typeof input.contentHash !== 'string') return false
  if (!isNullableString(input.verifiedAt)) return false

  const errorIsValid = input.error === null || isValVerifyError(input.error)
  if (!errorIsValid) return false

  if (input.verificationStatus === 'ERROR') {
    return input.recommendation === 'REVIEW' && input.error !== null
  }

  return input.verificationStatus !== 'COMPLETED' || input.error === null
}
