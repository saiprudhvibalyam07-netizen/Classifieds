# Mock Data — ValClassifieds QA Test Suite

Production-quality mock data generated for the complete QA test suite.
Covers every positive, negative, boundary, security, and edge-case test scenario from `qa-suite/`.

## Quick Start

```bash
# Reset database and import all data
psql $DATABASE_URL < mock-data/import.sql

# Or import individual datasets
psql $DATABASE_URL -c "\copy users FROM 'mock-data/users.json' WITH (FORMAT json);"
```

## Dataset Summary

| File | Records | Purpose |
|------|---------|---------|
| `users.json` | 42 | All test roles (guest, buyer, seller, admin) + security/performance users |
| `profiles.json` | 41 | User profiles with Indian names, phones, bios, cities |
| `categories.json` | 6 | The 6 app categories (Vehicles, Housing, Jobs, Services, Items for Sale, Community) |
| `listings.json` | 71 | Listings across all statuses, categories, price ranges, and security payloads |
| `listing_images.json` | 232 | Images with correct category paths, primary flags, and gallery variants |
| `favorites.json` | 9 | Favorites for smoke, regression, UAT, and security users |
| `conversations.json` | 31 | 6 functional conversations + 25 performance conversations |
| `conversation_participants.json` | 62 | All buyer-seller pairs |
| `messages.json` | 74 | Messages including edited, deleted, long, XSS-payload, and attachment messages |
| `message_reads.json` | 51 | Read receipts tracking which messages each participant has seen |
| `message_reactions.json` | 5 | Emoji reactions on messages |
| `offers.json` | 4 | Price offers with pending and accepted statuses |
| `notifications.json` | 6 | Message alerts, listing approvals, offer acceptances |
| `reports.json` | 2 | Duplicate and inappropriate content reports |
| `user_presence.json` | 14 | Online/offline status for real-time presence testing |

## Test Case → Dataset Mapping

### Smoke Tests (15 tests)

| Test | Data Used |
|------|-----------|
| SMK_001 Register | Users: guest → register flow creates new user |
| SMK_002 Login | `priya.sharma@valclassifieds.test` / `Priya@2024!` |
| SMK_003 Homepage | Categories, active listings for hero/categories |
| SMK_004 Browse Listings | All 71 listings (active ones shown) |
| SMK_005 Listing Detail | Listing[0] (Maruti Swift) — has 3 images, full details |
| SMK_006 Category Nav | Category slugs: `vehicles`, `housing`, etc. |
| SMK_007 Keyword Search | Search "Swift" → finds listing[0] |
| SMK_008 Favorite Toggle | `priya.sharma` favorites listing[0] and listing[4] |
| SMK_009 Dashboard | `rajesh.kumar` has 20+ listings on dashboard |
| SMK_010 Send Message | Conversation[0] (Priya ↔ Rajesh about headphones) |
| SMK_011 Admin Access | `arun.pillai@valclassifieds.test` / `Admin@2024Secure!` |
| SMK_012 Logout | Session cleared, cannot access `/dashboard` |
| SMK_013 Mobile Menu | Navbar at 375px viewport |
| SMK_014 Create Listing | Use /create form; data mirrors listing[60] (Samsung TV) |
| SMK_015 Responsive | Viewports: 375px, 768px, 1440px |

### Regression Tests (37 tests)

| Test | Data Used |
|------|-----------|
| REG_AUTH_001-005 | `priya.sharma`, `reset.user`, session persistence |
| REG_LST_001-005 | `rajesh.kumar` create/edit/delete; `priya.sharma` cannot edit `manoj.tiwari`'s listings |
| REG_SRC_001-007 | Listings with varied prices (350–1,85,000), cities (10 cities), categories |
| REG_MSG_001-006 | Conversations[0-4], messages with attachments, offline queue data |
| REG_ADM_001-004 | Pending listings[15,16] for approve/reject; non-admin `priya.sharma` blocked |
| REG_FAV_001-003 | `arjun.mehta` favorites [6,7,8]; guest sees no heart icon |
| REG_DSH_001-003 | `deepika.joshi` has 2 active + 1 pending; `no.listings` has zero |
| REG_NAV_001-004 | Desktop nav links, mobile menu, profile dropdown, guest links |
| REG_RSP_001-002 | Listings grid at 320–1920px; chat page at <768px |

### Security Tests (20 tests)

