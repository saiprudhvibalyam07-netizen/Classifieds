# Marketplace Communication Platform — Technical Design Document (v2)

## 1. Current Problems

### Database
| Problem | Severity | Detail |
|---------|----------|--------|
| `conversations` UNIQUE on `(listing_id, buyer_id)` excludes seller | HIGH | A buyer can have only one conversation per listing, even if the seller changes or there's a legitimate need for multiple threads |
| `message TEXT NOT NULL` prevents attachment-only messages | HIGH | Cannot send an image without accompanying text |
| No `conversation_participants` table | HIGH | Buyer/seller are hard-coded columns; adding more participants (group chat, admin介入) requires schema migration |
| No `message_reads` table | MEDIUM | Read status is per-message (`is_read` boolean), not per-reader. Two participants can't independently track read state |
| Missing indexes | MEDIUM | No composite index on `(conversation_id, created_at)` for cursor pagination; no index on `updated_at` for conversation sorting |
| No cascade-safe `reply_to` | LOW | Message threading requires a self-referencing FK |
| `last_message` TEXT with no length limit | LOW | Could grow large if a very long message is sent |
| Attachments stored as JSONB array | HIGH | No referential integrity, no independent querying, no size tracking, no virus scan status |

### RLS
| Problem | Severity | Detail |
|---------|----------|--------|
| Participants can UPDATE any message | HIGH | The UPDATE policy checks only conversation membership, not `sender_id`. A malicious participant could edit another's messages |
| Conversations INSERT doesn't verify seller owns listing | MEDIUM | A buyer can create a conversation claiming any profile as seller; no subquery checks `listings.user_id` |
| Storage policies not in base migration | MEDIUM | `00003_chat_features.sql` adds storage RLS, but `00002_chat_schema.sql` doesn't have them, creating a dependency gap |
| No DELETE policy for messages in base migration | MEDIUM | `00002` is missing the delete policy; `00003` adds it |

### State Management
| Problem | Severity | Detail |
|---------|----------|--------|
| Three overlapping hooks | HIGH | `useConversations`, `useMessages`, `useUnreadCount` each manage related state with separate queries and subscriptions |
| Duplicate queries | HIGH | `fetchConversations` and `fetchCount` both query for the user's conversation IDs; `fetchUnread` and `fetchCount` both query for unread counts |
| `channelRef` is dead code | LOW | `useRef<ReturnType<...>>` is set and cleared but never read |

### Realtime
| Problem | Severity | Detail |
|---------|----------|--------|
| 8 concurrent channel subscriptions | MEDIUM | `useConversations` (2 channels + 2 message channels), `useMessages` (1 channel with 3 listeners), `useUnreadCount` (1 channel) |
| Duplicate message subscriptions | MEDIUM | Both `useConversations` and `useMessages` subscribe to `messages` table changes; `useUnreadCount` also subscribes to `messages` INSERT |
| Broadcast events not used | LOW | All communication is via `postgres_changes`; no use of Supabase Broadcast for typing indicators or presence |

### Race Conditions
| Problem | Severity | Detail |
|---------|----------|--------|
| `createOrOpenConversation` can be called multiple times | HIGH | `useCallback` depends on `conversations`; when `conversations` ref changes after refetch, the callback reference changes, re-triggering the URL effect |
| `markAsRead` and `markConversationRead` are unsynchronized | MEDIUM | Two separate mechanisms update unread state; if one fails, they desync |
| Optimistic message add + Realtime INSERT collision | LOW | The dedup check (`prev.some(m => m.id === data.id)`) handles this, but it's a fragile pattern |

### Pagination & Performance
| Problem | Severity | Detail |
|---------|----------|--------|
| No pagination on conversations | HIGH | All conversations loaded at once; will fail as count grows |
| No pagination on messages | HIGH | All messages in a conversation loaded at once |
| N+1 on listing images in conversation list | MEDIUM | `listing:listings(*, images:listing_images(*))` loads ALL images for each listing |
| Sequential file uploads | MEDIUM | Files uploaded one-at-a-time with `for ... await` |

### Type Safety
| Problem | Severity | Detail |
|---------|----------|--------|
| `as unknown as Conversation[]` / `as unknown as Message` | HIGH | TypeScript strict mode bypassed with 6+ unsafe casts |
| `Record<string, unknown>` payload | MEDIUM | No compile-time check on INSERT shape |
| `console.log` debugging artifacts remain | LOW | Multiple `console.log` statements in production code |

### Error Handling
| Problem | Severity | Detail |
|---------|----------|--------|
| No user-facing error toasts | HIGH | Upload failures, send failures, delete failures are silent to the user |
| No error boundary around chat | MEDIUM | A render crash takes down the entire Messages page |
| Inconsistent log levels | LOW | Mix of `console.log`, `console.warn`, `console.error` |
| No retry logic | MEDIUM | Network failures silently drop messages |

---

## 2. New Folder Structure

