import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ===== ENV =====

function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, 'utf-8').split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const env = loadEnv();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is required');
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY is required');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ===== UTILITIES =====

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v) { return typeof v === 'string' && UUID_RE.test(v); }

function symbolToUuid(symbol) {
  if (isUuid(symbol)) return symbol.toLowerCase();
  const h = createHash('md5').update(String(symbol)).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

function uuid(v) { return v ? (isUuid(v) ? v.toLowerCase() : symbolToUuid(v)) : null; }

// ===== PLACEHOLDER IMAGE =====

async function ensurePlaceholderImage() {
  const path = 'seed-placeholder.svg';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="#f1f5f9" width="800" height="600"/><text fill="#94a3b8" font-family="system-ui,sans-serif" font-size="24" text-anchor="middle" x="400" y="300">Listing Image</text></svg>';
  const { error } = await supabase.storage.from('listing-images').upload(path, svg, { contentType: 'image/svg+xml;charset=utf-8', upsert: true });
  if (error && !error.message.includes('already exists') && !error.message.includes('duplicate')) {
    console.warn(`Placeholder upload: ${error.message}`);
  }
  const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
  return data.publicUrl;
}

// ===== AUTO-CREATE MISSING PROFILES FOR REAL AUTH USERS =====

async function ensureAuthProfiles() {
  const { data: authUsers, error } = await supabase.auth.admin.listUsers();
  if (error) { console.warn(`Cannot list auth users: ${error.message}`); return 0; }
  const { data: existingProfiles } = await supabase.from('profiles').select('id');
  const existingIds = new Set((existingProfiles || []).map(p => p.id));
  let created = 0;
  for (const u of authUsers.users) {
    if (!existingIds.has(u.id)) {
      const { error: insErr } = await supabase.from('profiles').insert({
        id: u.id,
        email: u.email || '',
        full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
      });
      if (insErr) console.warn(`Cannot create profile for ${u.email}: ${insErr.message.slice(0, 80)}`);
      else created++;
    }
  }
  return created;
}

function loadJson(name) {
  const p = resolve(ROOT, 'mock-data', name);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : [];
}

// ===== KNOWN SCHEMA (from migrations 00001-00012) =====

const SCHEMA = {
  profiles: {
    columns: [
      'id', 'email', 'full_name', 'avatar_url', 'phone', 'role',
      'location', 'about', 'created_at', 'updated_at',
    ],
    skip_insert: [],
  },
  categories: {
    columns: ['id', 'name', 'slug', 'icon', 'description', 'display_order', 'created_at'],
    skip_insert: [],
  },
  listings: {
    columns: [
      'id', 'title', 'description', 'price', 'category_id', 'user_id',
      'location', 'latitude', 'longitude', 'address', 'city', 'state',
      'condition', 'status', 'is_featured', 'views_count',
      'created_at', 'updated_at',
    ],
    skip_insert: ['search_vector'],
  },
  listing_images: {
    columns: ['id', 'listing_id', 'url', 'sort_order'],
    skip_insert: [],
  },
  favorites: {
    columns: ['id', 'user_id', 'listing_id', 'created_at'],
    skip_insert: [],
  },
  conversations: {
    columns: [
      'id', 'listing_id', 'buyer_id', 'seller_id',
      'last_message', 'last_message_at', 'title', 'is_group',
      'created_at', 'updated_at',
    ],
    skip_insert: [],
  },
  conversation_participants: {
    columns: [
      'id', 'conversation_id', 'profile_id', 'role',
      'last_read_at', 'joined_at', 'left_at',
    ],
    skip_insert: [],
  },
  messages: {
    columns: [
      'id', 'conversation_id', 'sender_id',
      'message', 'is_read', 'type', 'content',
      'metadata', 'is_deleted', 'call_duration',
      'reply_to', 'created_at', 'updated_at',
    ],
    skip_insert: [],
  },
  message_reads: {
    columns: ['id', 'message_id', 'profile_id', 'read_at'],
    skip_insert: [],
  },
  message_reactions: {
    columns: ['id', 'message_id', 'profile_id', 'emoji', 'created_at'],
    skip_insert: [],
  },
  offers: {
    columns: [
      'id', 'conversation_id', 'listing_id', 'sender_id',
      'amount', 'status', 'message', 'counter_to_offer_id',
      'expires_at', 'accepted_at', 'rejected_at',
      'created_at', 'updated_at',
    ],
    skip_insert: [],
  },
  notification_events: {
    columns: [
      'id', 'user_id', 'type', 'title', 'body',
      'data', 'is_read', 'created_at',
    ],
    skip_insert: [],
  },
  user_presence: {
    columns: ['user_id', 'status', 'last_seen_at', 'updated_at'],
    skip_insert: [],
  },
};

const INSERT_ORDER = [
  'profiles',
  'categories',
  'listings',
  'listing_images',
  'favorites',
  'conversations',
  'conversation_participants',
  'messages',
  'message_reads',
  'message_reactions',
  'offers',
  'notification_events',
  'user_presence',
];

// ===== BATCH INSERT =====

const PK_OVERRIDE = {
  user_presence: 'user_id',
};

async function insertAll(table, rows) {
  if (rows.length === 0) return 0;
  const schema = SCHEMA[table];
  if (!schema) return 0;

  const allowed = new Set(schema.columns);
  const skip = new Set(schema.skip_insert || []);
  const pk = PK_OVERRIDE[table] || 'id';
  let inserted = 0;

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const clean = chunk.map(row => {
      const r = {};
      for (const [k, v] of Object.entries(row)) {
        if (allowed.has(k) && !skip.has(k)) r[k] = v;
      }
      return r;
    });
    try {
      const { error } = await supabase
        .from(table)
        .upsert(clean, { onConflict: pk, ignoreDuplicates: false });
      if (error) {
        // Batch failed, try one-by-one
        throw error;
      }
      inserted += clean.length;
    } catch (err) {
      const msg = err.message || '';
      // One-by-one fallback for FK, NOT NULL, etc.
      for (const row of clean) {
        try {
          const { error: e2 } = await supabase.from(table).upsert(row, { onConflict: pk });
          if (e2) {
            if (!e2.message?.includes('duplicate key')) {
              console.warn(`    Skipping ${JSON.stringify(row[pk]).slice(0, 60)}: ${e2.message.slice(0, 120)}`);
            }
          } else {
            inserted++;
          }
        } catch {}
      }
    }
  }
  return inserted;
}

