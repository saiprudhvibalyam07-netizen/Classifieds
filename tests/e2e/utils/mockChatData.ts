export const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

const SELLER_1_ID = '11111111-1111-1111-1111-111111111111'
const SELLER_2_ID = '22222222-2222-2222-2222-222222222222'
const SELLER_3_ID = '33333333-3333-3333-3333-333333333333'

const CONV_1_ID = 'conv-aaaa-0000-0000-0000-000000000001'
const CONV_2_ID = 'conv-aaaa-0000-0000-0000-000000000002'
const CONV_3_ID = 'conv-aaaa-0000-0000-0000-000000000003'
const CONV_4_ID = 'conv-aaaa-0000-0000-0000-000000000004'
const CONV_5_ID = 'conv-aaaa-0000-0000-0000-000000000005'

const LISTING_1_ID = '879ef63f-44c2-4e9d-8f63-333340904f3d'
const LISTING_2_ID = '49aa42b0-26af-45f3-9d22-6bcb76ee1eee'
const LISTING_3_ID = 'cbaa6c39-3b81-4342-85b7-793418e44969'
const LISTING_4_ID = '92783c52-b1e6-4e51-9b70-6ac982f83d7c'
const LISTING_5_ID = 'dcb35dd4-01d7-473e-b368-969321d28869'

const profiles: Record<string, { id: string; full_name: string; avatar_url: string | null }> = {
  [MOCK_USER_ID]: { id: MOCK_USER_ID, full_name: 'Test Buyer', avatar_url: null },
  [SELLER_1_ID]: { id: SELLER_1_ID, full_name: 'Rajesh Kumar', avatar_url: null },
  [SELLER_2_ID]: { id: SELLER_2_ID, full_name: 'Manoj Tiwari', avatar_url: null },
  [SELLER_3_ID]: { id: SELLER_3_ID, full_name: 'Deepika Joshi', avatar_url: null },
}

const listings: Record<string, Record<string, unknown>> = {
  [LISTING_1_ID]: {
    id: LISTING_1_ID,
    title: 'Sony WH-1000XM5 Headphones',
    price: 25000,
    category_id: 'cat-items',
    images: [{ id: 'img-headphones-1', url: '/images/items/listing_headphones_1.jpg' }],
  },
  [LISTING_2_ID]: {
    id: LISTING_2_ID,
    title: '2020 Maruti Suzuki Swift VXI',
    price: 450000,
    category_id: 'cat-vehicles',
    images: [{ id: 'img-swift-1', url: '/images/vehicles/listing_swift_1.jpg' }],
  },
  [LISTING_3_ID]: {
    id: LISTING_3_ID,
    title: '2BHK Flat for Rent in HSR Layout',
    price: 25000,
    category_id: 'cat-housing',
    images: [{ id: 'img-flat-1', url: '/images/housing/listing_flat_1.jpg' }],
  },
  [LISTING_4_ID]: {
    id: LISTING_4_ID,
    title: 'Vintage Royal Enfield Bullet 350',
    price: 185000,
    category_id: 'cat-vehicles',
    images: [{ id: 'img-bullet-1', url: '/images/vehicles/listing_bullet_1.jpg' }],
  },
  [LISTING_5_ID]: {
    id: LISTING_5_ID,
    title: 'Handcrafted Sheesham Wood Dining Table',
    price: 35000,
    category_id: 'cat-items',
    images: [{ id: 'img-table-1', url: '/images/items/listing_table_1.jpg' }],
  },
}

