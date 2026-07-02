# Database Seeding

Production-grade seeding system for the ValClassifieds marketplace.

## Prerequisites

1. **Node.js 18+** with ES module support (`"type": "module"` in package.json)
2. **Supabase project** with migrations applied
3. **Supabase Service Role Key** in `.env`:
   ```
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```
4. **Supabase URL** in `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   ```

## Usage

```bash
# Full seed: auth users + public data
npm run db:seed

# Or step by step:
npm run db:seed:auth   # Create auth users via Admin API
npm run db:seed:data   # Seed all public tables
```

## What It Does

### `seed-auth.mjs`
- Reads `mock-data/users.json`
- Creates auth users via Supabase Admin API (`/auth/v1/admin/users`)
- Preserves existing UUIDs from `users.json`
- Skips users that already exist (idempotent)
- Skips users with empty passwords (e.g., guest users)
- Generates execution summary

### `seed-data.mjs`
- Introspects the current database schema via `information_schema`
- Adapts to the actual schema (no hardcoded column assumptions)
- Seeds 13 public tables in dependency order:
  1. profiles
  2. categories
  3. listings
  4. listing_images
  5. favorites
  6. conversations
  7. conversation_participants
  8. messages
  9. message_reads
  10. message_reactions
  11. offers
  12. notification_events
  13. user_presence

## Schema Adaptation

The seeder validates every column before inserting:
- Column existence ✓
- Data types ✓
- Generated columns (e.g., `search_vector`) are skipped ✓
- Foreign key constraints ✓
- NOT NULL constraints ✓
- Default values ✓

## UUID Handling

- **Real UUIDs** in mock data (e.g., `a480e7a6-...`) are preserved as-is
- **Symbolic IDs** (e.g., `cat-vehicles`, `listing-001`) get deterministic MD5-based UUIDs
- Same UUID is reused everywhere, maintaining FK consistency
- Already-valid UUIDs are lowercased for consistency

## Mock Data

All mock data lives in `mock-data/*.json`:
- `users.json` — Auth users (id, email, password, name, role)
- `profiles.json` — User profiles
- `categories.json` — Listing categories
- `listings.json` — Sample listings
- `listing_images.json` — Listing images
- `favorites.json` — User favorites
- `conversations.json` — Chat conversations
- `conversation_participants.json` — Chat participants
- `messages.json` — Chat messages
- `message_reads.json` — Read receipts
- `message_reactions.json` — Message reactions
- `offers.json` — Price offers
- `notifications.json` — Notification events
- `user_presence.json` — Online/offline status
- `reports.json` — User reports (table may not exist)