```
src/
  features/
    chat/
      api/
        chatApi.ts              # All Supabase queries in one place
        chatMutations.ts        # All write operations in one place
        chatSubscriptions.ts    # Realtime subscription setup
        uploadQueue.ts          # Upload queue manager
      components/
        ConversationList.tsx
        ConversationListItem.tsx
        ConversationHeader.tsx
        MessageBubble.tsx
        MessageAttachment.tsx   # Shared attachment renderer (image/file)
        MessageInput.tsx
        MessageDateDivider.tsx  # "Today", "Yesterday" separators
        ChatErrorBoundary.tsx
        TypingIndicator.tsx
        ScrollToBottom.tsx
        PresenceDot.tsx         # Online/offline indicator
        OfferCard.tsx           # Offer negotiation card
        SharedListingCard.tsx   # Shared listing preview in chat
        MediaCache.tsx          # Lazy-loaded media with cached placeholder
      hooks/
        useChat.ts              # Single unified hook for the chat page
        useConversations.ts     # Reads conversation list (lightweight)
        useMessages.ts          # Reads messages for active conversation
        useSendMessage.ts       # Send + upload queue integration
        useUnreadCount.ts       # Header badge only (kept separate for header)
        useTypingIndicator.ts   # Broadcast-based typing
        usePresence.ts          # Online/offline presence
        useUploadQueue.ts       # Upload queue state
        useMediaCache.ts        # Media cache manager
        useOfferNegotiation.ts  # Offer state machine
      pages/
        MessagesPage.tsx        # Page-level component
      state/
        chatStore.ts            # Centralized chat state (Zustand or Context)
        uploadQueueStore.ts     # Upload queue state
      types.ts                  # Chat-specific types (separate from global types)
      utils/
        messageUtils.ts         # Formatting, grouping, timestamp helpers
        uploadUtils.ts          # File validation, upload with progress
        offerUtils.ts           # Offer price formatting, validation
        mediaCacheUtils.ts      # Cache key generation, eviction
        migrationUtils.ts       # Data migration helpers (old → new schema)
      __tests__/
        api.test.ts
        hooks.test.ts
        utils.test.ts
        components.test.tsx
  components/
    ui/
      Toast.tsx                  # Reusable toast notification
      ConfirmDialog.tsx          # Reusable confirmation dialog
      Avatar.tsx                 # User avatar with online dot
      Spinner.tsx
      Skeleton.tsx
  hooks/
    useToast.ts                  # Global toast state
    useNetworkStatus.ts          # Online/offline detection
    useOnlineSync.ts             # Offline queue sync
  lib/
    supabase.ts                  # Supabase client (existing)
    indexedDb.ts                 # IndexedDB wrapper for offline cache
    eventBus.ts                  # App-wide custom event bus
  types/
    chat.ts                      # Chat-specific types (imported by feature)
    index.ts                     # Global types (Category, Listing, Profile etc.)
```

---

## 3. Database Schema

### conversations

```sql
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  title TEXT,                              -- Auto-generated: "Re: {listing title}"
  is_group BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX conversations_updated_at_idx ON conversations(updated_at DESC);
CREATE INDEX conversations_listing_idx ON conversations(listing_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
```

### conversation_participants

```sql
CREATE TABLE conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'seller', 'buyer')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,            -- null if still active
  UNIQUE(conversation_id, profile_id)
);

CREATE INDEX idx_cp_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_cp_profile ON conversation_participants(profile_id);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
```

### messages

```sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'text'
    CHECK (type IN ('text', 'image', 'file', 'system', 'offer', 'listing_share')),
  content TEXT,                              -- null if only attachments
  metadata JSONB DEFAULT '{}'::jsonb,        -- Type-specific data (offer amount, listing ID)
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_metadata ON messages USING GIN (metadata);  -- For JSONB queries

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

### message_attachments

```sql
CREATE TABLE message_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'file', 'voice')),
  storage_path TEXT NOT NULL,               -- Path in Supabase Storage bucket
  public_url TEXT NOT NULL,                  -- Public URL (pre-computed)
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,                            -- For images
  height INTEGER,                           -- For images
  thumbnail_url TEXT,                       -- Server-generated thumbnail
  thumbnail_width INTEGER,
  thumbnail_height INTEGER,
  blur_hash TEXT,                           -- For progressive image loading
  file_hash TEXT,                           -- SHA-256 for dedup and virus scan
  virus_scan_status TEXT DEFAULT 'pending'
    CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_ma_message ON message_attachments(message_id);
CREATE INDEX idx_ma_type ON message_attachments(type);
CREATE INDEX idx_ma_hash ON message_attachments(file_hash);

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
```

### message_reads

```sql
CREATE TABLE message_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, profile_id)
);

CREATE INDEX idx_mr_message ON message_reads(message_id);
CREATE INDEX idx_mr_profile ON message_reads(profile_id);

ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
```

### message_reactions

```sql
CREATE TABLE message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, profile_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
```

### offers

```sql
CREATE TABLE offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'countered', 'rejected', 'expired', 'withdrawn')),
  message TEXT,                              -- Optional buyer note
  counter_to_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_offers_conversation ON offers(conversation_id);
CREATE INDEX idx_offers_listing ON offers(listing_id);
CREATE INDEX idx_offers_status ON offers(status);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
```

### notification_events

```sql
CREATE TABLE notification_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'new_message', 'offer_received', 'offer_accepted', 'offer_rejected',
    'offer_countered', 'listing_shared', 'mention', 'reaction',
    'conversation_added', 'message_edited', 'message_deleted'
  )),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,            -- Payload for deep linking
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ne_user ON notification_events(user_id, is_read, created_at DESC);

ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
```

### user_presence

```sql
CREATE TABLE user_presence (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('online', 'away', 'offline')),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Updated via Supabase Realtime Broadcast + periodic DB sync

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
```

### upload_queue (application-level, not a DB table)

The upload queue is managed entirely client-side. See Section 3. Upload Queue Architecture for details.

---

## 4. Conversation Model

```typescript
interface Conversation {
  id: string
  listing_id: string | null
  title: string | null
  is_group: boolean
  created_at: string
  updated_at: string

  listing?: ListingMinimal
  participants: Participant[]
  lastMessage?: MessageSummary
}

interface Participant {
  id: string
  profile_id: string
  role: 'member' | 'admin' | 'seller' | 'buyer'
  last_read_at: string
  joined_at: string
  left_at: string | null

  profile: ProfileMinimal
  presence: 'online' | 'away' | 'offline'
}

interface MessageSummary {
  id: string
  type: MessageType
  content: string | null
  created_at: string
  sender_id: string | null
  sender_name: string | null
  has_attachments: boolean
  has_offer: boolean
}
```

---

## 5. Message Model

```typescript
type MessageType = 'text' | 'image' | 'file' | 'system' | 'offer' | 'listing_share'

interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
  reply_to: string | null
  type: MessageType
  content: string | null
  metadata: Record<string, unknown>  // Offer amounts, listing IDs, etc.
  created_at: string
  edited_at: string | null
  is_deleted: boolean

  sender?: ProfileMinimal
  replyTo?: MessageSummary
  attachments: Attachment[]
  reactions: Reaction[]
  readBy: string[]
  isReadByMe: boolean
}

