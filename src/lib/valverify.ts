import { supabase } from './supabase'
import type { ValVerifyResult } from '../types/valverify'
import { validateValVerifyResult } from '../types/valverify'

export class ValVerifyRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ValVerifyRequestError'
    this.status = status
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function requestValVerify(listingId: string): Promise<ValVerifyResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new ValVerifyRequestError(401, 'UNAUTHENTICATED', 'Please sign in again before verifying this listing.')
  }

  let response: Response
  try {
    response = await fetch('/api/valverify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ listingId }),
    })
  } catch {
    throw new ValVerifyRequestError(0, 'NETWORK_ERROR', 'The automated verification service could not be reached.')
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    throw new ValVerifyRequestError(response.status, 'INVALID_RESPONSE', 'The automated verification service returned an invalid response.')
  }

  if (isRecord(payload) && validateValVerifyResult(payload)) return payload

  const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null
  const code = typeof error?.code === 'string' ? error.code : 'VERIFICATION_FAILED'
  const message = typeof error?.message === 'string'
    ? error.message
    : 'The automated verification service could not complete this request.'
  throw new ValVerifyRequestError(response.status, code, message)
}

export function describeValVerifyResult(result: ValVerifyResult, action: 'posted' | 'updated' = 'posted'): string {
  const prefix = action === 'updated' ? 'Listing updated.' : 'Listing posted.'
  const moderationNote = action === 'updated' ? ' Moderation status was not changed.' : ' It remains pending Admin approval.'
  if (result.verificationStatus === 'ERROR') {
    return `${prefix} Automated verification is temporarily unavailable.${action === 'posted' ? ' It remains pending Admin review.' : ''}`
  }
  if (result.recommendation === 'APPROVE') {
    return `${prefix} Automated checks passed.${moderationNote}`
  }
  if (result.recommendation === 'REJECT') {
    return `${prefix} Automated checks found issues.${action === 'posted' ? ' It remains pending Admin review.' : ' Admin review may be needed.'}`
  }
  return `${prefix} Automated checks recommend Admin review before publication.${action === 'updated' ? ' Moderation status was not changed.' : ''}`
}
