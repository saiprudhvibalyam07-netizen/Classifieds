import type { ValVerifyAIAnalysis, ValVerifyResult } from './valverify'
import { validateValVerifyAIAnalysis, validateValVerifyResult } from './valverify'

const check = { status: 'PASS' as const, reason: 'Looks valid.' }

const validAnalysis: ValVerifyAIAnalysis = {
  recommendation: 'APPROVE',
  confidence: 94,
  riskScore: 6,
  checks: {
    title: check,
    description: check,
    category: check,
    price: check,
    location: check,
    images: check,
    consistency: check,
  },
  summary: 'Listing appears meaningful and consistent.',
  reasons: ['The submitted fields agree with one another.'],
}

const validResult: ValVerifyResult = {
  ...validAnalysis,
  schemaVersion: 1,
  verificationStatus: 'COMPLETED',
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  contentHash: 'content-hash-1',
  verifiedAt: '2026-09-05T00:00:00.000Z',
  error: null,
}

describe('validateValVerifyAIAnalysis', () => {
  it('accepts a valid AI analysis', () => {
    expect(validateValVerifyAIAnalysis(validAnalysis)).toBe(true)
  })

  it('rejects server-owned fields in an AI analysis', () => {
    expect(validateValVerifyAIAnalysis({ ...validAnalysis, provider: 'gemini' })).toBe(false)
  })
})

describe('validateValVerifyResult', () => {
  it('accepts a valid completed result', () => {
    expect(validateValVerifyResult(validResult)).toBe(true)
  })

  it('accepts a valid error result only with REVIEW and an error', () => {
    const errorResult: ValVerifyResult = {
      ...validResult,
      verificationStatus: 'ERROR',
      recommendation: 'REVIEW',
      confidence: null,
      riskScore: null,
      error: { code: 'PROVIDER_TIMEOUT', message: 'Provider timed out.', retryable: true },
    }

    expect(validateValVerifyResult(errorResult)).toBe(true)
    expect(validateValVerifyResult({ ...errorResult, recommendation: 'REJECT' })).toBe(false)
    expect(validateValVerifyResult({ ...errorResult, error: null })).toBe(false)
  })

  it('rejects a completed result with an error', () => {
    expect(validateValVerifyResult({
      ...validResult,
      error: { code: 'UNEXPECTED', message: 'Unexpected error.', retryable: false },
    })).toBe(false)
  })

  it('rejects unknown top-level properties', () => {
    expect(validateValVerifyResult({ ...validResult, unexpected: true })).toBe(false)
  })

  it('rejects invalid scores, check reasons, summaries, and reason counts', () => {
    expect(validateValVerifyResult({ ...validResult, confidence: 101 })).toBe(false)
    expect(validateValVerifyResult({
      ...validResult,
      checks: { ...validResult.checks, title: { status: 'PASS', reason: 'x'.repeat(281) } },
    })).toBe(false)
    expect(validateValVerifyResult({ ...validResult, summary: 'x'.repeat(501) })).toBe(false)
    expect(validateValVerifyResult({ ...validResult, reasons: Array.from({ length: 9 }, () => 'reason') })).toBe(false)

    const sparseReasons: string[] = []
    sparseReasons.length = 1
    expect(validateValVerifyResult({ ...validResult, reasons: sparseReasons })).toBe(false)
  })
})