interface Reaction {
  id: string
  emoji: string
  profile_id: string
  profile?: ProfileMinimal
}
```

---

## 6. Attachment Model

```typescript
interface Attachment {
  id: string
  message_id: string
  type: 'image' | 'file' | 'voice'
  storage_path: string
  public_url: string
  filename: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  thumbnail_url: string | null
  thumbnail_width: number | null
  thumbnail_height: number | null
  blur_hash: string | null
  file_hash: string
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'error'
  sort_order: number
}
```

### Referential Integrity

- `message_attachments.message_id` → `messages.id` CASCADE DELETE
- Attachments cannot exist without a parent message
- Storage paths follow convention: `{bucket}/{conversation_id}/{message_id}/{filename}`
- File hash enables dedup: same hash uploaded twice creates one storage object, two attachment rows

---

## 7. Notification Model

```typescript
interface NotificationEvent {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown>  // Deep link payload
  is_read: boolean
  created_at: string
}

type NotificationType =
  | 'new_message'
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'offer_countered'
  | 'listing_shared'
  | 'mention'
  | 'reaction'
  | 'conversation_added'
  | 'message_edited'
  | 'message_deleted'
```

### Notification Delivery Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Notification Pipeline                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. Action triggers notification_events INSERT           │
│     (via DB trigger or Edge Function)                    │
│                                                          │
│  2a. In-app delivery: Realtime channel                   │
│      └─ chat:notifications:{userId}                      │
│         └─ INSERT on notification_events                 │
│                                                          │
│  2b. Push delivery (future): Edge Function               │
│      └─ Supabase Database Webhook                        │
│         → Edge Function                                  │
│            → FCM / APNs                                  │
│               → Mobile app / Browser push                │
│                                                          │
│  3. Client marks as read via PUT /notifications/{id}/read│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Realtime Architecture

### Channel Design

| Channel Name | Purpose | Events | Mechanism |
|---|---|---|---|
| `chat:user:{userId}` | Conversation list changes | `postgres_changes` on `conversation_participants` | DB trigger |
| `chat:conv:{convId}` | Messages, attachments, reactions | `postgres_changes` on `messages`, `message_attachments`, `message_reactions` | DB trigger (filtered) |
| `chat:offers:{convId}` | Offer state changes | `postgres_changes` on `offers` | DB trigger (filtered) |
| `chat:typing:{convId}` | Typing indicators | `broadcast` | Client-only |
| `chat:presence:{convId}` | Online/offline | `broadcast` + `presence` | Client-only |
| `chat:notifications:{userId}` | In-app notification badges | `postgres_changes` on `notification_events` | DB trigger |
| `chat:uploads:{userId}` | Upload queue progress | `broadcast` | Client-only (same device) |

**Total active subscriptions per user: 4-6** (depending on open conversations).

### Connection Lifecycle

```
Page Mount
  ├── Subscribe to `chat:user:{userId}` (always)
  ├── Subscribe to `chat:notifications:{userId}` (always)
  ├── Subscribe to `chat:presence:{convId}` (per open conversation)
  │
  ├── User opens conversation
  │   ├── Subscribe to `chat:conv:{convId}`
  │   ├── Subscribe to `chat:offers:{convId}`
  │   └── Subscribe to `chat:typing:{convId}`
  │
  └── User navigates away
      └── Unsubscribe from conversation-specific channels

Page Unmount
  └── Unsubscribe from all channels
```

---

## 9. RLS Architecture

### conversations

```sql
CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = id AND profile_id = auth.uid()
  ));

CREATE POLICY "Any authenticated user can create a conversation"
  ON conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

### conversation_participants

```sql
CREATE POLICY "Participants can view participant list"
  ON conversation_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = conversation_id AND cp2.profile_id = auth.uid()
  ));

CREATE POLICY "Creator added on conversation creation"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = conversation_participants.conversation_id
        AND profile_id = auth.uid()
        AND role IN ('admin', 'seller')
      )
    )
  );

CREATE POLICY "Participants can leave conversation"
  ON conversation_participants FOR DELETE
  USING (profile_id = auth.uid());
```

### messages

```sql
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id AND profile_id = auth.uid()
  ));

CREATE POLICY "Participants can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Sender can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid() AND is_deleted = false)
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Sender can soft-delete own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() AND is_deleted = true);
```

### message_attachments

```sql
CREATE POLICY "Participants can view attachments"
  ON message_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_id AND cp.profile_id = auth.uid()
  ));

CREATE POLICY "Senders can insert attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM messages
    WHERE id = message_id AND sender_id = auth.uid()
  ));
```

### offers

```sql
CREATE POLICY "Participants can view offers"
  ON offers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = offers.conversation_id AND profile_id = auth.uid()
  ));

CREATE POLICY "Participants can create offers"
  ON offers FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = offers.conversation_id AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Offer participants can update offers"
  ON offers FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = offers.conversation_id
      AND profile_id = auth.uid()
      AND role IN ('seller', 'admin')
    )
  );
```

### notification_events

```sql
CREATE POLICY "Users can view own notifications"
  ON notification_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notification_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can mark own notifications as read"
  ON notification_events FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### storage.objects

```sql
CREATE POLICY "Anyone can view chat images"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('chat-images', 'chat-files'));

CREATE POLICY "Participants can upload to their conversation path"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('chat-images', 'chat-files')
    AND auth.role() = 'authenticated'
    AND (
      SELECT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = (storage.foldername(name))[1]::uuid
        AND profile_id = auth.uid()
      )
    )
  );