async function rawSqlSelect(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  const { error } = await supabase.rpc('exec_sql_raw', { query_text: sql }).maybeSingle();
  if (error && error.message?.includes('function "exec_sql_raw"')) {
    // Try via pg if available, or batch
    return null;
  }
  return null;
}

// ===== DATA TRANSFORMERS =====

function transformProfiles(ctx) {
  const profilesSrc = loadJson('profiles.json');
  const rows = [];
  for (const p of profilesSrc) {
    const user = ctx.usersById[p.user_id];
    if (!user) continue;
    rows.push({
      id: p.user_id,
      email: user.email,
      full_name: p.full_name || null,
      avatar_url: p.avatar_url || null,
      phone: p.phone || null,
      role: user.role === 'admin' ? 'admin' : 'user',
      location: p.location || null,
      about: p.bio || null,
      created_at: p.member_since || null,
      updated_at: p.updated_at || null,
    });
  }
  return rows;
}

function transformCategories() {
  const src = loadJson('categories.json');
  return src.map(c => ({
    id: symbolToUuid(c.id),
    name: c.name,
    slug: c.slug,
    icon: c.icon || 'tag',
    description: c.description || null,
    display_order: c.display_order || 0,
    created_at: c.created_at || null,
  }));
}

function transformListings(ctx) {
  const src = loadJson('listings.json');
  return src.map(l => ({
    id: uuid(l.id) || symbolToUuid(l.title + (l.created_at || '')),
    title: l.title,
    description: l.desc || l.description || '',
    price: Number(l.price) || 0,
    category_id: l.category_id ? uuid(l.category_id) : null,
    user_id: uuid(l.seller_id),
    city: l.city || null,
    state: l.state || null,
    status: l.status || 'pending',
    views_count: typeof l.views === 'number' ? l.views : (l.views_count || 0),
    is_featured: l.is_featured || false,
    condition: l.condition || null,
    location: l.location || null,
    address: l.address || null,
    latitude: l.latitude || null,
    longitude: l.longitude || null,
    created_at: l.created_at || null,
  }));
}

function transformListingImages(placeholderUrl) {
  return loadJson('listing_images.json').map(img => ({
    id: uuid(img.id) || symbolToUuid(img.url),
    listing_id: uuid(img.listing_id),
    url: placeholderUrl,
    sort_order: img.display_order || img.sort_order || 0,
  }));
}

