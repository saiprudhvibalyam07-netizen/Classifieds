import { Page } from '@playwright/test'
import {
  MOCK_USER_ID,
  getConversations,
  getConversationById,
  getConversationIds,
  getMessages,
  getMessageIdsForUnreadCheck,
  getMessageReads,
  getNotifications,
  getUnreadMessageIds,
} from './mockChatData'

const now = new Date().toISOString()

const MOCK_USER = {
  id: MOCK_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'buyer@test.com',
  email_confirmed_at: now,
  phone: '',
  confirmed_at: now,
  last_sign_in_at: now,
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Test Buyer' },
  identities: [],
  created_at: now,
  updated_at: now,
}

function buildSessionData() {
  return JSON.stringify({
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user: MOCK_USER,
    provider_token: null,
  })
}

function decodeUrl(url: string): string {
  return decodeURIComponent(url)
}

function extractUserId(rawUrl: string): string | null {
  const url = decodeUrl(rawUrl)
  const match = url.match(/or=\(buyer_id\.eq\.([^,)+]+)/)
  if (match) return match[1]
  const eqMatch = url.match(/id=eq\.([^&]+)/)
  if (eqMatch) return eqMatch[1]
  const buyerMatch = url.match(/buyer_id=eq\.([^&]+)/)
  if (buyerMatch) return buyerMatch[1]
  const sellerMatch = url.match(/seller_id=eq\.([^&]+)/)
  if (sellerMatch) return sellerMatch[1]
  const profileMatch = url.match(/profile_id=eq\.([^&]+)/)
  if (profileMatch) return profileMatch[1]
  const userMatch = url.match(/user_id=eq\.([^&]+)/)
  if (userMatch) return userMatch[1]
  const senderMatch = url.match(/sender_id=neq\.([^&]+)/)
  if (senderMatch) return senderMatch[1]
  return null
}

function extractConversationId(rawUrl: string): string | null {
  const url = decodeUrl(rawUrl)
  const match = url.match(/conversation_id=eq\.([^&]+)/)
  if (match) return match[1]
  const idEqMatch = url.match(/id=eq\.([a-zA-Z0-9-]+)/)
  if (idEqMatch) return idEqMatch[1]
  const inMatch = url.match(/conversation_id=in\.\(([^)]+)\)/)
  if (inMatch) return inMatch[1]
  return null
}