```

---

## 10. Component Hierarchy

```
MessagesPage
├── ChatErrorBoundary
│
├── [ConversationList] (left panel)
│   ├── ConversationListItem (×N)
│   │   ├── Avatar (with PresenceDot)
│   │   ├── MessagePreview
│   │   └── UnreadBadge
│   └── EmptyState / LoadingSkeleton
│
└── [ConversationView] (right panel)
    ├── ConversationHeader
    │   ├── Avatar + PresenceDot
    │   ├── ParticipantName
    │   ├── ListingLink (mini)
    │   └── HeaderActions (view listing, call, etc.)
    │
    ├── MessageList
    │   ├── MessageDateDivider ("Today", "Yesterday", "Jun 15")
    │   ├── MessageBubble (×N)
    │   │   ├── MessageText
    │   │   ├── MessageAttachment (image/file)
    │   │   │   └── MediaCache (lazy image with blur placeholder)
    │   │   ├── OfferCard (for type='offer')
    │   │   ├── SharedListingCard (for type='listing_share')
    │   │   ├── MessageReactions
    │   │   ├── MessageTimestamp
    │   │   ├── ReadReceipt (double-check for own messages)
    │   │   ├── EditButton (own, hover)
    │   │   ├── DeleteButton (own, hover)
    │   │   └── ReplyButton
    │   ├── TypingIndicator
    │   └── ScrollToBottom (floating button)
    │
    ├── MessageInput
    │   ├── TextInput
    │   ├── ImageButton
    │   ├── FileButton
    │   ├── OfferButton
    │   ├── ShareListingButton
    │   ├── AttachmentPreview (bar above input)
    │   └── SendButton
    │
    └── EmptyState (no conversation selected)
```

---

## 11. State Management Strategy

### Dual-Store Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    State Architecture                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────┐   ┌─────────────────────────┐   │
│  │   Zustand Store      │   │   React Query Cache      │   │
│  │                      │   │                          │   │
│  │  - Active conversation│   │  - Conversation list     │   │
│  │  - UI state           │   │  - Messages by page      │   │
│  │  - Typing users       │   │  - Offer data            │   │
│  │  - Upload queue       │   │  - Notification count    │   │
│  │  - Toasts             │   │  - Profile data          │   │
│  │                      │   │                          │   │
│  │  (client-only state)  │   │  (server-synced state)   │   │
│  └─────────────────────┘   └─────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Why Zustand + React Query

- **Zustand**: Lightweight, no boilerplate, works outside React (upload queue, service worker)
- **React Query**: Automatic cache invalidation, stale-while-revalidate, background refetch, pagination helpers, optimistic updates with rollback
- **No overlap**: Zustand manages UI-only state; React Query manages server state

### Zustand Store Shape

```typescript
interface ChatStore {
  // Active conversation
  activeConversationId: string | null
  setActiveConversation: (id: string | null) => void

  // UI state
  showConversationList: boolean
  toggleConversationList: () => void

  // Typing
  typingUsers: Record<string, string[]>  // convId → sender names
  setTyping: (convId: string, userId: string, isTyping: boolean) => void

  // Upload queue
  uploadQueue: UploadQueueItem[]
  addToQueue: (item: UploadQueueItem) => void
  updateQueueItem: (id: string, updates: Partial<UploadQueueItem>) => void
  removeFromQueue: (id: string) => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Presence
  presence: Record<string, 'online' | 'away' | 'offline'>  // userId → status
  setPresence: (userId: string, status: string) => void
}
```

---

## 12. Data Flow

```
User types message
  → MessageInput.handleSubmit()
    → validateInput()
    → uploadQueue.enqueueAttachments(files)
      → each file: validate → add to queue → upload → update progress → complete
    → react-query: sendMessage.mutateAsync()
      → optimistic insert into messages cache
      → supabase.from('messages').insert()
        → on success: confirm cache with server data
        → on failure: rollback optimistic update + show toast
    → clear input
    → uploadQueue.clearAttachments()

Realtime receives new message
  → chat:conv:{id} channel fires (INSERT)
  → react-query invalidates ['messages', conversationId]
    → background refetch merges new message
    → auto-scroll if at bottom

User opens conversation
  → click ConversationListItem
  → navigate to /messages?conversation={id}
  → setActiveConversation(id)
  → react-query: ['messages', id] fetches page 1
  → subscribe to chat:conv:{id}
  → subscribe to chat:offers:{id}
  → subscribe to chat:typing:{id}
  → markAsRead(id)
    → upsert message_reads for all unread messages
    → dispatch 'unread-refresh'
```

### Optimistic Update Strategy

| Operation | Optimistic Strategy |
|-----------|-------------------|
| Send message | Add to React Query cache with temp ID. On success, replace with server ID. On failure, remove + toast. |
| Edit message | Update cache immediately. On failure, revert + toast. |
| Soft-delete message | Update cache to `is_deleted=true`. On failure, revert. |
| Mark as read | Batch INSERT `message_reads`. No optimistic update needed (read is idempotent). |
| Send offer | Add as type='offer' message optimistically. On failure, remove + toast. |
| Upload file | Show progress in upload queue. On success, attach to message. On failure, show error in queue. |

---

## 13. Upload Queue Architecture

### Queue Overview

The upload queue is a first-class citizen — not a side effect of sending a message.

```
┌─────────────────────────────────────────────────────────────┐
│                    Upload Queue                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  State Machine per item:                                     │
│                                                              │
│  ┌──────┐   enqueue    ┌──────────┐   start   ┌─────────┐   │
│  │NEW   │ ──────────→  │QUEUED    │ ────────→ │UPLOADING│   │
│  └──────┘              └──────────┘           └─────────┘   │
│                                                  │           │
│                                          success │  fail     │
│                                            ┌────▼────┐      │
│                                            │DONE     │      │
│                                            └─────────┘      │
│                                                              │
│  Parallel uploads: max 3 concurrent                          │
│  Retry: 3 attempts with exponential backoff                  │
│  Persistence: IndexedDB (survives tab close, page refresh)   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Queue Implementation

```typescript
interface UploadQueueItem {
  id: string
  file: File
  conversationId: string
  status: 'new' | 'queued' | 'uploading' | 'done' | 'failed'
  progress: number      // 0-100
  attachment: Attachment | null
  error: string | null
  retryCount: number
  createdAt: string
}

interface UploadQueueConfig {
  maxConcurrent: 3
  maxRetries: 3
  retryDelay: number[]  // [1000, 3000, 10000]  exponential backoff
  allowedTypes: string[]
  maxSizeBytes: number
}
```

### Flow

