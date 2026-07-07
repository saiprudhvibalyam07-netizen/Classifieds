# Automation Test Plan — Valclassifieds

**Version:** 2.0  
**Date:** 2026-07-07  
**Project ref:** `seqzkrwgpshqinsjhxwh`  
**Test runner:** Playwright 1.52+

---

## 1. Test Architecture

Three-tier test strategy targeting different layers of the stack:

| Tier | Layer | Files | Tests | Status | Command |
|------|-------|-------|-------|--------|---------|
| **API** | Supabase REST endpoints (real) | 10 | 72 | ✅ 72/72 pass | `npx playwright test --project=api` |
| **Mock** | Service-layer mocks (isolated) | 4 | 31 | ✅ 31/31 pass | `npx playwright test --project=mock` |
| **E2E** | Full browser UI (real Supabase) | 17 | 77 | 🟡 Not yet run | `npx playwright test --project=e2e` |

**Total: 31 test files, 180 test cases**

---

## 2. Environment

| Variable | Source | Used By |
|----------|--------|---------|
| `SUPABASE_URL` | `.env.test` | API + E2E |
| `SUPABASE_ANON_KEY` | `.env.test` | API + E2E |
| `BASE_URL` | `.env.test` (default `http://localhost:5173`) | E2E |
| `TEST_BUYER_EMAIL` / `TEST_BUYER_PASSWORD` | `.env.test` | Auth, Listings, Favorites, Chat |
| `TEST_SELLER_EMAIL` / `TEST_SELLER_PASSWORD` | `.env.test` | Auth, Listings |
| `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` | `.env.test` | Admin, Profile |
| Supabase project | `seqzkrwgpshqinsjhxwh` (staging) | All |

---

## 3. Test Users

| Role | Email | Used For |
|------|-------|----------|
| Buyer | `rajesh.kumar@valclassifieds.test` | Login, Register (exists check), Profile, Favorites, Chat |
| Seller | `priya.sharma@valclassifieds.test` | Auth, Listings (seller-scoped queries) |
| Admin | `arun.pillai@valclassifieds.test` | Admin panel, Admin API tests |
| Dynamic | `e2e-test-{uuid}@valclassifieds.test` | Registration / Signup tests (unique per run) |

---

## 4. Tier Details

### 4.1 API Tests (10 files, 72 tests)

**Location:** `tests/e2e/specs/api/`  
**Utilities:** `tests/e2e/api/` (client.ts, auth.ts, cleanup.ts, fixtures.ts)

| Module | Files | Tests | Coverage |
|--------|-------|-------|----------|
| Auth | 5 | 18 | signIn, signUp, signOut, getSession, resetPassword, updateUser, AuthCallback |
| Listings | 3 | 28 | Browse/search/filter, CRUD, admin ops (approve/reject/toggle) |
| Profiles | 2 | 9 | Own profile CRUD, admin list, public seller view |
| Categories | 1 | 8 | List all, by slug, field selection, ordering |

**Test approach:** Direct Supabase REST calls with real authentication. Tagged data (`[API_TEST:<uuid>]`) with cleanup.

**Known caveats:**
- Seller creds outdated — seller tests use buyer/admin alternatives
- Categories DB has 6 categories (not 16 as originally seeded)
- No check constraints on negative/zero price
- Status defaults to `active` (not `pending`) on INSERT

### 4.2 Mock Tests (4 files, 31 tests)

**Location:** `tests/e2e/specs/mock/`

| Module | File | Tests | What's mocked |
|--------|------|-------|---------------|
| Auth | `auth/login.spec.ts` | 7 | Supabase auth client (signIn, signOut, session, events) |
| Admin | `admin/access.spec.ts` | 3 | Auth context (admin vs non-admin), navigation guards |
| Listings | `listings/browse.spec.ts` | 8 | Supabase listing queries (filter, sort, paginate) |
| Chat | `chat/messaging.spec.ts` | 12 | Conversations, messages, send/delete, real-time events |

**Test approach:** Vitest + mocks of `@supabase/supabase-js`. Isolated, fast, no DB dependency.

### 4.3 E2E Tests (17 files, 77 tests)