interface MockConversation {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  title: string | null
  is_group: boolean
  last_message: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

const conversations: MockConversation[] = [
  {
    id: CONV_1_ID,
    listing_id: LISTING_1_ID,
    buyer_id: MOCK_USER_ID,
    seller_id: SELLER_1_ID,
    title: null,
    is_group: false,
    last_message: 'Thank you! Will pick it up tomorrow.',
    last_message_at: '2026-06-10T14:30:00Z',
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-06-10T14:30:00Z',
  },
  {
    id: CONV_2_ID,
    listing_id: LISTING_2_ID,
    buyer_id: MOCK_USER_ID,
    seller_id: SELLER_2_ID,
    title: null,
    is_group: false,
    last_message: 'Price is firm, let me know if interested.',
    last_message_at: '2026-06-12T11:00:00Z',
    created_at: '2026-06-02T10:00:00Z',
    updated_at: '2026-06-12T11:00:00Z',
  },
  {
    id: CONV_3_ID,
    listing_id: LISTING_3_ID,
    buyer_id: MOCK_USER_ID,
    seller_id: SELLER_3_ID,
    title: null,
    is_group: false,
    last_message: 'Perfect, see you at the property!',
    last_message_at: '2026-06-08T16:00:00Z',
    created_at: '2026-06-03T08:00:00Z',
    updated_at: '2026-06-08T16:00:00Z',
  },
  {
    id: CONV_4_ID,
    listing_id: LISTING_4_ID,
    buyer_id: SELLER_1_ID,
    seller_id: MOCK_USER_ID,
    title: null,
    is_group: false,
    last_message: 'Still available, when would you like to see it?',
    last_message_at: '2026-06-11T09:00:00Z',
    created_at: '2026-06-05T14:00:00Z',
    updated_at: '2026-06-11T09:00:00Z',
  },
  {
    id: CONV_5_ID,
    listing_id: LISTING_5_ID,
    buyer_id: MOCK_USER_ID,
    seller_id: SELLER_3_ID,
    title: null,
    is_group: false,
    last_message: 'Deal confirmed! Will arrange delivery.',
    last_message_at: '2026-06-13T10:00:00Z',
    created_at: '2026-06-04T11:00:00Z',
    updated_at: '2026-06-13T10:00:00Z',
  },
]

function buildConversationResponse(c: MockConversation) {
  const listingData = listings[c.listing_id] ?? null
  return {
    ...c,
    listing: listingData,
    buyer: profiles[c.buyer_id] ?? null,
    seller: profiles[c.seller_id] ?? null,
  }
}

interface MockMessage {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  message_attachments: Record<string, unknown>[]
  is_read: boolean
  type: string
  content: string | null
  metadata: Record<string, unknown>
  reply_to: string | null
  is_deleted: boolean
  is_edited: boolean
  edited_at: string | null
  updated_at: string | null
  created_at: string
}

function msg(
  id: string,
  convId: string,
  senderId: string,
  text: string,
  createdAt: string,
  opts?: { isRead?: boolean; attachments?: Record<string, unknown>[]; isDeleted?: boolean; isEdited?: boolean; replyTo?: string; type?: string }
): MockMessage {
  return {
    id,
    conversation_id: convId,
    sender_id: senderId,
    message: text,
    message_attachments: opts?.attachments ?? [],
    is_read: opts?.isRead ?? true,
    type: opts?.type ?? 'text',
    content: null,
    metadata: {},
    reply_to: opts?.replyTo ?? null,
    is_deleted: opts?.isDeleted ?? false,
    is_edited: opts?.isEdited ?? false,
    edited_at: opts?.isEdited ? createdAt : null,
    updated_at: opts?.isEdited ? createdAt : null,
    created_at: createdAt,
  }
}

function findMessageById(msgId: string): MockMessage | undefined {
  for (const convMsgs of Object.values(messagesByConversation)) {
    const found = convMsgs.find(m => m.id === msgId)
    if (found) return found
  }
  return undefined
}

function buildMessageResponse(m: MockMessage) {
  const replyMsg = m.reply_to ? findMessageById(m.reply_to) : undefined
  return {
    ...m,
    profile: profiles[m.sender_id] ?? null,
    reactions: [],
    reply_message: replyMsg ? { ...replyMsg, profile: profiles[replyMsg.sender_id] ?? null, reactions: [] } : null,
    status: m.is_read ? 'read' : 'delivered',
  }
}

const C1_PREFIX = 'msg-c1-'
const messagesByConversation: Record<string, MockMessage[]> = {
  [CONV_1_ID]: [
    msg(`${C1_PREFIX}001`, CONV_1_ID, MOCK_USER_ID, 'Hi, is the Sony WH-1000XM5 still available?', '2026-06-01T09:05:00Z'),
    msg(`${C1_PREFIX}002`, CONV_1_ID, SELLER_1_ID, 'Yes, it is! Barely used for 3 months.', '2026-06-01T09:30:00Z'),
    msg(`${C1_PREFIX}003`, CONV_1_ID, MOCK_USER_ID, 'Great! What condition would you say it is in?', '2026-06-01T10:00:00Z'),
    msg(`${C1_PREFIX}004`, CONV_1_ID, SELLER_1_ID, 'Excellent condition. Original box and accessories included.', '2026-06-01T10:15:00Z'),
    msg(`${C1_PREFIX}005`, CONV_1_ID, MOCK_USER_ID, 'Can you share some photos?', '2026-06-01T10:30:00Z'),
    msg(`${C1_PREFIX}006`, CONV_1_ID, SELLER_1_ID, 'Sure, I can send them this evening.', '2026-06-01T11:00:00Z'),
    msg(`${C1_PREFIX}007`, CONV_1_ID, SELLER_1_ID, 'Here are the photos. They look as good as new!', '2026-06-01T18:00:00Z', {
      attachments: [{
        id: 'att-c1-001',
        message_id: `${C1_PREFIX}007`,
        type: 'image',
        storage_path: 'conversations/msg-c1-007/headphones.jpg',
        public_url: '/images/items/listing_headphones_1.jpg',
        filename: 'headphones.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 280000,
        width: 1200,
        height: 900,
        thumbnail_url: null,
        thumbnail_width: null,
        thumbnail_height: null,
        blur_hash: null,
        file_hash: null,
        virus_scan_status: 'clean',
        created_at: '2026-06-01T18:00:00Z',
        sort_order: 0,
      }],
    }),
    msg(`${C1_PREFIX}008`, CONV_1_ID, MOCK_USER_ID, 'Looks great! Is the price negotiable?', '2026-06-02T08:00:00Z'),
    msg(`${C1_PREFIX}009`, CONV_1_ID, SELLER_1_ID, 'I can do 22,000 instead of 25,000.', '2026-06-02T08:30:00Z'),
    msg(`${C1_PREFIX}010`, CONV_1_ID, MOCK_USER_ID, 'How about 20,000?', '2026-06-02T09:00:00Z'),
    msg(`${C1_PREFIX}011`, CONV_1_ID, SELLER_1_ID, 'Split the difference at 21,000?', '2026-06-02T09:15:00Z'),
    msg(`${C1_PREFIX}012`, CONV_1_ID, MOCK_USER_ID, 'Deal! When can I pick it up?', '2026-06-02T09:30:00Z'),
    msg(`${C1_PREFIX}013`, CONV_1_ID, SELLER_1_ID, 'I am free tomorrow evening around 6 PM.', '2026-06-02T10:00:00Z'),
    msg(`${C1_PREFIX}014`, CONV_1_ID, MOCK_USER_ID, 'Perfect, see you then!', '2026-06-02T10:30:00Z'),
    msg(`${C1_PREFIX}015`, CONV_1_ID, MOCK_USER_ID, 'Thank you! Will pick it up tomorrow.', '2026-06-10T14:30:00Z'),
    msg(`${C1_PREFIX}016`, CONV_1_ID, SELLER_1_ID, 'Voice note explaining details', '2026-06-10T15:00:00Z', { type: 'voice', isRead: false }),
    msg(`${C1_PREFIX}017`, CONV_1_ID, SELLER_1_ID, 'Video showing product condition', '2026-06-10T15:30:00Z', { type: 'video', isRead: false }),
    msg(`${C1_PREFIX}018`, CONV_1_ID, SELLER_1_ID, 'Ownership document attached', '2026-06-10T16:00:00Z', { type: 'document', isRead: false }),
    msg(`${C1_PREFIX}019`, CONV_1_ID, MOCK_USER_ID, 'Got it, thanks! Edited with correction', '2026-06-10T16:30:00Z', { isEdited: true }),
    msg(`${C1_PREFIX}020`, CONV_1_ID, MOCK_USER_ID, 'Regarding the price...', '2026-06-10T17:00:00Z', { replyTo: `${C1_PREFIX}009` }),
  ],
  [CONV_2_ID]: [
    msg(`${C1_PREFIX}101`, CONV_2_ID, MOCK_USER_ID, 'Hello, is the Swift still available?', '2026-06-02T10:05:00Z'),
    msg(`${C1_PREFIX}102`, CONV_2_ID, SELLER_2_ID, 'Yes, still available. Well maintained.', '2026-06-02T10:30:00Z'),
    msg(`${C1_PREFIX}103`, CONV_2_ID, MOCK_USER_ID, 'How many kilometers driven?', '2026-06-02T11:00:00Z'),
    msg(`${C1_PREFIX}104`, CONV_2_ID, SELLER_2_ID, '35,000 km. Mostly highway driving.', '2026-06-02T11:15:00Z'),
    msg(`${C1_PREFIX}105`, CONV_2_ID, MOCK_USER_ID, 'Any accidents or major repairs?', '2026-06-02T11:30:00Z'),
    msg(`${C1_PREFIX}106`, CONV_2_ID, SELLER_2_ID, 'No accidents. Regular service done.', '2026-06-02T11:45:00Z', {
      attachments: [{
        id: 'att-c2-001',
        message_id: `${C1_PREFIX}106`,
        type: 'image',
        storage_path: 'conversations/msg-c2-106/swift.jpg',
        public_url: '/images/vehicles/listing_swift_1.jpg',
        filename: 'swift_car.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 320000,
        width: 1200,
        height: 900,
        thumbnail_url: null,
        thumbnail_width: null,
        thumbnail_height: null,
        blur_hash: null,
        file_hash: null,
        virus_scan_status: 'clean',
        created_at: '2026-06-02T11:45:00Z',
        sort_order: 0,
      }],
    }),
    msg(`${C1_PREFIX}107`, CONV_2_ID, MOCK_USER_ID, 'Looks good! Can I come see it this weekend?', '2026-06-03T08:00:00Z'),
    msg(`${C1_PREFIX}108`, CONV_2_ID, SELLER_2_ID, 'Saturday morning works for me.', '2026-06-03T08:30:00Z'),
    msg(`${C1_PREFIX}109`, CONV_2_ID, MOCK_USER_ID, 'Is the price firm at 4.5L?', '2026-06-03T09:00:00Z'),
    msg(`${C1_PREFIX}110`, CONV_2_ID, SELLER_2_ID, 'I can come down to 4.2L if you decide this weekend.', '2026-06-03T09:30:00Z'),
    msg(`${C1_PREFIX}111`, CONV_2_ID, MOCK_USER_ID, 'Let me check and get back to you.', '2026-06-04T10:00:00Z'),
    msg(`${C1_PREFIX}112`, CONV_2_ID, SELLER_2_ID, 'Price is firm, let me know if interested.', '2026-06-12T11:00:00Z', { isRead: false }),
  ],
  [CONV_3_ID]: [
    msg(`${C1_PREFIX}201`, CONV_3_ID, MOCK_USER_ID, 'Hi, is the 2BHK still available for rent?', '2026-06-03T08:05:00Z'),
    msg(`${C1_PREFIX}202`, CONV_3_ID, SELLER_3_ID, 'Yes, it is available. Would you like to schedule a visit?', '2026-06-03T08:30:00Z'),
    msg(`${C1_PREFIX}203`, CONV_3_ID, MOCK_USER_ID, 'What is the monthly rent including maintenance?', '2026-06-03T09:00:00Z'),
    msg(`${C1_PREFIX}204`, CONV_3_ID, SELLER_3_ID, '25,000 rent + 2,000 maintenance. Total 27,000.', '2026-06-03T09:15:00Z'),
    msg(`${C1_PREFIX}205`, CONV_3_ID, MOCK_USER_ID, 'Are utilities included?', '2026-06-03T09:30:00Z'),
    msg(`${C1_PREFIX}206`, CONV_3_ID, SELLER_3_ID, 'Water included. Electricity and gas are separate.', '2026-06-03T09:45:00Z'),
    msg(`${C1_PREFIX}207`, CONV_3_ID, MOCK_USER_ID, 'Is it furnished or unfurnished?', '2026-06-03T10:00:00Z'),
    msg(`${C1_PREFIX}208`, CONV_3_ID, SELLER_3_ID, 'Semi-furnished. Modular kitchen, Wardrobes, Fans, Lights.', '2026-06-03T10:30:00Z'),
    msg(`${C1_PREFIX}209`, CONV_3_ID, MOCK_USER_ID, 'Is parking available?', '2026-06-03T11:00:00Z'),
    msg(`${C1_PREFIX}210`, CONV_3_ID, SELLER_3_ID, 'Yes, one covered parking spot included.', '2026-06-03T11:15:00Z'),
    msg(`${C1_PREFIX}211`, CONV_3_ID, MOCK_USER_ID, 'What is the security deposit?', '2026-06-03T11:30:00Z'),
    msg(`${C1_PREFIX}212`, CONV_3_ID, SELLER_3_ID, '2 months rent = 50,000. Refundable.', '2026-06-03T11:45:00Z'),
    msg(`${C1_PREFIX}213`, CONV_3_ID, MOCK_USER_ID, 'Can I visit this Saturday?', '2026-06-04T09:00:00Z'),
    msg(`${C1_PREFIX}214`, CONV_3_ID, SELLER_3_ID, 'Sure, 11 AM works?', '2026-06-04T09:30:00Z'),
    msg(`${C1_PREFIX}215`, CONV_3_ID, MOCK_USER_ID, 'Perfect, 11 AM Saturday. See you!', '2026-06-04T10:00:00Z'),
    msg(`${C1_PREFIX}216`, CONV_3_ID, MOCK_USER_ID, 'I loved the apartment! I would like to take it.', '2026-06-08T15:00:00Z'),
    msg(`${C1_PREFIX}217`, CONV_3_ID, SELLER_3_ID, 'Great! I will prepare the rental agreement.', '2026-06-08T15:30:00Z'),
    msg(`${C1_PREFIX}218`, CONV_3_ID, MOCK_USER_ID, 'Perfect, see you at the property!', '2026-06-08T16:00:00Z'),
  ],
  [CONV_4_ID]: [
    msg(`${C1_PREFIX}301`, CONV_4_ID, SELLER_1_ID, 'Hi, I am interested in your Royal Enfield.', '2026-06-05T14:05:00Z'),
    msg(`${C1_PREFIX}302`, CONV_4_ID, MOCK_USER_ID, 'Yes, it is a 2015 model in great condition.', '2026-06-05T14:30:00Z'),
    msg(`${C1_PREFIX}303`, CONV_4_ID, SELLER_1_ID, 'How many kms on the odometer?', '2026-06-05T15:00:00Z'),
    msg(`${C1_PREFIX}304`, CONV_4_ID, MOCK_USER_ID, 'Around 22,000 km. Mostly weekend rides.', '2026-06-05T15:30:00Z'),
    msg(`${C1_PREFIX}305`, CONV_4_ID, SELLER_1_ID, 'Any modifications done?', '2026-06-05T16:00:00Z'),
    msg(`${C1_PREFIX}306`, CONV_4_ID, MOCK_USER_ID, 'Stock condition. New tires last year.', '2026-06-05T16:30:00Z'),
    msg(`${C1_PREFIX}307`, CONV_4_ID, SELLER_1_ID, 'Can you share the service history?', '2026-06-06T09:00:00Z'),
    msg(`${C1_PREFIX}308`, CONV_4_ID, MOCK_USER_ID, 'All service records available. Will share photos.', '2026-06-06T09:30:00Z'),
    msg(`${C1_PREFIX}309`, CONV_4_ID, SELLER_1_ID, 'Is test ride possible?', '2026-06-06T10:00:00Z'),
    msg(`${C1_PREFIX}310`, CONV_4_ID, MOCK_USER_ID, 'Still available, when would you like to see it?', '2026-06-11T09:00:00Z', { isRead: false }),
  ],
  [CONV_5_ID]: [
    msg(`${C1_PREFIX}401`, CONV_5_ID, MOCK_USER_ID, 'Hi, is the dining table still available?', '2026-06-04T11:05:00Z'),
    msg(`${C1_PREFIX}402`, CONV_5_ID, SELLER_3_ID, 'Yes, it is! Handcrafted Sheesham wood, 6-seater.', '2026-06-04T11:30:00Z'),
    msg(`${C1_PREFIX}403`, CONV_5_ID, MOCK_USER_ID, 'What are the dimensions?', '2026-06-04T12:00:00Z'),
    msg(`${C1_PREFIX}404`, CONV_5_ID, SELLER_3_ID, '180cm x 90cm x 75cm height.', '2026-06-04T12:15:00Z'),
    msg(`${C1_PREFIX}405`, CONV_5_ID, MOCK_USER_ID, 'How old is it?', '2026-06-04T12:30:00Z'),
    msg(`${C1_PREFIX}406`, CONV_5_ID, SELLER_3_ID, 'Bought it 6 months ago. Like new condition.', '2026-06-04T12:45:00Z'),
    msg(`${C1_PREFIX}407`, CONV_5_ID, MOCK_USER_ID, 'Why are you selling it?', '2026-06-04T13:00:00Z'),
    msg(`${C1_PREFIX}408`, CONV_5_ID, SELLER_3_ID, 'We are moving abroad, so selling all furniture.', '2026-06-04T13:15:00Z'),
    msg(`${C1_PREFIX}409`, CONV_5_ID, MOCK_USER_ID, 'Is the price negotiable?', '2026-06-04T14:00:00Z'),
    msg(`${C1_PREFIX}410`, CONV_5_ID, SELLER_3_ID, 'I can do 32,000.', '2026-06-04T14:15:00Z'),
    msg(`${C1_PREFIX}411`, CONV_5_ID, MOCK_USER_ID, 'Can you deliver?', '2026-06-04T14:30:00Z'),
    msg(`${C1_PREFIX}412`, CONV_5_ID, SELLER_3_ID, 'Within city limits, yes. Free delivery.', '2026-06-04T14:45:00Z'),
    msg(`${C1_PREFIX}413`, CONV_5_ID, MOCK_USER_ID, '30,000 and I will take it today.', '2026-06-04T15:00:00Z'),
    msg(`${C1_PREFIX}414`, CONV_5_ID, SELLER_3_ID, '31,000 and it is a deal.', '2026-06-04T15:15:00Z'),
    msg(`${C1_PREFIX}415`, CONV_5_ID, MOCK_USER_ID, 'Done! 31,000. When can you deliver?', '2026-06-04T15:30:00Z'),
    msg(`${C1_PREFIX}416`, CONV_5_ID, SELLER_3_ID, 'I can deliver tomorrow afternoon.', '2026-06-04T16:00:00Z'),
    msg(`${C1_PREFIX}417`, CONV_5_ID, MOCK_USER_ID, 'Perfect, afternoon works. Please share tracking.', '2026-06-04T16:30:00Z'),
    msg(`${C1_PREFIX}418`, CONV_5_ID, SELLER_3_ID, 'Sure, will share delivery details tomorrow.', '2026-06-04T17:00:00Z'),
    msg(`${C1_PREFIX}419`, CONV_5_ID, MOCK_USER_ID, 'Thanks for the smooth transaction!', '2026-06-13T09:00:00Z'),
    msg(`${C1_PREFIX}420`, CONV_5_ID, SELLER_3_ID, 'Deal confirmed! Will arrange delivery.', '2026-06-13T10:00:00Z'),
  ],
}

const allConversationIds = conversations.map((c) => c.id)

const READ_MESSAGES = new Set<string>()

for (const convId of [CONV_1_ID, CONV_3_ID, CONV_5_ID]) {
  for (const m of messagesByConversation[convId] ?? []) {
    READ_MESSAGES.add(m.id)
  }
}

if (messagesByConversation[CONV_4_ID]) {
  for (let i = 0; i < messagesByConversation[CONV_4_ID].length - 1; i++) {
    READ_MESSAGES.add(messagesByConversation[CONV_4_ID][i].id)
  }
}

if (messagesByConversation[CONV_2_ID]) {
  for (let i = 0; i < messagesByConversation[CONV_2_ID].length - 1; i++) {
    READ_MESSAGES.add(messagesByConversation[CONV_2_ID][i].id)
  }
}

export function getConversations(userId: string, cursor?: string) {
  let results = conversations.filter(
    (c) => c.buyer_id === userId || c.seller_id === userId
  )
  if (cursor) {
    results = results.filter((c) => c.updated_at < cursor)
  }
  results.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const limit = 26
  const hasMore = results.length > limit
  const items = hasMore ? results.slice(0, limit) : results
  return {
    data: items.map(buildConversationResponse),
    nextCursor: items.length > 0 ? items[items.length - 1].updated_at : null,
    hasMore,
  }
}

export function getConversationById(id: string) {
  const c = conversations.find((c) => c.id === id)
  return c ? buildConversationResponse(c) : null
}

export function getConversationIds(userId: string) {
  return conversations
    .filter((c) => c.buyer_id === userId || c.seller_id === userId)
    .map((c) => ({ id: c.id }))
}

export function getMessages(conversationId: string, cursor?: string) {
  const msgs = messagesByConversation[conversationId] ?? []
  let results = [...msgs]
  if (cursor) {
    results = results.filter((m) => m.created_at < cursor)
  }
  results.sort((a, b) => b.created_at.localeCompare(a.created_at))
  const limit = 26
  const hasMore = results.length > limit
  const items = hasMore ? results.slice(0, limit) : results
  return {
    data: items.reverse().map(buildMessageResponse),
    nextCursor: items.length > 0 ? items[items.length - 1].created_at : null,
    hasMore,
  }
}

export function getUnreadMessageIds(userId: string): Set<string> {
  const unread = new Set<string>()
  for (const convId of allConversationIds) {
    for (const m of messagesByConversation[convId] ?? []) {
      if (m.sender_id !== userId && !READ_MESSAGES.has(m.id)) {
        unread.add(m.id)
      }
    }
  }
  return unread
}

export function getMessageReads(userId: string) {
  const reads: { message_id: string }[] = []
  for (const msgId of READ_MESSAGES) {
    reads.push({ message_id: msgId })
  }
  return reads
}

export function getMessageIdsForUnreadCheck(userId: string, convIds: string[]) {
  const results: { id: string; conversation_id: string }[] = []
  for (const convId of convIds) {
    for (const m of messagesByConversation[convId] ?? []) {
      if (m.sender_id !== userId) {
        results.push({ id: m.id, conversation_id: m.conversation_id })
      }
    }
  }
  return results
}

export function getNotifications(userId: string) {
  return []
}

export const presence: Record<string, 'online' | 'away' | 'offline'> = {
  [MOCK_USER_ID]: 'online',
  [SELLER_1_ID]: 'online',
  [SELLER_2_ID]: 'away',
  [SELLER_3_ID]: 'offline',
}