```
1. User selects files → each file becomes UploadQueueItem (status='new')
2. Queue processor picks up to 3 items (status='queued')
3. For each item:
   a. Validate file type and size
   b. Compute SHA-256 hash client-side
   c. Check IndexedDB dedup cache (same hash → skip upload, reuse URL)
   d. Upload to Supabase Storage with XMLHttpRequest for progress events
   e. On progress → update item.progress
   f. On complete → insert message_attachments row → set status='done'
   g. On failure → retryCount++ → exponential backoff → max 3 retries
4. When all items for a message are 'done', enable send
5. Send message with attachment IDs
```

### Progress Visibility

- Upload queue items shown as attachment preview cards above the input
- Each card shows: thumbnail (if image) + filename + progress bar + cancel button
- Failed items show retry button + error message

---

## 14. Presence Architecture

### Two-Layer Presence

```
┌─────────────────────────────────────────────────────────┐
│                    Presence System                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: Realtime Presence (instant, ephemeral)         │
│  ─────────────────────────────────────────────────────   │
│  • Supabase Realtime Presence channel                    │
│  • Automatically tracks connect/disconnect               │
│  • Updates every 5 seconds while tab is open             │
│  • No DB write — purely in-memory                        │
│  • Scope: per-conversation channel                       │
│                                                          │
│  Layer 2: Database Presence (persistent, cross-device)   │
│  ─────────────────────────────────────────────────────   │
│  • user_presence table                                   │
│  • Updated on: tab focus, blur, visibility change        │
│  • Debounced: write to DB every 30 seconds while online  │
│  • "Last seen" timestamp for offline users               │
│  • Updated via Edge Function or client-side call         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Client Implementation

```typescript
// usePresence hook
function usePresence(conversationId: string) {
  // Join presence channel on mount
  // Track: 'online' by default, 'away' after 5 min inactivity
  // On tab blur: set 'away'
  // On tab close: set 'offline' (via beforeunload)
  // Heartbeat: update DB every 30 seconds

  // Subscribe to other users' presence changes
  // Update zustand store
  // Return presence map for the conversation
}
```

### Presence States

| State | Meaning | UI Treatment |
|-------|---------|-------------|
| `online` | Active in the last 5 minutes | Green dot |
| `away` | No activity for 5+ minutes | Yellow dot |
| `offline` | No heartbeat for 10+ minutes | Gray dot + "Last seen {time}" |

---

## 15. Typing Indicator Architecture

### Protocol

```
┌─────────────────────────────────────────────────────────┐
│                 Typing Indicator Protocol                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  All via Supabase Realtime Broadcast (no DB writes):     │
│                                                          │
│  1. User starts typing                                   │
│     → Broadcast { type: 'typing', userId, userName }     │
│     → Other participants receive instantly               │
│                                                          │
│  2. User stops typing for 3 seconds                      │
│     → Auto-clear local timer                             │
│     → Broadcast { type: 'stopped_typing', userId }       │
│                                                          │
│  3. User sends a message                                 │
│     → Immediately clear typing indicator                 │
│     → Broadcast { type: 'stopped_typing', userId }       │
│                                                          │
│  4. Timeout safety                                       │
│     → Client-side: auto-clear after 5 seconds if no      │
│       'stopped_typing' received                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Debouncing

```typescript
// Typing indicator is NOT sent on every keystroke
// Instead: debounced at 2-second intervals
// First keystroke: immediate broadcast
// Subsequent: every 2 seconds while typing continues
// Stop: 3 seconds after last keystroke → broadcast stop

let typingTimer: NodeJS.Timeout | null = null
let lastTypingBroadcast = 0

function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  setText(e.target.value)

  const now = Date.now()
  if (now - lastTypingBroadcast > 2000) {
    broadcastTyping()
    lastTypingBroadcast = now
  }

  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    broadcastStoppedTyping()
  }, 3000)
}
```

---

## 16. Offer Negotiation Architecture

### State Machine

```
┌─────────────────────────────────────────────────────────┐
│                  Offer State Machine                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                  ┌──────────┐                            │
│                  │  PENDING │                            │
│                  └────┬─────┘                            │
│                       │                                  │
│          ┌────────────┼────────────┐                     │
│          │            │            │                     │
│          ▼            ▼            ▼                     │
│    ┌─────────┐  ┌──────────┐  ┌──────────┐              │
│    │COUNTERED│  │ ACCEPTED │  │ REJECTED │              │
│    └────┬────┘  └──────────┘  └──────────┘              │
│         │                                                │
│         ▼ (new offer from recipient)                     │
│    ┌──────────┐                                          │
│    │  PENDING │ (loop back)                              │
│    └──────────└                                          │
│                                                          │
│  Also: WITHDRAWN (sender cancels), EXPIRED (timeout)     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Offer Message Flow

```
1. Buyer taps "Make Offer"
   → Modal/input for price + optional note
   → Creates offer row (status='pending')
   → Creates system message (type='offer') with metadata { offer_id, amount }

2. Seller receives notification
   → Can Accept / Counter / Reject
   → Accept: offer.status='accepted', system message type='offer_accept'
   → Counter: new offer row (status='pending', counter_to_offer_id=original), system message
   → Reject: offer.status='rejected', system message

3. Buyer receives response
   → If countered: can Accept / Counter again / Reject
   → If accepted: system message with payment link (future)

4. All offer actions create notification_events for the other party
```

### Offer Card UI

```typescript
interface OfferCardProps {
  offer: Offer
  isOwn: boolean
  canAct: boolean      // Seller can accept/counter/reject
  onAccept: () => void
  onCounter: (amount: number) => void
  onReject: () => void
  onWithdraw: () => void
}
```

The Offer Card appears inside the MessageBubble for `type='offer'` messages. It shows:
- Listing thumbnail + title
- Offer amount (prominent)
- Status badge
- Action buttons based on current state and user role
- Counter-offer history (linked by `counter_to_offer_id`)

---

## 17. Shared Listing Architecture

### Listing Share Flow

```
1. User taps "Share Listing" in MessageInput or on a listing detail page
2. Creates a system message (type='listing_share') with metadata:
   {
     listing_id: string,
     listing_title: string,
     listing_price: number,
     listing_image: string,
     listing_url: string
   }