export async function mockSupabaseAuth(page: Page, overrides?: { role?: string; email?: string }) {
  const sessionData = buildSessionData()

  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: sessionData })
  })

  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) })
  })

  const mockRole = overrides?.role || 'user';
  const mockEmail = overrides?.email || 'buyer@test.com';
  const mockProfile = { id: MOCK_USER_ID, full_name: 'Test User', email: mockEmail, phone: '+91-9876543210', role: mockRole, city: 'Mumbai', state: 'Maharashtra' };
  const profileResponseBody = JSON.stringify([mockProfile]);
  const profileObjectBody = JSON.stringify(mockProfile);

  await page.route('**/rest/v1/profiles**', async (route) => {
    const url = route.request().url();
    // If the request uses Accept: application/vnd.pgrst.object+json (single()), return a plain object
    const headers = route.request().headers();
    const accept = headers['accept'] || '';
    const body = accept.includes('application/vnd.pgrst.object+json') ? profileObjectBody : profileResponseBody;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    })
  })

  await page.route('**/rest/v1/conversations*', async (route) => {
    const rawUrl = route.request().url()
    const url = decodeUrl(rawUrl)
    const method = route.request().method()

    if (method === 'POST') {
      const postData = route.request().postData()
      const body = postData ? JSON.parse(postData) : {}
      const resp = {
        ...body,
        id: 'conv-new-' + Date.now(),
        title: null,
        is_group: false,
        last_message: null,
        last_message_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        listing: null,
        buyer: null,
        seller: null,
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resp) })
      return
    }

    if (method === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }

    if (rawUrl.includes('select=id')) {
      const userId = extractUserId(url)
      const ids = userId ? getConversationIds(userId) : []
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ids) })
      return
    }

    const idMatch = url.match(/id=eq\.([a-zA-Z0-9-]+)/)
    if (idMatch) {
      const conv = getConversationById(idMatch[1])
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(conv ? [conv] : []),
      })
      return
    }

    const userId = extractUserId(url)
    const cursorMatch = url.match(/updated_at=lt\.([^&]+)/)
    const cursor = cursorMatch ? cursorMatch[1] : undefined
    const result = userId ? getConversations(userId, cursor) : { data: [], nextCursor: null, hasMore: false }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result.data) })
  })

  await page.route('**/rest/v1/messages*', async (route) => {
    const rawUrl = route.request().url()
    const url = decodeUrl(rawUrl)
    const method = route.request().method()

    if (method === 'POST') {
      const postData = route.request().postData()
      const body = postData ? JSON.parse(postData) : {}
      const newMsg = {
        id: 'msg-new-' + Date.now(),
        conversation_id: body.conversation_id || '',
        sender_id: body.sender_id || MOCK_USER_ID,
        message: body.message || '',
        message_attachments: [],
        is_read: false,
        type: body.type || 'text',
        content: body.content || null,
        metadata: body.metadata || {},
        reply_to: body.reply_to || null,
        is_deleted: false,
        is_edited: false,
        edited_at: null,
        updated_at: null,
        created_at: new Date().toISOString(),
        profile: { id: MOCK_USER_ID, full_name: 'Test Buyer', avatar_url: null },
        reply_message: null,
        status: 'sent',
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newMsg) })
      return
    }

    if (method === 'PATCH') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }

    if (method === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }

    if (rawUrl.includes('select=id')) {
      const senderNotEqMatch = url.match(/sender_id=neq\.([^&]+)/)
      const userId = senderNotEqMatch ? senderNotEqMatch[1] : MOCK_USER_ID

      if (rawUrl.includes('conversation_id=in.')) {
        const inMatch = url.match(/conversation_id=in\.\(([^)]+)\)/)
        if (inMatch) {
          const convIds = inMatch[1].split(',')
          const result = getMessageIdsForUnreadCheck(userId, convIds)
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) })
          return
        }
      }

      const convIdEq = extractConversationId(url)
      if (convIdEq && rawUrl.includes('conversation_id=eq')) {
        const result = getMessageIdsForUnreadCheck(MOCK_USER_ID, [convIdEq])
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) })
        return
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }

    const convId = extractConversationId(url)
    if (convId) {
      const cursorMatch = url.match(/created_at=lt\.([^&]+)/)
      const cursor = cursorMatch ? cursorMatch[1] : undefined
      const result = getMessages(convId, cursor)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result.data) })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.route('**/rest/v1/message_reads*', async (route) => {
    const method = route.request().method()

    if (method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }

    const rawUrl = route.request().url()
    const url = decodeUrl(rawUrl)
    const profileMatch = url.match(/profile_id=eq\.([^&]+)/)
    const userId = profileMatch ? profileMatch[1] : MOCK_USER_ID
    const reads = getMessageReads(userId)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reads) })
  })

  await page.route('**/rest/v1/user_presence*', async (route) => {
    const method = route.request().method()
    if (method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/rest/v1/notification_events*', async (route) => {
    const method = route.request().method()
    if (method === 'PATCH') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    const result = getNotifications(MOCK_USER_ID)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) })
  })

  await page.route('**/rest/v1/message_reactions*', async (route) => {
    const method = route.request().method()
    if (method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'reaction-new-' + Date.now() }) })
      return
    }
    if (method === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.route('**/rest/v1/rpc/chat_unread_count', async (route) => {
    const body = route.request().postData()
    const { p_user_id } = body ? JSON.parse(body) : {}
    const unread = getUnreadMessageIds(p_user_id || MOCK_USER_ID)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(unread.size) })
  })

  await page.route('**/rest/v1/rpc/chat_unread_conversation_ids', async (route) => {
    const body = route.request().postData()
    const { p_user_id } = body ? JSON.parse(body) : {}
    const userId = p_user_id || MOCK_USER_ID
    const convs = getConversations(userId)
    const unread = getUnreadMessageIds(userId)
    const result: { conversation_id: string }[] = []
    for (const conv of convs.data) {
      const msgs = getMessages(conv.id)
      for (const m of msgs.data) {
        if (m.sender_id !== userId && unread.has(m.id)) {
          result.push({ conversation_id: conv.id })
          break
        }
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) })
  })

  await page.route('**/storage/v1/object/*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  })

  await page.goto('/')
  await page.evaluate((data: string) => {
    localStorage.setItem('sb-seqzkrwgpshqinsjhxwh-auth-token', data)
  }, sessionData)
  await page.reload()
  await page.waitForSelector('[data-testid="navbar-user-menu"]', { timeout: 10000 })
}