**Location:** `tests/e2e/specs/e2e/`

| Module | Files | Tests | Key Routes |
|--------|-------|-------|------------|
| Home | 1 | 7 | `/` |
| Auth | 5 | 18 | `/login`, `/register`, `/forgot-password`, `/update-password`, `/auth/callback` |
| Listings | 4 | 21 | `/listings`, `/listings/:id`, `/create`, `/dashboard` |
| Category | 1 | 7 | `/category/vehicles`, `/category/property`, `/category/jobs`, `/category/services`, `/category/electronics`, `/category/community` |
| Favorites | 1 | 2 | `/favorites` |
| Profile | 1 | 3 | `/profile` |
| Seller | 1 | 2 | `/seller/:id` (via listing detail) |
| Chat | 1 | 8 | `/chat` |
| Admin | 2 | 7 | `/admin` (panel + access control) |

**Fixtures used:**
- `noAuthContext` — unauthenticated page objects (loginPage)
- `e2eContext` — authenticated buyer POMs (chatPage)
- `adminContext` — admin-authenticated POMs (adminPage)

**Seeds required:** `seed_test_users.sql`, `seed_test_listings.sql`, `seed_test_favorites.sql`, `seed_test_chat.sql`

---

## 5. Test Data Strategy

| Aspect | Approach |
|--------|----------|
| API isolation | Tagged records (`[API_TEST:<uuid>]`), pre-clean + post-clean |
| Mock isolation | Each test creates fresh mocks via `beforeEach` |
| E2E isolation | Seeded data via SQL files, sequential execution |
| Auth isolation | Dynamic emails for signup tests |
| Cleanup strategy | Soft-delete (status=inactive) for API; mock resets automatically; E2E seeds are idempotent |
| Race conditions | `fullyParallel: false` prevents cross-test contamination |

---

## 6. Execution

| Aspect | Detail |
|--------|--------|
| Sequential | `fullyParallel: false` — tests share DB and user sessions |
| Retries | 1 on CI, 0 locally |
| Timeout | 60s per test (E2E), 30s per test (API), 60s per test (Mock) |
| Reporting | HTML (`playwright-report/`), Allure (`allure-results/`), JUnit, JSON, Excel |
| Reports location | `tests/api/reports/`, `tests/mock/reports/`, `tests/e2e/reports/` |

**Execution commands:**

```bash
# Run all tiers
npx playwright test

# Run individual tiers
npx playwright test --project=api
npx playwright test --project=mock
npx playwright test --project=e2e
```

---

## 7. Results Summary

| Tier | Total | Passed | Failed | % | Date Run |
|------|-------|--------|--------|---|----------|
| API | 72 | 72 | 0 | 100% | 2026-07-05 |
| Mock | 31 | 31 | 0 | 100% | 2026-07-05 |
| E2E | 77 | — | — | — | Pending |
| **Total** | **180** | **103** | **0** | — | |

---

## 8. Project Safety

| Concern | API | Mock | E2E |
|---------|-----|------|-----|
| Modifies production code? | NO | NO | NO |
| Modifies React components? | NO | NO | NO |
| Modifies app logic? | NO | NO | NO |
| Modifies DB schema? | NO | NO | NO |
| Modifies migrations? | NO | NO | NO |
| Modifies RLS policies? | NO | NO | NO |
| Modifies storage buckets? | NO | NO | NO |
| Creates test data? | YES (tagged, cleaned) | NO | YES (seeds) |
| Modifies existing tests? | NO | NO | NO |

---

## 9. Known Issues / Caveats

1. **E2E not yet executed** — 77 tests written but not run; Chat tests may fail without seeded conversations
2. **Seller creds outdated** — `priya.sharma@valclassifieds.test` password may not match current DB
3. **API price constraints** — No check constraint for negative/zero prices (DB allows them)
4. **API status default** — `status` defaults to `active` on INSERT, not `pending`
5. **Categories count** — DB has 6 categories (not 16 as originally in seed)
6. **E2E selector mismatches** — Recent audit fixed 8 mismatches between tests and source selectors/text
7. **E2E Chat data** — Tests are conditional (skip when no conversations exist for buyer)

---

*Generated: 2026-07-07*
