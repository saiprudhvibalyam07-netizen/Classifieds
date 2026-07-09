# ValBot Phase 1A.1 — Foundation Hardening Report

**Date:** 2026-07-08
**Sprint:** Architecture Hardening (no AI, no RAG, no OpenAI)

---

## Executive Summary

All four P0 blockers identified in the Phase 1A Audit have been resolved. The architecture now has a clean provider abstraction layer, streaming-ready state management, properly initialized session context for RLS, and a dependency-free conversation manager. Zero regressions across all 76 existing tests. TypeScript and build pass cleanly. Phase 1B can proceed with a confirmed **GO**.

---

## P0 Resolutions

### P0-1: Provider Abstraction ✅

**Before:** `ChatContext.tsx` imported `mockConversationProvider` directly. No interface. Swapping providers required editing the context.

**After:**
- `services/provider.ts` — defines `ConversationProvider` interface with `sendMessage()`, `getRoleResponse()`, `getStarterPrompts()`
- `services/provider.ts` — exports `getConversationProvider()` factory that returns mock or real provider based on `CHATBOT_CONFIG.mockMode`
- `services/mockConversationProvider.ts` — now typed as `ConversationProvider` (implements the interface)
- `contexts/ChatContext.tsx` — imports `getConversationProvider()` factory instead of the concrete mock

**Files created:** `services/provider.ts`
**Files modified:** `services/mockConversationProvider.ts`, `contexts/ChatContext.tsx`

```typescript
// services/provider.ts
export interface ConversationProvider {
  sendMessage(content: string, role: ChatbotRole, options?: SendMessageOptions): Promise<MockResponse>
  getRoleResponse(role: ChatbotRole): string
  getStarterPrompts(role: ChatbotRole): string[]
}

export function getConversationProvider(): ConversationProvider {
  if (CHATBOT_CONFIG.mockMode) return mockConversationProvider
  return mockConversationProvider  // → openaiConversationProvider in Phase 1B
}
```

### P0-2: Streaming Support ✅

**Before:** No streaming action types. `ChatAction` had 9 types, none for incremental content.

**After:**
- Added `'streaming'` to `MessageStatus` type
- Added `streamingMessageId: string | null` to `ChatState`
- Added 4 new `ChatAction` types:
  - `START_STREAM` — creates empty assistant message, sets `streamingMessageId`
  - `STREAM_TOKEN` — appends content token to the streaming message
  - `END_STREAM` — marks message as `'sent'`, clears `streamingMessageId`
  - `STREAM_ERROR` — marks message as `'failed'`, sets error, clears `streamingMessageId`
- `sendMessage` in ChatContext now uses `onToken` callback for streaming
- Mock provider supports streaming token emission via `onToken` option (word-by-word)
- `AssistantBubble` already had `isStreaming` prop — UI is ready

**Files modified:** `types.ts`, `contexts/ChatContext.tsx`, `services/mockConversationProvider.ts`

### P0-3: Session / RLS ✅

**Before:** RLS policies referenced `current_setting('app.session_id', TRUE)` but the app never set this session variable. Anonymous users could never match their own conversations via RLS.

**After:**
- Created migration `00021_chatbot_hardening.sql` with `public.set_chatbot_session(session_id text)` function
- `conversationManager.ts` calls `setSessionContext(sessionId)` before any query that uses `session_id`:
  - `createConversation()` for anonymous users
  - `getActiveConversation()` for anonymous users
- Authenticated users use `user_id = auth.uid()` — no change needed

```sql
CREATE OR REPLACE FUNCTION public.set_chatbot_session(session_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.session_id', session_id, true);
END;
$$;
```

**Files created:** `supabase/migrations/00021_chatbot_hardening.sql`
**Files modified:** `services/conversationManager.ts`

### P0-4: ConversationManager Cleanup ✅

**Before:** `saveMessage` called `supabase.rpc('increment', { x: 1 })` cast as `number` — this depended on an undocumented database function that may not exist.

**After:**
- Removed the `message_count` increment entirely from `saveMessage`
- Keep `last_activity` and `updated_at` updates (these work directly)
- `message_count` is handled by the DB default (0) and can be computed via a trigger or COUNT query if needed in the future

**Files modified:** `services/conversationManager.ts`

---

## Additional Improvements

### useChat Cleanup
- Added cancellation flag (`cancelled`) to prevent dispatches after unmount
- Removed the dead `if (!CHATBOT_CONFIG.mockMode)` branch that was a no-op stub
- Cleaner init flow

### Index Exports
- Added `ConversationProvider` type and `getConversationProvider` function to barrel exports

### Test Mock Updated
- `setup.ts` supabase mock already handled `rpc` + `maybeSingle` chain — no changes needed

---

## Architecture Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Provider coupling | `ChatContext` imports `mockConversationProvider` directly | Factory returns interface implementation |
| Provider swapping | Edit ChatContext source | Change one line in factory |
| Streaming actions | None | 4 new action types |
| `streamingMessageId` | Not tracked | Tracked in state |
| Session RLS | Never initialized | Set via `set_chatbot_session()` RPC |
| `rpc('increment')` | Used with undocumented cast | Removed |
| `useChat` cleanup | None | Cancellation flag added |
| `mockMode` branch | Dead stub that returned early | Removed — provider factory handles routing |

---

## Regression Results

| Check | Status |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ Pass |
| Vite build | ✅ Pass |
| Existing tests (76) | ✅ 76/76 pass across 16 files |
| Chatbot unit tests | ✅ All pass |
| Integration tests | ✅ All pass |
| Accessibility tests | ✅ All pass |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| `set_chatbot_session` requires DB migration to be applied | Medium | Must run `supabase migration up` before anonymous chat works |
| `message_count` field no longer auto-incremented | Low | Can be computed via `COUNT` query or a DB trigger (not needed for Phase 1A.1) |
| `useChat.retryMessage` re-sends exact content | Low | Stateful AI conversations may need context-aware retry in Phase 1B |
| No focus trap on chat panel | Low | Accessibility gap, not a P0 |

---

## Phase 1B Readiness

| Requirement | Status |
|------------|--------|
| Provider abstraction for AI swap | ✅ `getConversationProvider()` factory |
| Streaming action types in reducer | ✅ `START_STREAM`, `STREAM_TOKEN`, `END_STREAM`, `STREAM_ERROR` |
| UI can render streamed responses | ✅ `AssistantBubble` has `isStreaming` prop |
| DB schema supports tools/sources | ✅ Already in `00020_chatbot.sql` |
| Session RLS initialized | ✅ `set_chatbot_session()` RPC |
| No undocumented DB dependencies | ✅ `rpc('increment')` removed |
| Error propagation for AI failures | ✅ `STREAM_ERROR` action |
| Cancel in-flight requests | ✅ `abortRef` in ChatContext |

Phase 1B can now:
1. Create `openaiConversationProvider.ts` implementing `ConversationProvider`
2. Wire it in `provider.ts` factory
3. Add tool call handling to the reducer
4. All UI components work without changes

---

## Final Decision

# ✅ GO

All P0 blockers resolved. Architecture is hardened. Streaming is wired. Session RLS is fixed. No regressions. Phase 1B can begin.

**Files created:** 2 (`services/provider.ts`, `supabase/migrations/00021_chatbot_hardening.sql`)
**Files modified:** 6 (`types.ts`, `contexts/ChatContext.tsx`, `services/mockConversationProvider.ts`, `services/conversationManager.ts`, `hooks/useChat.ts`, `index.ts`)
**Files deleted:** 0
**Regressions:** 0