3. The other participant sees a rich card with:
   - Thumbnail image
   - Title
   - Price
   - "View Listing" button → deep link to /listings/{id}
4. No separate DB table needed — metadata is stored in the message's JSONB column
```

### SharedListingCard Component

```typescript
interface SharedListingCardProps {
  listingId: string
  title: string
  price: number
  imageUrl: string | null
  isOwn: boolean
}
```

---

## 18. Media Caching Architecture

### Cache Layers

```
┌─────────────────────────────────────────────────────────┐
│                   Media Cache System                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: In-memory LRU Cache                            │
│  ──────────────────────────────────────────              │
│  • Most recently viewed images (max 50)                  │
│  • Key: attachment.id + size (thumb/full)                │
│  • Persistence: none (lost on page refresh)              │
│  • Storage: Map<string, Blob>                            │
│                                                          │
│  Layer 2: IndexedDB Cache                                │
│  ──────────────────────────────────                      │
│  • All images viewed in last 7 days                      │
│  • Key: attachment.id + size                             │
│  • Max size: 200 MB                                      │
│  • Eviction: LRU when full, or by age (>7 days)          │
│  • Storage: IndexedDB object store                       │
│                                                          │
│  Layer 3: Browser HTTP Cache                             │
│  ─────────────────────────────────                       │
│  • Supabase Storage CDN cache headers                    │
│  • Cache-Control: public, max-age=31536000, immutable    │
│  • No client code needed — browser handles it            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Image Loading Strategy

```typescript
// Progressive image loading:
1. Show blurred placeholder from blur_hash (or solid color)
2. Check Layer 1 (in-memory) → if hit, show immediately
3. Check Layer 2 (IndexedDB) → if hit, show from cache, async update Layer 1
4. Fetch from network → show from network, async update Layer 1 + Layer 2
5. Store in IndexedDB with expiry

// Thumbnail-first loading:
1. Load thumbnail_url first (small, fast)
2. Load full-size in background
3. Swap when full-size is ready
```

---

## 19. Offline Recovery Strategy

### Offline State Detection

```typescript
// useNetworkStatus hook
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Supabase client heartbeat check (more reliable than navigator.onLine)
    const interval = setInterval(async () => {
      const { error } = await supabase.from('conversations').select('id').limit(1).maybeSingle()
      if (error?.message?.includes('fetch')) setIsOnline(false)
      else setIsOnline(true)
    }, 30000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
  }, [])
}
```

### Offline Behavior Matrix

| User Action | Online | Offline | On Reconnect |
|---|---|---|---|
| View conversations | Fetch from server | Show IndexedDB cache | Refresh |
| View messages | Fetch from server | Show IndexedDB cache | Refresh |
| Send text message | Send immediately | Queue in IndexedDB | Send all queued |
| Send image/file | Upload + send | Queue file + metadata | Upload + send |
| Edit message | Update server | Queue update | Apply queued updates |
| Delete message | Soft-delete server | Queue delete | Apply queued deletes |
| Mark as read | Insert message_reads | Queue reads | Batch insert reads |
| Typing indicator | Broadcast | No-op | No-op (ephemeral) |

### Offline Queue Structure

```typescript
interface OfflineQueueItem {
  id: string
  type: 'send_message' | 'edit_message' | 'delete_message' | 'mark_read' | 'upload_file'
  payload: Record<string, unknown>
  createdAt: string
  retryCount: number
}
```

### Reconnect Sync

```
1. Detect online (via navigator.onLine + Supabase heartbeat)
2. Show banner: "Syncing..."
3. Process offline queue in order:
   a. Upload pending files first (need URLs before message can be sent)
   b. Send pending messages (with attachment IDs)
   c. Apply pending edits and deletes
   d. Batch mark reads
4. On each item success: remove from queue
5. On each item failure: retry up to 3 times, then skip + log
6. Show result: "Synced 5 messages" or "2 messages failed to sync"
7. Refresh conversation list and active conversation
```

---

## 20. Security Strategy

### Authentication & Authorization

| Area | Strategy |
|------|----------|
| User identity | Supabase Auth (JWT-based) |
| API access | RLS policies on every table |
| Storage access | RLS policies on storage.objects |
| Admin actions | Separate admin role with elevated policies |
| Rate limiting | Edge Function middleware (in future) |

### Data Protection

| Concern | Mitigation |
|---------|------------|
| Message tampering | RLS ensures only sender can edit/delete own messages; content is immutable once sent |
| SQL injection | Supabase JS client parameterizes all queries automatically |
| XSS | Messages rendered as text, not HTML. Attachment URLs sanitized. |
| Malicious file upload | Client-side MIME check + server-side virus scan (future: Edge Function with ClamAV) |
| File type spoofing | Server-side MIME validation + file hash verification |
| Data at rest | Supabase encrypts data at rest (default) |
| Data in transit | TLS enforced by Supabase |

### File Upload Security Checklist

```typescript
const UPLOAD_SECURITY = {
  allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedFileMimeTypes: [
    'application/pdf',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxImageSize: 10 * 1024 * 1024,      // 10 MB
  maxFileSize: 25 * 1024 * 1024,       // 25 MB
  maxTotalUploads: 10,                  // per message
  scanMethod: 'client_only'            // Phase 1; server-side scanning in Phase 2
}
```

### Privacy

| Concern | Mitigation |
|---------|------------|
| Message visibility | Only conversation participants can see messages |
| Read receipts | Visible to senders (not other participants) |
| Typing indicators | Visible to all active participants |
| Presence | Visible to participants in shared conversations only |
| File access | Storage RLS restricts to conversation participants |
| Data retention | Messages retained indefinitely; user can delete own messages |
| GDPR/CCPA | Export tool (future): download all user data; delete tool: cascade delete user data |

---

## 21. Scalability Target

### Current Scale