| Test | Data Used |
|------|-----------|
| SEC_001 SQL Injection | User: `sqli.user` with email `sqli.user@valclassifieds.test` — passwords and names carry SQLi payloads |
| SEC_002 XSS Registration | User: `xss.user` with name `<script>alert('XSS')</script>Priya` |
| SEC_003 Admin Access | `priya.sharma` (buyer) accessing `/admin` → blocked |
| SEC_004 Protected Routes | Guest accessing `/dashboard` → redirected to `/login` |
| SEC_005 Unauthorized Edit | `priya.sharma` navigating to `/edit/{manoj.tiwari.listing[4].id}` |
| SEC_006 RLS Listings | Listing[33] `Secret Admin Documents` — should be invisible to other users |
| SEC_007 Malicious File | Upload `.exe` renamed as `.jpg` via chat attachment |
| SEC_008 Large File | Upload 15MB image (exceeds 10MB limit) |
| SEC_009 Rate Limiting | 10+ rapid failed logins to `priya.sharma` account |
| SEC_010 XSS Search | Search: `<script>alert('XSS')</script>` — should be encoded |
| SEC_011 SQLi Search | Search: `' OR 1=1--` — treated as literal text |
| SEC_012 Session Expiry | Wait 1h+ then access `/dashboard` → redirected to login |
| SEC_013 Password Strength | Register with 3-char password → validation error |
| SEC_014 URL Manipulation | Change listing ID in URL to `rajesh.kumar`'s listing as different user |
| SEC_015 Email Enumeration | Login with unregistered email → same error as wrong password |
| SEC_016 Special Characters | User `special.chars@valclassifieds.test` — name has `!@#$%^&*()` |
| SEC_017 Public Bucket | Direct access to `/images/vehicles/` should be restricted |
| SEC_018 Message Access | `arjun.mehta` trying to read conversation[0] (Priya-Rajesh) |
| SEC_019 Unauthorized Favorite | Guest POST to `/api/favorites` |
| SEC_020 Token Validation | Expired JWT + API call → 401 |

### Performance Tests (18 tests)

| Test | Data Used |
|------|-----------|
| PERF_001 Homepage Load | 6 categories, 71 listings for counts |
| PERF_002 Listings with 50 results | 35 performance listings + 25 smoke/regression active = 60 active |
| PERF_003 Detail with 10 images | Listing[49-53] (gallery performance listings) each have 10 images |
| PERF_004 Keyword Search | Search "performance" → finds 35 perf listings |
| PERF_005 Combined Filters | city=Bangalore + category=housing + min=5000 + max=100000 |
| PERF_006 Pagination | Navigate page 2 of 60 active listings (12 per page = 5 pages) |
| PERF_007 Message Send | Conversation[0] — measure appearance in UI |
| PERF_008 Conversation List | 25 conversations for `perf.seller2@valclassifieds.test` |
| PERF_009 Unread Count | 10 conversations with unread=true for `perf.seller2` |
| PERF_010 First Image Load | Listing[49] image[0] — gallery performance |
| PERF_011 Thumbnail Strip | Listing[49] — 10 thumbnails |
| PERF_012 Pending Listings | 3 pending listings for admin moderation |
| PERF_013 Users Table | 42 users in users table |
| PERF_014 Filtered Query | city=Chennai + category=vehicles |
| PERF_015 Cities Distinct | 10 distinct cities across listings |
| PERF_016 Concurrent Browsing | `perf.buyer1` through `perf.buyer24` — 24 concurrent buyers |
| PERF_017 Bundle Size | Frontend bundle measurement |
| PERF_018 Realtime Delivery | Message in conversation[0] → subscription delivery |

### UAT Tests (15 tests)

| Test | Data Used |
|------|-----------|
| UAT_001 Guest Browse | No login — view all active listings |
| UAT_002 Buyer Search | `uat.buyer@valclassifieds.test` — search by keyword/category/price/city |
| UAT_003 View Details | Listing[60] (Samsung TV) — full detail with images |
| UAT_004 Contact Seller | Conversation[4] — Divya Nair ↔ Vivek Deshmukh about TV |
| UAT_005 Save Favorites | `uat.buyer` favorites listing[60] and listing[63] |
| UAT_006 Create Listing | `uat.seller@valclassifieds.test` form submission |
| UAT_007 Manage Listings | `uat.seller` dashboard — 6 listings |
| UAT_008 Respond to Chat | Conversation[4] — seller Vivek responds |
| UAT_009 Listing Status | `uat.seller` sees pending/active/sold/inactive badges |
| UAT_010 Moderate Pending | `uat.admin` approves listing[61] |
| UAT_011 Manage All | `uat.admin` rejects listing[62] |
| UAT_012 View Users | `uat.admin` → admin users table (42 users) |
| UAT_013 Password Reset | `reset.user@valclassifieds.test` |
| UAT_014 Profile Update | `uat.buyer` updates name and phone |
| UAT_015 Mobile Responsive | All key workflows at 375px viewport |

