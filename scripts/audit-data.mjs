import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v) { return typeof v === 'string' && UUID_RE.test(v); }
function symbolToUuid(symbol) {
  if (isUuid(symbol)) return symbol.toLowerCase();
  const h = createHash('md5').update(String(symbol)).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}
function uuid(v) { return v ? (isUuid(v) ? v.toLowerCase() : symbolToUuid(v)) : null; }

function loadJson(name) {
  const p = resolve(ROOT, 'mock-data', name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function log(...args) { console.log(...args); }

// ===== FILE MAPPINGS AND FIELD ALIASES =====
// Maps: DB table -> mock data file (with field aliases)
// Each alias maps: mock_data_field -> resolved_value_or_FK_target
const TABLES = {
  'auth.users': {
    file: 'users.json',
    pk: 'id',       // uuid(user.id)
    idFields: ['id'],
    required: ['id', 'email'],
    fkChecks: [],
  },
  'profiles': {
    file: 'profiles.json',
    pk: 'user_id',   // DB: profiles.id = mockData.user_id (references auth.users.id)
    idFields: ['user_id'],
    required: ['user_id', 'full_name'],
    fkChecks: [
      ['user_id', 'auth.users', 'id', false],
    ],
  },
  'categories': {
    file: 'categories.json',
    pk: 'id',
    idFields: ['id'],
    required: ['id', 'name', 'slug'],
    fkChecks: [],
  },
  'listings': {
    file: 'listings.json',
    pk: 'id',
    idFields: ['id'],
    required: ['id', 'title', 'price'],
    fkChecks: [
      ['category_id', 'categories', 'id', true],
      ['seller_id', 'profiles', 'id', false],
    ],
  },
  'listing_images': {
    file: 'listing_images.json',
    pk: 'id',
    idFields: ['id'],
    required: ['listing_id', 'url'],
    fkChecks: [
      ['listing_id', 'listings', 'id', false],
    ],
  },
  'favorites': {
    file: 'favorites.json',
    pk: 'id',
    idFields: ['id'],
    required: ['user_id', 'listing_id'],
    fkChecks: [
      ['user_id', 'profiles', 'id', false],
      ['listing_id', 'listings', 'id', false],
    ],
  },
  'conversations': {
    file: 'conversations.json',
    pk: 'id',
    idFields: ['id', 'listing_id', 'buyer_id', 'seller_id'],
    required: ['id', 'listing_id'],
    fkChecks: [
      ['listing_id', 'listings', 'id', false],
      ['buyer_id', 'profiles', 'id', true],
      ['seller_id', 'profiles', 'id', true],
    ],
  },
  'conversation_participants': {
    file: 'conversation_participants.json',
    pk: 'id',
    idFields: ['id', 'conversation_id', 'user_id'],
    required: ['conversation_id', 'user_id'],
    fkChecks: [
      ['conversation_id', 'conversations', 'id', false],
      ['user_id', 'profiles', 'id', false],   // maps to profile_id
    ],
  },
  'messages': {
    file: 'messages.json',
    pk: 'id',
    idFields: ['id', 'conversation_id', 'sender_id', 'reply_to'],
    required: ['conversation_id', 'sender_id'],
    // either 'message' or 'content' must be present
    fkChecks: [
      ['conversation_id', 'conversations', 'id', false],
      ['sender_id', 'profiles', 'id', false],
      ['reply_to', 'messages', 'id', true],
    ],
  },
  'message_reads': {
    file: 'message_reads.json',
    pk: 'id',
    idFields: ['id', 'message_id', 'user_id'],
    required: ['message_id', 'user_id'],
    fkChecks: [
      ['message_id', 'messages', 'id', false],
      ['user_id', 'profiles', 'id', false],   // maps to profile_id
    ],
  },
  'message_reactions': {
    file: 'message_reactions.json',
    pk: 'id',
    idFields: ['id', 'message_id', 'user_id'],
    required: ['message_id', 'user_id', 'emoji'],
    fkChecks: [
      ['message_id', 'messages', 'id', false],
      ['user_id', 'profiles', 'id', false],   // maps to profile_id
    ],
  },
  'offers': {
    file: 'offers.json',
    pk: 'id',
    idFields: ['id', 'conversation_id', 'listing_id', 'sender_id', 'counter_to_offer_id'],
    required: ['conversation_id', 'amount'],
    fkChecks: [
      ['conversation_id', 'conversations', 'id', false],
      ['listing_id', 'listings', 'id', true],
      ['sender_id', 'profiles', 'id', true],
      ['counter_to_offer_id', 'offers', 'id', true],
    ],
  },
  'notification_events': {
    file: 'notifications.json',
    pk: 'id',
    idFields: ['id', 'user_id'],
    required: ['user_id', 'type', 'title'],
    fkChecks: [
      ['user_id', 'profiles', 'id', false],
    ],
  },
  'user_presence': {
    file: 'user_presence.json',
    pk: 'user_id',
    idFields: ['user_id'],
    required: ['user_id', 'status'],
    fkChecks: [
      ['user_id', 'profiles', 'id', false],
    ],
  },
};

// ===== BUILD ID MAPS =====
function buildIdMap(tableDef) {
  const map = new Map();
  const data = tableDef._data || [];
  for (const row of data) {
    for (const field of tableDef.idFields) {
      const val = row[field];
      if (val === undefined || val === null) continue;
      const resolved = uuid(val);
      if (resolved) map.set(resolved, { row, field, val });
    }
  }
  return map;
}

// ===== MAIN AUDIT =====
const report = {
  files: {},
  fk_issues: [],
  missing_required: [],
  warnings: [],
};

let totalRows = 0;
let totalFKChecks = 0;
let totalFKIssues = 0;

// Load all data
log('=== Loading mock data files ===');
for (const [table, def] of Object.entries(TABLES)) {
  const data = loadJson(def.file);
  if (data === null) {
    log(`  MISSING: ${def.file}`);
    report.files[def.file] = { file: def.file, rows: 0, issues: [], error: 'FILE NOT FOUND' };
    def._data = [];
    continue;
  }
  def._data = data;
  report.files[def.file] = { file: def.file, rows: data.length, issues: [] };
  totalRows += data.length;
  log(`  ${def.file}: ${data.length} rows`);
}

// Build ID maps for reference tables
log('\n=== Building ID maps ===');
const idMaps = {};
for (const [table, def] of Object.entries(TABLES)) {
  idMaps[table] = buildIdMap(def);
  log(`  ${table}: ${idMaps[table].size} unique resolved IDs`);
}

// Check required fields
log('\n=== Checking required fields ===');
for (const [table, def] of Object.entries(TABLES)) {
  const data = def._data || [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (const field of def.required) {
      const val = row[field];
      if (val === undefined || val === null || val === '') {
        // Special case: content or message are interchangeable
        if (field === 'content' && (row.message !== undefined && row.message !== null && row.message !== '')) continue;
        if (field === 'message' && (row.content !== undefined && row.content !== null && row.content !== '')) continue;
        // Special case: guest user has no password (valid)
        if (table === 'auth.users' && field === 'password' && row.role === 'guest') {
          report.warnings.push(`${def.file}[${i}].${field} is empty (guest user — OK)`);
          continue;
        }
        // Special case: profile fields that have content
        if (field === 'full_name') {
          if (row.name || row.display_name) continue;
        }

        report.missing_required.push(`${def.file}[${i}].${field} is missing`);
        report.files[def.file].issues.push(`row[${i}].${field} is missing`);
      }
    }
  }
}

log(`  Missing required fields: ${report.missing_required.length}`);

// Check FK relationships
log('\n=== Checking FK relationships ===');
for (const [table, def] of Object.entries(TABLES)) {
  const data = def._data || [];
  for (const [fkField, refTable, refColumn, optional] of def.fkChecks) {
    const refMap = idMaps[refTable];
    if (!refMap) {
      log(`  SKIP: ${table}.${fkField} -> ${refTable}.${refColumn} (ref table not loaded)`);
      continue;
    }

    let issues = 0;
    for (let i = 0; i < data.length; i++) {
      const rawVal = data[i][fkField];
      if (rawVal === undefined || rawVal === null) {
        if (!optional) {
          report.fk_issues.push(`${def.file}[${i}].${fkField} is NULL but NOT optional (-> ${refTable}.${refColumn})`);
          issues++;
        }
        continue;
      }
      const resolved = uuid(rawVal);
      if (!resolved) {
        report.fk_issues.push(`${def.file}[${i}].${fkField}="${rawVal}" cannot be resolved to UUID`);
        issues++;
        continue;
      }

      if (!refMap.has(resolved)) {
        report.fk_issues.push(`${def.file}[${i}].${fkField}="${rawVal}" (→ ${resolved}) not found in ${refTable}`);
        issues++;
      }
    }

    const key = `${table}.${fkField} -> ${refTable}.${refColumn}`;
    totalFKChecks++;
    totalFKIssues += issues;
    if (issues > 0) {
      log(`  FAIL: ${key} — ${issues} orphan(s)`);
    } else {
      log(`  OK:   ${key}`);
    }
  }
}

// ===== SUMMARY =====
log('\n========== AUDIT SUMMARY ==========');
log(`Files inspected:     ${Object.keys(report.files).length}`);
log(`Total rows:          ${totalRows}`);
log(`FK relationships:    ${totalFKChecks}`);
log(`FK issues:           ${totalFKIssues}`);
log(`Missing required:    ${report.missing_required.length}`);
log(`Warnings:           ${report.warnings.length}`);

if (report.missing_required.length > 0) {
  log('\n--- Missing Required Fields ---');
  for (const issue of report.missing_required.slice(0, 20)) {
    log(`  ${issue}`);
  }
  if (report.missing_required.length > 20) log(`  ... and ${report.missing_required.length - 20} more`);
}
if (report.warnings.length > 0) {
  log('\n--- Warnings ---');
  for (const w of report.warnings) log(`  ${w}`);
}
if (report.fk_issues.length > 0) {
  log('\n--- FK Issues ---');
  for (const issue of report.fk_issues.slice(0, 20)) {
    log(`  ${issue}`);
  }
  if (report.fk_issues.length > 20) log(`  ... and ${report.fk_issues.length - 20} more`);
}

// Generate markdown report
const md = [
  `# Data Integrity Audit`,
  ``,
  `**Date:** ${new Date().toISOString()}`,
  `**Files inspected:** ${Object.keys(report.files).length}`,
  `**Total rows:** ${totalRows}`,
  `**FK relationships checked:** ${totalFKChecks}`,
  `**FK issues:** ${totalFKIssues}`,
  `**Missing required fields:** ${report.missing_required.length}`,
  `**Warnings:** ${report.warnings.length}`,
  ``,
  `## File Summary`,
  ``,
  `| File | Rows | Issues |`,
  `|------|------|--------|`,
];

for (const [fn, info] of Object.entries(report.files)) {
  md.push(`| ${info.file} | ${info.rows} | ${info.issues.length} |`);
}

if (report.warnings.length > 0) {
  md.push(``);
  md.push(`## Warnings`);
  for (const w of report.warnings) md.push(`- ${w}`);
}

if (report.missing_required.length > 0) {
  md.push(``);
  md.push(`## Missing Required Fields`);
  for (const issue of report.missing_required.slice(0, 50)) md.push(`- ${issue}`);
  if (report.missing_required.length > 50) md.push(`- ... and ${report.missing_required.length - 50} more`);
}

if (report.fk_issues.length > 0) {
  md.push(``);
  md.push(`## FK Issues`);
  for (const issue of report.fk_issues.slice(0, 50)) md.push(`- ${issue}`);
  if (report.fk_issues.length > 50) md.push(`- ... and ${report.fk_issues.length - 50} more`);
}

md.push(``);
md.push(`## Verdict`);
if (totalFKIssues === 0 && report.missing_required.length === 0) {
  md.push(`**✅ PASS — All data is clean and referentially intact.**`);
} else {
  md.push(`**❌ ${totalFKIssues} FK issues, ${report.missing_required.length} missing fields.**`);
}

md.push(``);
md.push(`_Generated by scripts/audit-data.mjs_`);

const auditPath = resolve(ROOT, 'Audit_Report.md');
writeFileSync(auditPath, md.join('\n'));
log(`\nAudit report written: Audit_Report.md`);