| Metric | Current Prototype | Target v2 |
|--------|-------------------|-----------|
| Conversations per user | Unlimited (no pagination) | 500+ with pagination |
| Messages per conversation | Unlimited (no pagination) | 10,000+ with cursor pagination |
| Attachments per message | Unlimited (JSONB) | 25 (practical limit) |
| Participants per conversation | 2 (hard-coded) | 50 |
| Concurrent Realtime channels | 8 per user | 4-6 per user |
| File size per upload | Unlimited | 25 MB |
| Daily active users | N/A (pre-launch) | 10,000 DAU (Phase 1) |

### Database Projections

| Metric | 10K DAU | 100K DAU | 1M DAU |
|--------|---------|----------|--------|
| Messages/day | 50K | 500K | 5M |
| Attachments/day | 5K | 50K | 500K |
| Conversations/user | 10 avg | 25 avg | 50 avg |
| Messages/conversation | 20 avg | 50 avg | 100 avg |
| Storage/images | 5 GB/mo | 50 GB/mo | 500 GB/mo |
| Storage/files | 2 GB/mo | 20 GB/mo | 200 GB/mo |

### Bottlenecks & Mitigations

| Bottleneck | Mitigation |
|------------|------------|
| Realtime connections | Supabase max 500 per project; use connection pooling or project scaling |
| Database writes | Batch inserts for message_reads; connection pooling via Supabase pgBouncer |
| Storage throughput | Supabase CDN for reads; parallel uploads capped at 3 concurrent |
| Index scans at scale | Partition messages table by month after 10M rows |
| Realtime event volume | Filtered subscriptions (per-conversation, not global) |

---

## 22. Testing Architecture

### Test Pyramid

```
        ╱─────╲
       ╱ E2E  ╲        Playwright / Cypress
      ╱─────────╲       Critical user journeys
     ╱Integration╲
    ╱─────────────╲     React Testing Library + MSW
   ╱   Unit Tests   ╲   Hook tests, util tests, API tests
  ╱───────────────────╲
 ╱     Static Analysis  ╲  TypeScript strict, ESLint, Prettier
╱─────────────────────────╲
```

### Test Categories

```
src/features/chat/__tests__/
├── api.test.ts                    # API layer (mocked Supabase)
├── mutations.test.ts              # Write operations
├── hooks.test.ts                  # useChat, useConversations, useMessages
├── components.test.tsx            # MessageBubble, MessageInput, etc.
├── uploadQueue.test.ts            # Queue manager
├── offerMachine.test.ts           # Offer state machine
├── mediaCache.test.ts             # Cache operations
├── offlineQueue.test.ts           # Offline queue
├── migrationUtils.test.ts         # Data migration helpers
└── e2e/
    ├── chat.spec.ts               # Full chat flow
    ├── offers.spec.ts             # Offer negotiation
    └── attachments.spec.ts        # Upload flow
```

### What Each Layer Tests

**Unit Tests**
- `messageUtils`: format time, group by date, truncate content
- `uploadUtils`: validate files, generate paths, compute hashes
- `offerUtils`: format currency, validate amounts, determine next allowed states
- `mediaCacheUtils`: generate cache keys, eviction ordering
- `migrationUtils`: transform old message format to new

**Integration Tests**
- `chatApi`: Each API function with mocked Supabase client
- `useChat`: Hook behaves correctly with mock data + mock Realtime
- `useUploadQueue`: Queue processes items in order, handles retries, respects concurrency limit
- Components render with various props (loading, empty, error, edge cases)

**E2E Tests (Playwright)**
1. Send message → appears for both users
2. Send image → uploads to storage, appears in chat
3. Edit message → updated for both users
4. Delete message → tombstone shown
5. Make offer → seller receives, can counter/accept/reject
6. Offline → queue message → online → message sent
7. Page refresh → state restored from cache

---

## 23. Data Migration Plan

### Phase 1: Schema Migration (zero-downtime)

```
Step 1: Create new tables
─────────────────────────
• CREATE TABLE conversation_participants
• CREATE TABLE message_attachments
• CREATE TABLE message_reads
• CREATE TABLE message_reactions
• CREATE TABLE offers
• CREATE TABLE notification_events
• CREATE TABLE user_presence
• ALTER TABLE messages ADD COLUMNS (type, metadata, is_deleted, reply_to)
  → Keep all existing columns; add new ones with defaults
  → No destructive operations
• Add new indexes

Step 2: Backfill data
─────────────────────
• Backfill conversation_participants:
  INSERT INTO conversation_participants (conversation_id, profile_id, role)
  SELECT id, buyer_id, 'buyer' FROM conversations
  UNION ALL
  SELECT id, seller_id, 'seller' FROM conversations

• Set type='text', is_deleted=false on all existing messages:
  UPDATE messages SET type = 'text', is_deleted = false WHERE type IS NULL

• Migrate JSONB attachments to message_attachments:
  INSERT INTO message_attachments (message_id, type, storage_path, public_url, filename, mime_type, size_bytes, sort_order)
  SELECT m.id, att->>'type', '', att->>'url', att->>'name', '', (att->>'size')::int, 0
  FROM messages m, jsonb_array_elements(m.attachments) att
  WHERE jsonb_array_length(m.attachments) > 0

• Migrate is_read to message_reads:
  INSERT INTO message_reads (message_id, profile_id, read_at)
  SELECT m.id, cp.profile_id, m.created_at
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE m.is_read = true AND m.sender_id != cp.profile_id
```

### Phase 2: Code Migration

```
Step 1: Feature flag
────────────────────
• Add VITE_FEATURE_NEW_CHAT env var
• Old Messages.tsx renders if flag is off
• New MessagesPage renders if flag is on
• Both share the same DB schema (backward compatible)

Step 2: Gradual rollout
────────────────────────
• Enable for 1% of users → monitor error rate
• Enable for 10% → monitor for 24 hours
• Enable for 50% → monitor for 48 hours
• Enable for 100%

Step 3: Parallel run
─────────────────────
• Both old and new chat run concurrently
• New chat writes to new tables + keeps old tables in sync
• Old chat continues to read/write old tables
• Monitor data consistency between old and new tables
```

### Phase 3: Cleanup