## Key Test Users

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| `priya.sharma@valclassifieds.test` | `Priya@2024!` | Buyer | Smoke, regression, favorites |
| `rajesh.kumar@valclassifieds.test` | `Rajesh#99Kumar` | Seller | 20+ listings, messaging conversations |
| `arun.pillai@valclassifieds.test` | `Admin@2024Secure!` | Admin | Full admin access |
| `arjun.mehta@valclassifieds.test` | `Mehta@2024!` | Buyer | Regression, favorites |
| `deepika.joshi@valclassifieds.test` | `Joshi$2024!` | Seller | Edit/delete/dashboard tests |
| `no.listings@valclassifieds.test` | `Empty@2024!` | Seller | Zero listings (empty state) |
| `xss.user@valclassifieds.test` | `Xss@2024!` | Buyer | XSS payloads in name |
| `sqli.user@valclassifieds.test` | `Sqli@2024!` | Buyer | SQL injection payloads |
| `special.chars@valclassifieds.test` | `Spec!@l#2024` | Buyer | Special characters test |
| `reset.user@valclassifieds.test` | `Reset@2024!` | Buyer | Password reset flow |
| `uat.buyer@valclassifieds.test` | `UatBuyer@2024!` | Buyer | UAT buyer scenarios |
| `uat.seller@valclassifieds.test` | `UatSeller@2024!` | Seller | UAT seller scenarios |
| `uat.admin@valclassifieds.test` | `UatAdmin@2024!` | Admin | UAT admin scenarios |
| `perf.buyer1-24@valclassifieds.test` | `Perf@2024!` | Buyer | 24 concurrent buyers |
| `perf.seller1@valclassifieds.test` | `Perf@2024!` | Seller | 35+ listings (performance) |
| `perf.seller2@valclassifieds.test` | `Perf@2024!` | Seller | 25 conversations (performance) |

## Listing Status Meanings

| Status | Description | Count |
|--------|-------------|-------|
| `active` | Visible to all users, shown in browse/search | ~55 |
| `pending` | Awaiting admin approval | 4 |
| `inactive` | Rejected or deactivated | 2 |
| `sold` | Marked as sold | 1 |

## Categories

| ID | Slug | Display Name |
|----|------|-------------|
| `cat-vehicles` | `vehicles` | Vehicles |
| `cat-housing` | `housing` | Housing |
| `cat-jobs` | `jobs` | Jobs |
| `cat-services` | `services` | Services |
| `cat-items` | `items-for-sale` | Items for Sale |
| `cat-community` | `community` | Community |

## Assumptions

1. **Passwords are pre-hashed** — The `password` field in `users.json` stores plaintext for test convenience. In production, import scripts must hash using Supabase's `crypt()` or bcrypt.

2. **Image URLs are placeholders** — `listing_images.json` references paths under `/images/{category}/`. Actual test images should be placed in `mock-data/images/` organized by category. The file structure is pre-created with `.gitkeep` files.

3. **UUIDs are stable** — Each run of the generator produces different UUIDs, but the relationships are internally consistent. If you regenerate, all cross-references remain valid.

4. **Timestamps are relative** — All `created_at` values are relative to generation time. For deterministic tests, fix timestamps to a specific date.

5. **Guest user has empty password** — The guest user record exists for reference but cannot authenticate. Guest tests use no login.

6. **Security payloads are intentionally present** — Users `xss.user`, `sqli.user`, and `special.chars.user` have XSS/ SQLi / special character payloads in their names. Listings[29-32] carry script and SQLi payloads in titles. The application must safely encode these.

## Database Reset

```sql
-- Truncate all tables in correct order (respecting FK constraints)
TRUNCATE TABLE message_reactions CASCADE;
TRUNCATE TABLE message_reads CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE conversation_participants CASCADE;
TRUNCATE TABLE conversations CASCADE;
TRUNCATE TABLE offers CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE user_presence CASCADE;
TRUNCATE TABLE favorites CASCADE;
TRUNCATE TABLE listing_images CASCADE;
TRUNCATE TABLE listings CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE users CASCADE;

-- Or use the import script which does DELETE + INSERT (idempotent)
```

## Import Script Template

```sql
-- import.sql — Idempotent import of all mock data
-- Run: psql $DATABASE_URL < mock-data/import.sql

-- Users
DELETE FROM users WHERE email LIKE '%@valclassifieds.test';
INSERT INTO users (id, email, password, name, role, email_verified, created_at)
SELECT * FROM json_populate_recordset(NULL::users,
  (SELECT pg_read_file('mock-data/users.json')));

-- Repeat for each table in dependency order:
-- 1. users → 2. profiles → 3. categories → 4. listings → 5. listing_images
-- 6. favorites → 7. conversations → 8. conversation_participants → 9. messages
-- 10. message_reads → 11. message_reactions → 12. offers → 13. notifications
-- 14. reports → 15. user_presence
```

## File Structure

```
mock-data/
├── README.md
├── users.json
├── profiles.json
├── categories.json
├── listings.json
├── listing_images.json
├── favorites.json
├── conversations.json
├── conversation_participants.json
├── messages.json
├── message_reads.json
├── message_reactions.json
├── offers.json
├── notifications.json
├── reports.json
├── user_presence.json
└── images/
    ├── vehicles/
    ├── housing/
    ├── jobs/
    ├── services/
    ├── items-for-sale/
    └── community/
```
