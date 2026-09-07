import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import {
  ValVerifyHttpError,
  isUuid,
  verifyListing,
  checkRateLimit,
} from './valverify-core.mjs'

const MAX_BODY_BYTES = 16 * 1024

function sendJson(res, status, payload) {
  if (typeof res.status === 'function') {
    res.status(status)
  } else {
    res.statusCode = status
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

function errorPayload(code, message) {
  return { error: { code, message } }
}

function requestHeader(req, name) {
  const headers = req?.headers ?? {}
  return headers[name] ?? headers[name.toLowerCase()] ?? null
}

function bearerToken(req) {
  const authorization = requestHeader(req, 'authorization')
  if (typeof authorization !== 'string') return null
  const match = authorization.match(/^Bearer\s+(\S+)$/i)
  return match && match[1].length <= 4096 ? match[1] : null
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      try {
        if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_BODY_BYTES) {
          throw new ValVerifyHttpError(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
        }
      } catch (error) {
        if (error instanceof ValVerifyHttpError) throw error
        throw new ValVerifyHttpError(400, 'INVALID_REQUEST', 'Request body must be valid JSON.')
      }
      return req.body
    }
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body)
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      throw new ValVerifyHttpError(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
    }
    try {
      return JSON.parse(raw)
    } catch {
      throw new ValVerifyHttpError(400, 'INVALID_JSON', 'Request body must be valid JSON.')
    }
  }

  if (typeof req?.[Symbol.asyncIterator] !== 'function') return null
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    total += buffer.length
    if (total > MAX_BODY_BYTES) {
      throw new ValVerifyHttpError(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
    }
    chunks.push(buffer)
  }
  if (chunks.length === 0) return null
  try {
    return JSON.parse(Buffer.concat(chunks, total).toString('utf8'))
  } catch {
    throw new ValVerifyHttpError(400, 'INVALID_JSON', 'Request body must be valid JSON.')
  }
}

function parseListingId(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValVerifyHttpError(400, 'INVALID_REQUEST', 'Request body must contain only listingId.')
  }
  const keys = Object.keys(body)
  if (keys.length !== 1 || keys[0] !== 'listingId' || !isUuid(body.listingId)) {
    throw new ValVerifyHttpError(400, 'INVALID_LISTING_ID', 'listingId must be a valid UUID.')
  }
  return body.listingId
}

function serverConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new ValVerifyHttpError(500, 'SERVER_CONFIG_MISSING', 'Verification service is not configured.')
  }
  try {
    if (new URL(supabaseUrl).protocol !== 'https:') throw new Error('invalid protocol')
  } catch {
    throw new ValVerifyHttpError(500, 'SERVER_CONFIG_MISSING', 'Verification service is not configured.')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    geminiKey: process.env.GEMINI_API_KEY || null,
    geminiModel: process.env.GEMINI_MODEL || null,
  }
}

function clientOptions() {
  return {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  }
}

async function loadCanonical(serviceClient, listingId, includeVerification = true) {
  const listingResult = await serviceClient
    .from('listings')
    .select('id,title,description,price,category_id,user_id,location,latitude,longitude,address,city,state,condition,status,updated_at')
    .eq('id', listingId)
    .maybeSingle()

  if (listingResult.error) {
    throw new ValVerifyHttpError(500, 'CANONICAL_READ_FAILED', 'Listing data could not be loaded.')
  }
  if (!listingResult.data) {
    throw new ValVerifyHttpError(404, 'LISTING_NOT_FOUND', 'Listing was not found.')
  }

  const categoryPromise = listingResult.data.category_id
    ? serviceClient
      .from('categories')
      .select('id,name,slug')
      .eq('id', listingResult.data.category_id)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const imagesPromise = serviceClient
    .from('listing_images')
    .select('id,listing_id,url,sort_order')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true })

  const verificationPromise = includeVerification
    ? serviceClient
      .from('listing_verifications')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [categoryResult, imagesResult, verificationResult] = await Promise.all([
    categoryPromise,
    imagesPromise,
    verificationPromise,
  ])

  if (categoryResult.error || imagesResult.error || verificationResult.error) {
    throw new ValVerifyHttpError(500, 'CANONICAL_READ_FAILED', 'Listing data could not be loaded.')
  }

  return {
    listing: listingResult.data,
    category: categoryResult.data,
    images: imagesResult.data ?? [],
    verification: verificationResult.data,
  }
}

async function handle(req, res) {
  if (String(req.method || '').toUpperCase() !== 'POST') {
    res.setHeader('Allow', 'POST')
    sendJson(res, 405, errorPayload('METHOD_NOT_ALLOWED', 'Only POST is supported.'))
    return
  }

  const token = bearerToken(req)
  if (!token) {
    sendJson(res, 401, errorPayload('UNAUTHENTICATED', 'Authentication is required.'))
    return
  }

  const body = await readBody(req)
  const listingId = parseListingId(body)
  const config = serverConfig()

  const authClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    ...clientOptions(),
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) {
    sendJson(res, 401, errorPayload('UNAUTHENTICATED', 'Authentication is required.'))
    return
  }

  const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, clientOptions())
  const profileResult = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileResult.error) {
    throw new ValVerifyHttpError(500, 'AUTHORIZATION_READ_FAILED', 'Authorization could not be checked.')
  }

  const canonical = await loadCanonical(serviceClient, listingId, false)
  const isOwner = canonical.listing.user_id === authData.user.id
  const isAdmin = profileResult.data?.role === 'admin'
  if (!isOwner && !isAdmin) {
    sendJson(res, 403, errorPayload('FORBIDDEN', 'You are not allowed to verify this listing.'))
    return
  }

  // Early (non-authoritative) probe: reject an already-exhausted budget before
  // any image fetch or Gemini work. The atomic claim RPC enforces the limit.
  await checkRateLimit({
    serviceClient,
    listingId,
    quota: { exempt: isAdmin },
  })

  let aiClient = null
  if (config.geminiKey && config.geminiModel) {
    try {
      aiClient = new GoogleGenAI({ apiKey: config.geminiKey })
    } catch {
      aiClient = null
    }
  }

  const outcome = await verifyListing({
    listing: canonical.listing,
    category: canonical.category,
    images: canonical.images,
    serviceClient,
    supabaseUrl: config.supabaseUrl,
    aiClient,
    model: config.geminiModel,
    quota: { exempt: isAdmin },
    logger: (entry) => {
      console.log('ValVerify Gemini provider', {
        ...entry,
        provider: entry.provider ?? 'gemini',
        model: entry.model ?? null,
      })
    },
    reload: async () => {
      const latest = await loadCanonical(serviceClient, listingId, false)
      return {
        listing: latest.listing,
        category: latest.category,
        images: latest.images,
      }
    },
  })

  sendJson(res, outcome.statusCode, outcome.result)
}

export default async function handler(req, res) {
  try {
    await handle(req, res)
  } catch (error) {
    if (error instanceof ValVerifyHttpError) {
      if (typeof error.retryAfterSeconds === 'number' && error.retryAfterSeconds > 0 && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(Math.ceil(error.retryAfterSeconds)))
      }
      sendJson(res, error.status, errorPayload(error.code, error.message))
      return
    }

    console.error('ValVerify request failed', {
      code: typeof error?.code === 'string' ? error.code : 'INTERNAL_ERROR',
    })
    sendJson(res, 500, errorPayload('INTERNAL_ERROR', 'Verification could not be completed.'))
  }
}