function transformFavorites() {
  return loadJson('favorites.json').map(f => ({
    id: uuid(f.id) || symbolToUuid(`fav-${f.user_id}-${f.listing_id}`),
    user_id: uuid(f.user_id),
    listing_id: uuid(f.listing_id),
    created_at: f.created_at || null,
  }));
}

function transformConversations(ctx) {
  const src = loadJson('conversations.json');
  const participants = loadJson('conversation_participants.json');
  const listings = loadJson('listings.json');
  const listingById = {};
  for (const l of listings) listingById[uuid(l.id)] = l;

  return src.map(conv => {
    const convParts = participants.filter(p => p.conversation_id === conv.id);
    const listingId = uuid(conv.listing_id);
    const listing = listingById[listingId];
    const sellerId = listing ? uuid(listing.seller_id) : null;

    let buyerId = null;
    for (const p of convParts) {
      const uid = uuid(p.user_id);
      if (uid !== sellerId) {
        buyerId = uid;
        break;
      }
    }

    return {
      id: uuid(conv.id),
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      title: conv.title || null,
      last_message: null,
      last_message_at: conv.last_message_at || conv.updated_at || null,
      is_group: false,
      created_at: conv.created_at || null,
      updated_at: conv.updated_at || null,
    };
  });
}

function transformParticipants(ctx) {
  const src = loadJson('conversation_participants.json');
  const convs = loadJson('conversations.json');
  const seen = new Set();
  return src.filter(p => {
    const k = `${uuid(p.conversation_id)}:${uuid(p.user_id)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map(p => {
    const convId = uuid(p.conversation_id);
    const profileId = uuid(p.user_id);
    const conv = convs.find(c => uuid(c.id) === convId);
    let role = 'member';
    if (conv) {
      if (profileId === uuid(conv.buyer_id)) role = 'buyer';
      else if (profileId === uuid(conv.seller_id)) role = 'seller';
    }
    return {
      id: symbolToUuid(`cp-${convId}-${profileId}`),
      conversation_id: convId,
      profile_id: profileId,
      role: role,
      joined_at: p.joined_at || null,
    };
  });
}

function transformMessages() {
  return loadJson('messages.json').map(m => ({
    id: uuid(m.id) || symbolToUuid(`msg-${m.conversation_id}-${m.created_at}`),
    conversation_id: uuid(m.conversation_id),
    sender_id: uuid(m.sender_id),
    message: m.content || m.message || null,
    content: m.content || m.message || null,
    type: m.type || 'text',
    is_read: m.is_read || false,
    is_deleted: m.is_deleted || false,
    metadata: m.metadata || null,
    reply_to: m.reply_to ? uuid(m.reply_to) : null,
    call_duration: m.call_duration || null,
    created_at: m.created_at || null,
  }));
}

function transformReads() {
  return loadJson('message_reads.json').map(r => ({
    id: uuid(r.id) || symbolToUuid(`read-${r.message_id}-${r.user_id}`),
    message_id: uuid(r.message_id),
    profile_id: uuid(r.user_id),
    read_at: r.read_at || null,
  }));
}

function transformReactions() {
  return loadJson('message_reactions.json').map(r => ({
    id: uuid(r.id) || symbolToUuid(`react-${r.message_id}-${r.user_id}-${r.emoji}`),
    message_id: uuid(r.message_id),
    profile_id: uuid(r.user_id),
    emoji: r.emoji,
    created_at: r.created_at || null,
  }));
}

function transformOffers() {
  const seen = new Set();
  return loadJson('offers.json').filter(o => {
    const id = uuid(o.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map(o => ({
    id: uuid(o.id),
    conversation_id: uuid(o.conversation_id),
    listing_id: o.listing_id ? uuid(o.listing_id) : null,
    sender_id: uuid(o.buyer_id || o.sender_id),
    amount: Number(o.amount),
    status: o.status || 'pending',
    message: o.message || null,
    created_at: o.created_at || null,
  }));
}

function transformNotifications() {
  const typeMap = {
    'message': 'new_message',
    'offer_accepted': 'offer_accepted',
    'listing_approved': 'new_message',
  };
  return loadJson('notifications.json').map(n => ({
    id: uuid(n.id) || symbolToUuid(`notif-${n.user_id}-${n.created_at}`),
    user_id: uuid(n.user_id),
    type: typeMap[n.type] || n.type || 'new_message',
    title: n.title,
    body: n.body || null,
    data: n.data || null,
    is_read: n.is_read || false,
    created_at: n.created_at || null,
  }));
}

function transformPresence() {
  return loadJson('user_presence.json').map(p => ({
    user_id: uuid(p.user_id),
    status: p.status || 'offline',
    last_seen_at: p.last_seen_at || null,
  }));
}

// ===== MAIN =====

async function main() {
  const startedAt = Date.now();
  const report = {
    started_at: new Date().toISOString(),
    status: 'RUNNING',
    tables_seeded: [],
    rows_inserted: {},
    skipped_tables: [],
    warnings: [],
    errors: [],
  };

  const rawCounts = {};

  try {
    // Build context
    const users = loadJson('users.json');
    const usersById = {};
    for (const u of users) usersById[u.id] = u;
    const ctx = { usersById };

    // Delete data in reverse order
    const deleteOrder = [...INSERT_ORDER].reverse();
    for (const tbl of deleteOrder) {
      try {
        const { error } = await supabase.from(tbl).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error && !error.message?.includes('duplicate key')) {
          // Some tables have composite PKs; try another approach
        }
      } catch {}
    }

    // ===== INSERT TABLES =====

    async function seedTable(name, rows) {
      const actual = await insertAll(name, rows);
      report.tables_seeded.push(name);
      report.rows_inserted[name] = actual;
    }

    await seedTable('profiles', transformProfiles(ctx));
    const autoCreatedProfiles = await ensureAuthProfiles();
    if (autoCreatedProfiles > 0) {
      report.warnings.push(`Auto-created ${autoCreatedProfiles} profiles for auth users missing profiles`);
    }
    await seedTable('categories', transformCategories());
    await seedTable('listings', transformListings(ctx));
    const placeholderUrl = await ensurePlaceholderImage();
    await seedTable('listing_images', transformListingImages(placeholderUrl));
    await seedTable('favorites', transformFavorites());

    // Conversations: the on_conversation_created trigger auto-creates participants.
    // We insert conversations, then delete trigger-created participants, then insert ours.
    const convRows = transformConversations(ctx);
    const convActual = await insertAll('conversations', convRows);
    report.tables_seeded.push('conversations');
    report.rows_inserted['conversations'] = convActual;

    await supabase.from('conversation_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await seedTable('conversation_participants', transformParticipants(ctx));
    await seedTable('messages', transformMessages());
    await seedTable('message_reads', transformReads());
    await seedTable('message_reactions', transformReactions());
    await seedTable('offers', transformOffers());
    await seedTable('notification_events', transformNotifications());
    await seedTable('user_presence', transformPresence());

    // ===== VERIFICATION =====
    for (const tbl of INSERT_ORDER) {
      try {
        const { count, error } = await supabase
          .from(tbl)
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          rawCounts[tbl] = count;
        }
      } catch {}
    }

    report.status = 'SUCCESS';
  } catch (err) {
    report.errors.push(`Fatal: ${err.message}`);
    if (err.stack) report.errors.push(err.stack.split('\n').slice(0, 5).join('\n'));
    report.status = 'FAILED';
  }

  report.ended_at = new Date().toISOString();
  report.elapsed_ms = Date.now() - startedAt;

  // Generate report
  const lines = [
    '# Seed Report',
    '',
    `**Status:** ${report.status}`,
    `**Started:** ${report.started_at}`,
    `**Ended:** ${report.ended_at}`,
    `**Elapsed:** ${report.elapsed_ms}ms`,
    '',
    `## Tables Seeded`,
    '',
    '| Table | Rows Inserted | Actual Count |',
    '|-------|--------------|--------------|',
  ];
  for (const tbl of INSERT_ORDER) {
    if (report.tables_seeded.includes(tbl)) {
      lines.push(`| ${tbl} | ${report.rows_inserted[tbl] || 0} | ${rawCounts[tbl] ?? 'N/A'} |`);
    } else {
      lines.push(`| ${tbl} | — | — |`);
    }
  }
  if (report.warnings.length) {
    lines.push('', '## Warnings');
    for (const w of report.warnings) lines.push(`- ${w}`);
  }
  if (report.errors.length) {
    lines.push('', '## Errors');
    for (const e of report.errors) lines.push(`- ${e}`);
  }
  lines.push('', '---', '_Generated by seed-data.mjs_');
  writeFileSync(resolve(ROOT, 'Seed_Report.md'), lines.join('\n'));

  console.log(JSON.stringify(report, null, 2));

  if (report.errors.length > 0 && report.status !== 'SUCCESS') {
    process.exit(1);
  }
}

main();
