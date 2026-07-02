#!/usr/bin/env node
/**
 * Seed mock data into Supabase.
 * Generates SQL ONLY for public schema tables (NOT auth.users).
 * Maps mock-data JSON to current production schema from migrations.
 * All UUID columns receive valid UUID values with consistent FK mappings.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, URL } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = resolve(__dirname, "..", "mock-data");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
let sqlOut = null;
const sqlArg = args.find((a) => a.startsWith("--sql="));
if (sqlArg) sqlOut = sqlArg.split("=")[1];

// ── UUID mapping infrastructure ─────────────────────────────
// Deterministic UUID generation for symbolic IDs (like "cat-vehicles")
// Uses a simple hash-based approach to generate consistent UUIDs
function deterministicUUID(str) {
  if (!str) return null;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  // Convert to UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = (hash >>> (i * 8)) & 0xff;
  }
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return Array.from(bytes, (b, i) => {
    const hex = b.toString(16).padStart(2, '0');
    if (i === 4 || i === 6 || i === 8 || i === 10) return '-' + hex;
    return hex;
  }).join('');
}

const uuidMap = new Map(); // mockId -> real UUID (for non-deterministic needs)

function getOrCreateUUID(mockId) {
  if (!mockId) return null;
  if (!uuidMap.has(mockId)) {
    // Use deterministic UUID for consistency
    uuidMap.set(mockId, deterministicUUID(mockId));
  }
  return uuidMap.get(mockId);
}

function getUUID(mockId) {
  return uuidMap.get(mockId) || null;
}

// ── Load mock data ──────────────────────────────────────────
function loadJSON(name) {
  const p = resolve(MOCK_DIR, name);
  if (!existsSync(p)) {
    console.error(`WARN: ${name} not found, skipping`);
    return [];
  }
  return JSON.parse(readFileSync(p, "utf-8"));
}

const profiles = loadJSON("profiles.json");
const users = loadJSON("users.json");
const categories = loadJSON("categories.json");
const listings = loadJSON("listings.json");
const listingImages = loadJSON("listing_images.json");
const favorites = loadJSON("favorites.json");
const conversations = loadJSON("conversations.json");
const convParticipants = loadJSON("conversation_participants.json");
const messages = loadJSON("messages.json");
const messageReads = loadJSON("message_reads.json");
const messageReactions = loadJSON("message_reactions.json");
const offers = loadJSON("offers.json");
const notifications = loadJSON("notifications.json");
const userPresence = loadJSON("user_presence.json");

// Skip reports - no such table in schema

// ── Build lookup maps ───────────────────────────────────────
// Generate UUIDs for categories first (symbolic IDs like "cat-vehicles")
const categoryUuidMap = new Map();
categories.forEach((c) => {
  categoryUuidMap.set(c.id, getOrCreateUUID(c.id));
});

// Map profile mock id -> actual profile id (user_id from profiles.json)
const profileIdMap = new Map();
profiles.forEach((p) => {
  profileIdMap.set(p.id, p.user_id);
});

// Map user_id -> email from users.json
const userEmailMap = new Map();
users.forEach((u) => {
  userEmailMap.set(u.id, u.email);
});

// Map listing_id -> user_id (seller)
const listingSellerMap = new Map();
listings.forEach((l) => {
  listingSellerMap.set(l.id, l.seller_id);
});

// Map conversation_id -> [participants] from convParticipants
const conversationParticipants = new Map();
convParticipants.forEach((cp) => {
  if (!conversationParticipants.has(cp.conversation_id)) {
    conversationParticipants.set(cp.conversation_id, []);
  }
  conversationParticipants.get(cp.conversation_id).push(cp.user_id);
});

// Map conversation_id -> first message sender (buyer)
const conversationFirstSender = new Map();
messages.forEach((m) => {
  if (!conversationFirstSender.has(m.conversation_id)) {
    conversationFirstSender.set(m.conversation_id, m.sender_id);
  }
});

// Helper to determine buyer/seller for a conversation
function getConversationBuyerSeller(conv) {
  const participants = conversationParticipants.get(conv.id) || [];
  const sellerId = listingSellerMap.get(conv.listing_id);
  let buyerId = null;
  
  if (sellerId && participants.length >= 2) {
    buyerId = participants.find((p) => p !== sellerId) || null;
  }
  if (!buyerId) {
    buyerId = conversationFirstSender.get(conv.id) || null;
  }
  
  return { buyerId, sellerId };
}

// ── SQL helpers ─────────────────────────────────────────────
function quote(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

function rowValues(obj, keys) {
  return keys.map((k) => quote(obj[k])).join(", ");
}

function buildInsertSQL(table, rows, keys, conflictCol = null) {
  if (!rows.length) return `-- No data for ${table}\n`;
  const cols = keys.join(", ");
  const vals = rows.map((r) => `  (${rowValues(r, keys)})`).join(",\n");
  let sql = `INSERT INTO ${table} (${cols})\nVALUES\n${vals};\n`;
  if (conflictCol) {
    sql = sql.replace(/;\n$/, ` ON CONFLICT (${conflictCol}) DO NOTHING;\n`);
  }
  return sql;
}

// ── Transform mock data to match schema with UUID mapping ────
function transformCategories() {
  return categories.map((c) => ({
    id: categoryUuidMap.get(c.id),
    name: c.name,
    slug: c.slug,
    icon: c.icon,
  }));
}

function transformProfiles() {
  return profiles.map((p) => {
    const email = userEmailMap.get(p.user_id) || `${p.user_id}@valclassifieds.test`;
    const role = p.full_name?.includes("Dr.") || p.full_name?.includes("admin") ? "admin" : "user";
    return {
      id: p.user_id, // user_id IS the profile id (FK to auth.users)
      email,
      full_name: p.full_name || null,
      avatar_url: p.avatar_url || null,
      phone: p.phone || null,
      role,
      location: p.location || null,
      about: p.bio || null,
      created_at: p.member_since || new Date().toISOString(),
    };
  });
}

function transformListings() {
  return listings.map((l) => ({
    id: l.id, // already UUID in mock data
    title: l.title,
    description: l.desc || "",
    price: l.price,
    category_id: categoryUuidMap.get(l.category_id),
    user_id: l.seller_id,
    location: l.city || null,
    latitude: null,
    longitude: null,
    address: null,
    city: l.city || null,
    state: l.state || null,
    condition: l.condition || "used",
    status: l.status || "active",
    is_featured: false,
    views_count: l.views || 0,
    created_at: l.created_at,
    updated_at: l.created_at,
    // search_vector is GENERATED ALWAYS - DO NOT INSERT
  }));
}

function transformListingImages() {
  return listingImages.map((img) => ({
    id: img.id, // already UUID
    listing_id: img.listing_id,
    url: img.url,
    sort_order: img.display_order || 0,
  }));
}

function transformFavorites() {
  return favorites.map((f) => ({
    id: f.id, // already UUID
    user_id: f.user_id,
    listing_id: f.listing_id,
    created_at: f.created_at,
  }));
}

function transformConversations() {
  return conversations.map((c) => {
    const { buyerId, sellerId } = getConversationBuyerSeller(c);
    if (!buyerId || !sellerId) {
      console.warn(`WARN: Conversation ${c.id} missing buyer/seller, skipping`);
      return null;
    }
    return {
      id: c.id, // already UUID
      listing_id: c.listing_id,
      buyer_id: buyerId,
      seller_id: sellerId,
      title: c.title || null,
      is_group: false,
      last_message: null,
      last_message_at: c.last_message_at || c.updated_at || c.created_at,
      created_at: c.created_at,
      updated_at: c.updated_at || c.created_at,
    };
  }).filter(Boolean);
}

function transformConversationParticipants() {
  return convParticipants.map((cp) => ({
    id: getOrCreateUUID(cp.conversation_id + "-" + cp.user_id), // generate deterministic-ish UUID
    conversation_id: cp.conversation_id,
    profile_id: cp.user_id,
    role: "member",
    last_read_at: new Date().toISOString(),
    joined_at: cp.joined_at,
    left_at: null,
  }));
}

function transformMessages() {
  return messages.map((m) => ({
    id: m.id, // already UUID
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    content: m.content || "",
    type: "text",
    message: m.content || "", // legacy column, nullable after 00011
    is_read: false,
    is_deleted: m.is_deleted || false,
    reply_to: null,
    metadata: "{}",
    call_duration: null,
    created_at: m.created_at,
    updated_at: m.updated_at || m.created_at,
  }));
}

function transformMessageReads() {
  return messageReads.map((mr) => ({
    id: mr.id, // already UUID
    message_id: mr.message_id,
    profile_id: mr.user_id,
    read_at: mr.read_at,
    // conversation_id not in schema - skip
  }));
}

function transformMessageReactions() {
  return messageReactions.map((mr) => ({
    id: mr.id, // already UUID
    message_id: mr.message_id,
    profile_id: mr.user_id,
    emoji: mr.emoji,
    created_at: mr.created_at,
  }));
}

function transformOffers() {
  return offers.map((o) => ({
    id: o.id, // already UUID
    conversation_id: o.conversation_id,
    listing_id: o.listing_id,
    sender_id: o.buyer_id, // buyer_id -> sender_id
    amount: o.amount,
    status: o.status,
    message: null,
    counter_to_offer_id: null,
    expires_at: null,
    accepted_at: o.status === "accepted" ? o.updated_at : null,
    rejected_at: o.status === "rejected" ? o.updated_at : null,
    created_at: o.created_at,
    updated_at: o.updated_at,
  }));
}

function transformNotifications() {
  return notifications.map((n) => ({
    id: n.id, // already UUID
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body || null,
    data: "{}",
    is_read: n.is_read || false,
    created_at: n.created_at,
  }));
}

function transformUserPresence() {
  // user_presence has PK on user_id (no separate id column)
  return userPresence.map((up) => ({
    user_id: up.user_id,
    status: up.status || "offline",
    last_seen_at: up.last_seen_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // is_online not in schema - drop
  }));
}

// Skip reports - no such table in schema

// ── Generate SQL ────────────────────────────────────────────
function generateSQL() {
  const lines = [];
  lines.push("-- ===============================================");
  lines.push("-- ValClassifieds v1 — Mock Data Seed (Public Schema Only)");
  lines.push("-- Generated for Supabase production use");
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push("-- ===============================================");
  lines.push("");
  lines.push("-- Applies to production Supabase project.");
  lines.push("-- Auth users must be created separately via Supabase Admin API.");
  lines.push("-- Run this SQL in Supabase SQL Editor after creating auth users.");
  lines.push("-- WARNING: Deletes existing data before insert (public tables only).");
  lines.push("");

  // Order matters due to FK constraints
  const tables = [
    {
      name: "categories",
      data: transformCategories(),
      keys: ["id", "name", "slug", "icon"],
      delete: true,
    },
    {
      name: "profiles",
      data: transformProfiles(),
      keys: ["id", "email", "full_name", "avatar_url", "phone", "role", "location", "about", "created_at"],
      delete: true,
    },
    {
      name: "listings",
      data: transformListings(),
      keys: [
        "id", "title", "description", "price", "category_id", "user_id",
        "location", "latitude", "longitude", "address", "city", "state",
        "condition", "status", "is_featured", "views_count", "created_at", "updated_at"
      ],
      delete: true,
    },
    {
      name: "listing_images",
      data: transformListingImages(),
      keys: ["id", "listing_id", "url", "sort_order"],
      delete: true,
    },
    {
      name: "favorites",
      data: transformFavorites(),
      keys: ["id", "user_id", "listing_id", "created_at"],
      delete: true,
    },
    {
      name: "conversations",
      data: transformConversations(),
      keys: [
        "id", "listing_id", "buyer_id", "seller_id", "title", "is_group",
        "last_message", "last_message_at", "created_at", "updated_at"
      ],
      delete: true,
    },
    {
      name: "conversation_participants",
      data: transformConversationParticipants(),
      keys: ["id", "conversation_id", "profile_id", "role", "last_read_at", "joined_at", "left_at"],
      delete: true,
    },
    {
      name: "messages",
      data: transformMessages(),
      keys: [
        "id", "conversation_id", "sender_id", "content", "type", "message",
        "is_read", "is_deleted", "reply_to", "metadata", "call_duration",
        "created_at", "updated_at"
      ],
      delete: true,
    },
    {
      name: "message_reads",
      data: transformMessageReads(),
      keys: ["id", "message_id", "profile_id", "read_at"],
      delete: true,
    },
    {
      name: "message_reactions",
      data: transformMessageReactions(),
      keys: ["id", "message_id", "profile_id", "emoji", "created_at"],
      delete: true,
    },
    {
      name: "offers",
      data: transformOffers(),
      keys: [
        "id", "conversation_id", "listing_id", "sender_id", "amount", "status",
        "message", "counter_to_offer_id", "expires_at", "accepted_at", "rejected_at",
        "created_at", "updated_at"
      ],
      delete: true,
    },
    {
      name: "notification_events",
      data: transformNotifications(),
      keys: ["id", "user_id", "type", "title", "body", "data", "is_read", "created_at"],
      delete: true,
    },
    {
      name: "user_presence",
      data: transformUserPresence(),
      keys: ["user_id", "status", "last_seen_at", "updated_at"],
      delete: true,
    },
  ];

  for (const t of tables) {
    if (t.delete && t.data.length > 0) {
      lines.push(`DELETE FROM public.${t.name};`);
    }
    lines.push(buildInsertSQL(`public.${t.name}`, t.data, t.keys));
    lines.push("");
  }

  // Storage bucket setup (idempotent)
  lines.push("-- ── storage bucket 'listing-images' ────────────────────────");
  lines.push("INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true)");
  lines.push("  ON CONFLICT (id) DO NOTHING;");
  lines.push("-- Storage RLS policies are created in migrations; no need to recreate here.");
  lines.push("");

  lines.push("-- ===============================================");
  lines.push("-- Seed complete (public schema only)");
  lines.push("-- ===============================================");

  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────
const sql = generateSQL();

if (sqlOut) {
  writeFileSync(sqlOut, sql, "utf-8");
  console.log(`SQL written to ${sqlOut}`);
} else if (APPLY) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required for --apply");
    process.exit(1);
  }

  (async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("Executing seed SQL via exec_sql RPC (public tables only)...");
    const { data, error } = await supabase.rpc("exec_sql", { sql_text: sql });

    if (error) {
      console.error("Seed failed:", error.message);

      // Fallback: execute statement by statement
      console.log("Falling back to statement-by-statement execution...");
      const stmts = sql
        .split(";\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("--"));

      let ok = 0, fail = 0;
      for (const stmt of stmts) {
        const { error: e } = await supabase.rpc("exec_sql", { sql_text: stmt + ";" });
        if (e) {
          console.error(`  FAIL: ${stmt.slice(0, 80)}... → ${e.message}`);
          fail++;
        } else {
          ok++;
        }
      }
      console.log(`\nStatements: ${ok} OK, ${fail} failed`);
      process.exit(fail > 0 ? 1 : 0);
    } else {
      console.log("Seed completed successfully via exec_sql RPC");
    }
  })();
} else {
  console.log(sql);
}