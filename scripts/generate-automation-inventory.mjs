import XLSX from 'xlsx';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const wb = XLSX.utils.book_new();

// ============================================================
// SHEET 1: Tier Summary
// ============================================================
const summary = [
  ['Metric', 'API', 'Mock', 'E2E', 'Total'],
  ['Test files', '10', '4', '17', '31'],
  ['Test cases', '72', '31', '77', '180'],
  ['Passed', '72', '31', '—', '103'],
  ['Failed', '0', '0', '—', '0'],
  ['Pass rate', '100%', '100%', '—', '—'],
  ['Last run', '2026-07-05', '2026-07-05', 'Pending', '—'],
  ['Execution time', '~1.5 min', '~1.5 min', '—', '—'],
  ['Auth required', 'Mixed', 'No (mocked)', 'Mixed', '—'],
  ['Real Supabase', 'Yes', 'No', 'Yes', '—'],
  ['Browser required', 'No', 'No', 'Yes', '—'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Tier Summary');

// ============================================================
// SHEET 2: API Tests
// ============================================================
const api = [
  ['#', 'Module', 'File', 'Tests', 'Passed', 'Failed', 'Status'],
  [1, 'Auth', 'auth/login.api.spec.ts', '11', '11', '0', '✅'],
  [2, 'Auth', 'auth/signup.api.spec.ts', '9', '9', '0', '✅'],
  [3, 'Auth', 'auth/logout.api.spec.ts', '6', '6', '0', '✅'],
  [4, 'Auth', 'auth/password-reset.api.spec.ts', '6', '6', '0', '✅'],
  [5, 'Auth', 'auth/auth-callback.api.spec.ts', '6', '6', '0', '✅'],
  [6, 'Listings', 'listings/browse.api.spec.ts', '14', '14', '0', '✅'],
  [7, 'Listings', 'listings/crud.api.spec.ts', '18', '18', '0', '✅'],
  [8, 'Listings', 'listings/admin.api.spec.ts', '9', '9', '0', '✅'],
  [9, 'Profiles', 'profiles/own.api.spec.ts', '6', '6', '0', '✅'],
  [10, 'Profiles', 'profiles/admin.api.spec.ts', '3', '3', '0', '✅'],
  [11, 'Categories', 'categories/browse.api.spec.ts', '8', '8', '0', '✅'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(api), 'API Tests');

// ============================================================
// SHEET 3: Mock Tests
// ============================================================
const mock = [
  ['#', 'Module', 'File', 'Tests', 'Passed', 'Failed', 'Status'],
  [1, 'Auth', 'auth/login.spec.ts', '7', '7', '0', '✅'],
  [2, 'Admin', 'admin/access.spec.ts', '3', '3', '0', '✅'],
  [3, 'Listings', 'listings/browse.spec.ts', '8', '8', '0', '✅'],
  [4, 'Chat', 'chat/messaging.spec.ts', '12', '12', '0', '✅'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mock), 'Mock Tests');

// ============================================================
// SHEET 4: E2E Tests
// ============================================================
const e2e = [
  ['#', 'Module', 'File', 'Tests', 'Passed', 'Failed', 'Status'],
  [1, 'Home', 'home.e2e.spec.ts', '7', '—', '—', '🟡'],
  [2, 'Auth', 'auth/login.e2e.spec.ts', '8', '—', '—', '🟡'],
  [3, 'Auth', 'auth/register.e2e.spec.ts', '4', '—', '—', '🟡'],
  [4, 'Auth', 'auth/forgot-password.e2e.spec.ts', '3', '—', '—', '🟡'],
  [5, 'Auth', 'auth/update-password.e2e.spec.ts', '1', '—', '—', '🟡'],
  [6, 'Auth', 'auth/auth-callback.e2e.spec.ts', '2', '—', '—', '🟡'],
  [7, 'Listings', 'listings/browse.e2e.spec.ts', '10', '—', '—', '🟡'],
  [8, 'Listings', 'listings/detail.e2e.spec.ts', '5', '—', '—', '🟡'],
  [9, 'Listings', 'listings/create.e2e.spec.ts', '4', '—', '—', '🟡'],
  [10, 'Listings', 'listings/dashboard.e2e.spec.ts', '2', '—', '—', '🟡'],
  [11, 'Category', 'category-page.e2e.spec.ts', '7', '—', '—', '🟡'],
  [12, 'Favorites', 'favorites.e2e.spec.ts', '2', '—', '—', '🟡'],
  [13, 'Profile', 'profile.e2e.spec.ts', '3', '—', '—', '🟡'],
  [14, 'Seller', 'seller-profile.e2e.spec.ts', '2', '—', '—', '🟡'],
  [15, 'Chat', 'chat/messaging.e2e.spec.ts', '8', '—', '—', '🟡'],
  [16, 'Admin', 'admin/panel.e2e.spec.ts', '5', '—', '—', '🟡'],
  [17, 'Admin', 'admin/access.e2e.spec.ts', '2', '—', '—', '🟡'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(e2e), 'E2E Tests');

// ============================================================
// SHEET 5: Feature Coverage
// ============================================================
const coverage = [
  ['Feature', 'Route / Endpoint', 'API Tests', 'Mock Tests', 'E2E Tests', 'Total', 'Status'],
  ['Home page', '/', '5', '0', '7', '12', '✅ API'],
  ['Login', '/login, POST /auth/v1/token', '11', '7', '8', '26', '✅ All'],
  ['Register', '/register, POST /auth/v1/signup', '9', '0', '4', '13', '✅ All'],
  ['Forgot Password', '/forgot-password, POST /auth/v1/recover', '6', '0', '3', '9', '✅ API'],
  ['Update Password', '/update-password, PUT /auth/v1/user', '6', '0', '1', '7', '✅ API'],
  ['Auth Callback', '/auth/callback, GET /auth/v1/verify', '6', '0', '2', '8', '✅ API'],
  ['Logout', 'POST /auth/v1/logout', '6', '0', '0', '6', '✅ API'],
  ['Browse/Search/Filter', '/listings, GET /rest/v1/listings', '14', '8', '10', '32', '✅ All'],
  ['Listing Detail', '/listings/:id', '6', '0', '5', '11', '✅ All'],
  ['Create Listing', '/create, POST /rest/v1/listings', '12', '0', '4', '16', '✅ All'],
  ['Dashboard', '/dashboard', '4', '0', '2', '6', '✅ API'],
  ['Category Pages', '/category/:slug', '6', '0', '7', '13', '✅ All'],
  ['Favorites', '/favorites, GET /rest/v1/listings?in(id,...)', '3', '0', '2', '5', '✅ API'],
  ['Profile', '/profile', '9', '0', '3', '12', '✅ API'],
  ['Seller Profile', '/seller/:id', '3', '0', '2', '5', '✅ All'],
  ['Chat / Messaging', '/chat, conversations + messages', '0', '12', '8', '20', '🟡 Partial'],
  ['Admin Panel', '/admin', '12', '3', '5', '20', '✅ All'],
  ['Admin Access Ctrl', '/admin (non-admin)', '0', '0', '2', '2', '🟡 E2E only'],
  ['Edit listing', '/edit/:id, PATCH /rest/v1/listings', '7', '0', '0', '7', '✅ API'],
  ['Delete listing', 'DELETE /rest/v1/listings', '7', '0', '0', '7', '✅ API'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(coverage), 'Feature Coverage');

// ============================================================
// SHEET 6: Data Dependencies
// ============================================================
const deps = [
  ['Dependency', 'API Tests', 'Mock Tests', 'E2E Tests'],
  ['Test users (auth.users)', 'Required (buyer, seller, admin)', 'Not required (mocked)', 'Required (seed_test_users.sql)'],
  ['Test listings + images', 'Required (tagged data)', 'Not required (mocked)', 'Required (seed_test_listings.sql)'],
  ['Test categories', 'Required (6 in DB)', 'Not required (mocked)', 'Required (part of seed)'],
  ['Test favorites', 'Not required', 'Not required', 'Required (seed_test_favorites.sql)'],
  ['Test chat data', 'Not required', 'Not required', 'Required (seed_test_chat.sql)'],
  ['Dynamic emails', 'Yes (signup tests)', 'Not required', 'No (uses existing users)'],
  ['.env.test', 'Required', 'Required', 'Required'],
  ['Supabase project (seqzkrwgpshqinsjhxwh)', 'Required (real)', 'Not required', 'Required (real)'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(deps), 'Data Dependencies');

// ============================================================
// Write
// ============================================================
const outPath = resolve(ROOT, 'tests/docs/automation-test-inventory.xlsx');
const outDir = dirname(outPath);
mkdirSync(outDir, { recursive: true });
XLSX.writeFile(wb, outPath);
console.log(`Automation test inventory written: ${outPath}`);
