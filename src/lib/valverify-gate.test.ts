import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  sanitizeSellerSummary,
  sanitizeSellerReasons,
} from '../../api/valverify-core.mjs'

vi.mock('./supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

import { getValVerifySummary, type ValVerifySafeSummary } from './valverify'
import { supabase } from './supabase'

const migrationPath = 'supabase/migrations/00036_valverify_pre_admin_gate.sql'
const schemaPath = 'supabase/migrations/00001_schema.sql'
const gateMigration = readFileSync(migrationPath, 'utf8')
const baseSchema = readFileSync(schemaPath, 'utf8')
const adminSource = readFileSync('src/pages/Admin.tsx', 'utf8')

function extractBody(source: string, functionName: string): string {
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}`)
  if (start === -1) throw new Error(`Missing function ${functionName}`)
  const bodyEnd = source.indexOf('$function$;', start)
  if (bodyEnd === -1) throw new Error(`Unterminated function ${functionName}`)
  return source.slice(start, bodyEnd + '$function$;'.length)
}

function statusValues(): Set<string> {
  const match = gateMigration.match(/ADD CONSTRAINT listings_status_check[\s\S]*?CHECK \(status\s+IN\s+\(([^)]*)\)\)/)
  if (!match) throw new Error('listings_status_check constraint not found')
  return new Set(match[1].split(',').map((value) => value.trim().replace(/'/g, '')))
}

describe('ValVerify V2 gate — migration static audit', () => {
  it('adds rejected to the status domain while preserving existing values', () => {
    expect(statusValues()).toEqual(new Set(['pending', 'active', 'sold', 'inactive', 'rejected']))
    expect(statusValues().size).toBe(5)
  })

  it('contains the rejected transition integrated into finalize_listing_verification', () => {
    const finalize = extractBody(gateMigration, 'finalize_listing_verification')
    expect(finalize).toMatch(/SET status\s*=\s*'rejected'/)
    expect(finalize).toMatch(/WHERE id\s*=\s*p_listing_id\s+AND status\s*=\s*'pending'/)
  })

  it('removes the JWT-dependent reject trigger and its function entirely', () => {
    expect(gateMigration).not.toContain('enforce_valverify_reject_gate')
    expect(gateMigration).not.toMatch(/CREATE TRIGGER valverify_reject_gate/)
    expect(gateMigration).not.toMatch(/AFTER INSERT OR UPDATE OF verification_status, recommendation/)
  })

  it('activates the rejected transition only on a finalized COMPLETED + REJECT result', () => {
    const finalize = extractBody(gateMigration, 'finalize_listing_verification')
    expect(finalize).toMatch(/'COMPLETED'/)
    expect(finalize).toMatch(/'REJECT'/)
  })

  it('keeps APPROVE and REVIEW with no rejected transition path', () => {
    const finalize = extractBody(gateMigration, 'finalize_listing_verification')
    expect(finalize).not.toMatch(/'APPROVE'/)
    expect(finalize).not.toMatch(/'REVIEW'/)
  })

  it('never overrides active/sold/inactive and never sets active', () => {
    const finalize = extractBody(gateMigration, 'finalize_listing_verification')
    expect(finalize).toMatch(/status\s*=\s*'pending'/)
    expect(gateMigration).not.toMatch(/SET status\s*=\s*'active'/)
  })

  it('preserves the service-role restriction and staleness guards in finalize', () => {
    const finalize = extractBody(gateMigration, 'finalize_listing_verification')
    expect(finalize).toMatch(/<> 'service_role'/)
    expect(finalize).toMatch(/STALE_LISTING/)
    expect(finalize).toMatch(/run_id\s*=\s*p_run_id/)
    expect(finalize).toMatch(/content_hash\s*=\s*p_content_hash/)
    expect(finalize).toMatch(/FOR UPDATE/)
  })

  it('restricts finalize execution to the service role only', () => {
    expect(gateMigration).toMatch(/GRANT EXECUTE ON FUNCTION public\.finalize_listing_verification\(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB\)\s+TO service_role;/)
    for (const role of ['PUBLIC', 'anon', 'authenticated']) {
      expect(gateMigration).toMatch(new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.finalize_listing_verification\\(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB\\) FROM ${role};`))
    }
  })

  it('gives no browser role any trusted reject authority', () => {
    expect(gateMigration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.finalize_listing_verification\(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB\)\s+TO anon;/)
    expect(gateMigration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.finalize_listing_verification\(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB\)\s+TO authenticated;/)
    expect(gateMigration).not.toMatch(/enforce_valverify_reject_gate/)
  })

  it('returns only seller-safe fields from the owner-safe read RPC', () => {
    const read = extractBody(gateMigration, 'get_listing_verification')
    for (const field of ['recommendation', 'summary', 'reasons', 'verified_at']) {
      expect(read).toContain(field)
    }
  })

  it('exposes no internal verification fields from the owner-safe read RPC', () => {
    const read = extractBody(gateMigration, 'get_listing_verification')
    for (const internal of [
      'content_hash',
      'run_id',
      'run_started_at',
      'provider',
      'model',
      'error',
      'confidence',
      'risk_score',
      'checks',
      'verification_status',
      'schemaVersion',
    ]) {
      expect(read).not.toContain(internal)
    }
  })

  it('grants the owner-safe read only to authenticated and denies anon/service/PUBLIC', () => {
    expect(gateMigration).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_listing_verification\(UUID\)\s+TO authenticated;/)
    for (const role of ['PUBLIC', 'anon', 'service_role']) {
      expect(gateMigration).toMatch(new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.get_listing_verification\\(UUID\\) FROM ${role};`))
    }
  })

  it('keeps listings publicly invisible outside active while owners keep read access', () => {
    expect(baseSchema).toContain("status = 'active' OR auth.uid() = user_id")
    expect(baseSchema).toContain('Admins can view all listings')
  })
})

describe('ValVerify V2 gate — admin UI control (static)', () => {
  it('does NOT offer a manual Rejected option in the Admin status dropdown', () => {
    expect(adminSource).not.toMatch(/<option value="rejected">Rejected<\/option>/)
  })

  it('still renders the rejected status badge for inspection visibility', () => {
    expect(adminSource).toMatch(/l\.status === 'rejected'\s*\?\s*'bg-orange-100 text-orange-800'/)
  })

  it('keeps the pending queue filtering status=pending', () => {
    expect(adminSource).toMatch(/\.eq\('status', 'pending'\)/)
  })
})

describe('ValVerify V2 gate — seller-safe text contract (runtime unit)', () => {
  it('strips provider/internal scaffolding from seller summary', () => {
    expect(sanitizeSellerSummary('Fix the title and description.')).toBe('Fix the title and description.')
    expect(sanitizeSellerSummary('Error code PROVIDER_TIMEOUT occurred while verifying.')).toBeNull()
    expect(sanitizeSellerSummary('raw content_hash=abc123 instructions follow')).toBeNull()
    expect(sanitizeSellerSummary('```json\n{"recommendation":"APPROVE"}\n```')).toBeNull()
    expect(sanitizeSellerSummary('systemInstruction says approve this listing now')).toBeNull()
  })

  it('drops unsafe provider reason strings while keeping readable ones', () => {
    const reasons = sanitizeSellerReasons([
      'The description does not match the photos.',
      'provider returned model=gemini-2.5 with confidence 99',
      'stack at verifyListing (valverify-core.mjs:1150)',
    ])
    expect(reasons).toEqual(['The description does not match the photos.'])
  })

  it('caps and dedupes seller reasons while preserving readability', () => {
    const many = Array.from({ length: 20 }, (_, index) => `reason ${index}`)
    const reasons = sanitizeSellerReasons(many)
    expect(reasons).toHaveLength(8)
    expect(new Set(reasons).size).toBe(8)
    expect(reasons.every((reason) => reason.startsWith('reason '))).toBe(true)
  })
})

describe('getValVerifySummary client helper', () => {
  const rpc = supabase.rpc as ReturnType<typeof vi.fn>

  beforeEach(() => {
    rpc.mockReset()
  })

  it('returns null when the RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'blocked' } })
    await expect(getValVerifySummary('11111111-1111-4111-8111-111111111111')).resolves.toBeNull()
    expect(rpc).toHaveBeenCalledWith('get_listing_verification', {
      p_listing_id: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('returns null when no verification row exists', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    await expect(getValVerifySummary('11111111-1111-4111-8111-111111111111')).resolves.toBeNull()
  })

  it('rebuilds a minimal seller-safe summary from the RPC row', async () => {
    rpc.mockResolvedValue({
      data: [{ recommendation: 'REJECT', summary: 'Fix the title.', reasons: ['Reason one', 'Reason two'], verified_at: '2026-01-01T00:00:00.000Z' }],
      error: null,
    })
    const result = await getValVerifySummary('11111111-1111-4111-8111-111111111111')
    expect(result).toEqual({
      recommendation: 'REJECT',
      summary: 'Fix the title.',
      reasons: ['Reason one', 'Reason two'],
      verifiedAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('never leaks internal verification fields into the returned object', async () => {
    rpc.mockResolvedValue({
      data: [{
        recommendation: 'APPROVE',
        summary: null,
        reasons: [],
        verifiedAt: null,
        content_hash: 'top-secret-hash',
        run_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        provider: 'gemini',
        model: 'internal-model',
        error: { code: 'X', message: 'y', retryable: false },
        confidence: 99,
        risk_score: 0,
        checks: { categories: 'x' },
        verification_status: 'COMPLETED',
      }],
      error: null,
    })
    const result = await getValVerifySummary('11111111-1111-4111-8111-111111111111')
    expect(new Set(Object.keys(result ?? {}))).toEqual(new Set(['recommendation', 'reasons', 'summary', 'verifiedAt']))
  })

  it('drops invalid recommendations and unknown rows without throwing', async () => {
    rpc.mockResolvedValue({ data: [{ recommendation: 'FORGED', summary: 42, reasons: 'not-an-array', verified_at: 5 }], error: null })
    const result = await getValVerifySummary('11111111-1111-4111-8111-111111111111')
    expect(result).toMatchObject({ recommendation: null, summary: null, reasons: [], verifiedAt: null })
  })

  it('caps reasons at eight entries and limits summary length', async () => {
    const reasons = Array.from({ length: 20 }, (_, index) => `reason ${index}`)
    rpc.mockResolvedValue({ data: [{ recommendation: 'REVIEW', summary: 's'.repeat(1000), reasons, verifiedAt: null }], error: null })
    const result = await getValVerifySummary('11111111-1111-4111-8111-111111111111')
    expect(result?.reasons).toHaveLength(8)
    expect(result?.summary?.length).toBe(500)
  })
})