```
Step 1: Deprecate old code
───────────────────────────
• Remove old useConversations, useMessages, useUnreadCount hooks
• Remove old ConversationList, MessageBubble, MessageInput components
• Remove old Messages.tsx page

Step 2: Drop old columns
─────────────────────────
• ALTER TABLE conversations DROP COLUMN buyer_id
• ALTER TABLE conversations DROP COLUMN seller_id
• ALTER TABLE conversations DROP COLUMN last_message
• ALTER TABLE conversations DROP COLUMN last_message_at
• ALTER TABLE messages DROP COLUMN is_read
• ALTER TABLE messages DROP COLUMN attachments
• DROP old RLS policies
• DROP old indexes

Step 3: Remove feature flag
────────────────────────────
• Remove VITE_FEATURE_NEW_CHAT env var
• Clean up old code paths
```

---

## 24. Rollback Strategy

### Pre-Deployment Checklist

```typescript
interface DeploymentChecklist {
  database: {
    migrationsApplied: boolean     // All new tables + columns exist
    backfillComplete: boolean      // Data migrated
    indexesVerified: boolean       // Query plans use new indexes
    rollbackScriptReady: boolean   // Script to revert schema changes
  }
  code: {
    featureFlagInPlace: boolean    // VITE_FEATURE_NEW_CHAT toggle
    oldCodePath: boolean           // Old code path still functional
    errorTracking: boolean         // Sentry / logging configured
  }
  monitoring: {
    alertThresholds: {
      errorRate: number            // Alert if > 0.1% error rate
      messageLatency: number       // Alert if p95 > 2 seconds
      uploadLatency: number        // Alert if p95 > 10 seconds
      realtimeLatency: number      // Alert if p95 > 500ms
    }
    dashboards: boolean            // Grafana / Supabase monitoring
  }
}
```

### Rollback Triggers

| Condition | Action | Timeframe |
|-----------|--------|-----------|
| Error rate > 0.5% | Flip feature flag off | Immediate |
| Message p95 latency > 3s | Flip feature flag off | 5 minutes |
| Realtime disconnects > 5% | Flip feature flag off | Immediate |
| Data inconsistency detected | Full rollback (flag + migration revert) | 1 hour |
| Critical bug found in production | Hotfix or feature flag off | Immediate |

### Rollback Steps

```
Immediate rollback (feature flag):
  1. Set VITE_FEATURE_NEW_CHAT to false
  2. Redeploy with old code path
  3. Old chat continues using old columns/tables
  4. New data in new tables remains (no data loss)
  5. Investigate root cause

Full rollback (migration revert):
  1. Feature flag off (immediate fix)
  2. Run rollback migration:
     - DROP TABLE IF EXISTS conversation_participants
     - DROP TABLE IF EXISTS message_attachments
     - DROP TABLE IF EXISTS message_reads
     - DROP TABLE IF EXISTS message_reactions
     - DROP TABLE IF EXISTS offers
     - DROP TABLE IF EXISTS notification_events
     - DROP TABLE IF EXISTS user_presence
     - ALTER TABLE messages DROP COLUMN type
     - ALTER TABLE messages DROP COLUMN metadata
     - ALTER TABLE messages DROP COLUMN is_deleted
     - ALTER TABLE messages DROP COLUMN reply_to
     - DROP INDEX IF EXISTS idx_messages_conversation_created
  3. Verify old schema functions
  4. Deploy old code

Data reconciliation (post-rollback):
  - Compare old conversation data with new tables
  - If new tables have data that old tables don't:
    - Copy offers → system messages
    - Copy message_reads → update is_read
  - No data loss: new tables are additive, old tables untouched
```

---

## 25. Voice Call Future Architecture

### Vision

Voice calls are not implemented in v2. This section defines the architecture so the v2 schema supports it.

### Schema Additions (future)

```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS call_duration INTEGER;  -- seconds
ALTER TABLE messages ADD TYPE IF NOT EXISTS 'call_start', 'call_end', 'call_missed';

CREATE TABLE call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  callee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('ringing', 'ongoing', 'ended', 'missed', 'rejected')),
  duration INTEGER,           -- seconds
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  call_type TEXT DEFAULT 'audio' CHECK (call_type IN ('audio', 'video'))
);
```

### Voice Call Architecture (Future)

```
┌─────────────────────────────────────────────────────────┐
│                  Voice Call Architecture                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Signaling:                                               │
│  ──────────                                               │
│  • Supabase Realtime Broadcast for call events            │
│  • Channel: chat:calls:{conversationId}                  │
│  • Events: call_request, call_accept, call_reject,        │
│            call_end, ice_candidate, offer, answer         │
│                                                          │
│  Media:                                                   │
│  ──────                                                   │
│  • WebRTC (peer-to-peer) for audio/video                  │
│  • TURN server fallback (Coturn or Cloudflare Calls)      │
│  • STUN server for NAT traversal                          │
│                                                          │
│  Recording (future):                                      │
│  ──────────                                               │
│  • Server-side recording via MediaRecorder API            │
│  • Store in Supabase Storage → message_attachments        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Architecture Summary

| Area | New Architecture | Status |
|------|-----------------|--------|
| DB Tables | 9 (conversations, conversation_participants, messages, message_attachments, message_reads, message_reactions, offers, notification_events, user_presence) | 🆕 |
| Indexes | 15+ targeted indexes | 🆕 |
| RLS Policies | 20+ granular policies | 🆕 |
| Realtime Channels | 4-6 per user (was 8) | ✅ Improved |
| State Management | Zustand + React Query | 🆕 |
| Hooks | 6 focused hooks (was 3 overlapping) | ✅ Improved |
| Pagination | Cursor-based on both convs + msgs | 🆕 |
| File Upload | Dedicated queue with progress + retry | 🆕 |
| Offline Support | IndexedDB queue + reconnect sync | 🆕 |
| Types | Strict typed, no casts | ✅ Improved |
| Error Handling | Toasts + error boundary + structured errors | 🆕 |
| Testing | Unit + Integration + E2E (Playwright) | 🆕 |
| Migration | 3-phase zero-downtime | 🆕 |
| Rollback | Feature flag + migration revert | 🆕 |
