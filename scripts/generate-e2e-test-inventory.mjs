import XLSX from 'xlsx';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const wb = XLSX.utils.book_new();

// ============================================================
// SHEET 1: Test File Inventory
// ============================================================
const files = [
  ['#', 'Module', 'File', 'Tests', 'Auth Req.', 'Fixture', 'Seeds Required', 'Covered Flows'],
  [1, 'Home', 'home.e2e.spec.ts', 7, 'No', 'none (default)', 'listings', 'Hero search, featured, recent, categories, CTAs'],
  [2, 'Auth', 'auth/login.e2e.spec.ts', 8, 'No', 'noAuthContext (loginPage)', 'users', 'Login form, invalid creds, empty fields, valid login, confirm banner, forgot link, register nav'],
  [3, 'Auth', 'auth/register.e2e.spec.ts', 4, 'No', 'noAuthContext', 'users', 'Register form, existing email error, short password, sign-in nav'],
  [4, 'Auth', 'auth/forgot-password.e2e.spec.ts', 3, 'No', 'noAuthContext', 'users', 'Reset form, email submit success, back to login'],
  [5, 'Auth', 'auth/update-password.e2e.spec.ts', 1, 'Yes', 'noAuthContext', 'none', 'Update password form render'],
  [6, 'Auth', 'auth/auth-callback.e2e.spec.ts', 2, 'No', 'noAuthContext', 'none', 'Callback page render, error state'],
  [7, 'Listings', 'listings/browse.e2e.spec.ts', 10, 'No', 'noAuthContext', 'listings, categories', 'Card display, keyword/category/city/price filters, empty state, detail nav, sort, pagination'],
  [8, 'Listings', 'listings/detail.e2e.spec.ts', 5, 'No', 'noAuthContext', 'listings, images', 'Title, price, description, category, gallery, location, contact, favorite'],
  [9, 'Listings', 'listings/create.e2e.spec.ts', 4, 'Yes', 'e2eContext', 'categories', 'Form render, location picker, category/condition dropdowns, image upload'],
  [10, 'Listings', 'listings/dashboard.e2e.spec.ts', 2, 'Yes', 'e2eContext', 'listings', 'Dashboard render, new listing button navigation'],
  [11, 'Categories', 'category-page.e2e.spec.ts', 7, 'No', 'noAuthContext', 'listings', 'Category page load, post ad button, multiple category slugs, sort dropdown'],
  [12, 'Favorites', 'favorites.e2e.spec.ts', 2, 'Yes', 'e2eContext', 'favorites, listings', 'Favorites page, browse listings link'],
  [13, 'Profile', 'profile.e2e.spec.ts', 3, 'Yes', 'e2eContext', 'users', 'Profile render, user email, name/phone fields'],
  [14, 'Seller', 'seller-profile.e2e.spec.ts', 2, 'No', 'noAuthContext', 'listings, profiles', 'Seller profile via listing detail, contact info'],
  [15, 'Chat', 'chat/messaging.e2e.spec.ts', 8, 'Yes', 'e2eContext (chatPage)', 'users, listings, chat', 'Conversation list, send message, back nav, header, attachment, menu'],
  [16, 'Admin', 'admin/panel.e2e.spec.ts', 5, 'Yes (admin)', 'adminContext (adminPage)', 'listings, users', 'Panel access, admin nav link, pending/users/listings tabs'],
  [17, 'Admin', 'admin/access.e2e.spec.ts', 2, 'Yes (non-admin)', 'e2eContext', 'none', 'Non-admin redirect, 403 page'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(files), 'Test File Inventory');

// ============================================================
// SHEET 2: Test Case Detail
// ============================================================
const cases = [
  ['#', 'File', 'Test Name', 'Category', 'Key Selectors / data-testid', 'Assertions'],
  [1, 'home.e2e.spec.ts', 'renders hero section with search', 'Render', 'h1, h2, input[placeholder*=Search]', 'Visible'],
  [2, 'home.e2e.spec.ts', 'displays featured listings', 'Content', '"Featured" text', 'Visible'],
  [3, 'home.e2e.spec.ts', 'displays recently added listings', 'Content', '"Recently Added" / "Recent" text', 'Visible'],
  [4, 'home.e2e.spec.ts', 'displays category cards', 'Content', '"Browse Categories" text', 'Visible'],
  [5, 'home.e2e.spec.ts', 'has browse all listings CTA', 'Navigation', '"Browse All Listings" text', 'Visible'],
  [6, 'home.e2e.spec.ts', 'clicking browse listings navigates to /listings', 'Navigation', '"Browse All Listings" link click', 'URL contains /listings'],
  [7, 'home.e2e.spec.ts', 'search from hero navigates to listings', 'Navigation', 'Search input + Enter', 'URL contains /listings'],
  [8, 'login.e2e.spec.ts', 'renders login form with all fields', 'Render', 'loginPage.emailInput, passwordInput, submitButton', 'Visible'],
  [9, 'login.e2e.spec.ts', 'shows error for invalid credentials', 'Validation', 'loginPage.login(wrong creds) + errorMessage', 'Visible (10s)'],
  [10, 'login.e2e.spec.ts', 'does not submit with empty email', 'Validation', 'password filled, submit click', 'errorMessage NOT visible'],
  [11, 'login.e2e.spec.ts', 'does not submit with empty password', 'Validation', 'email filled, submit click', 'errorMessage NOT visible'],
  [12, 'login.e2e.spec.ts', 'navigates to register page', 'Navigation', 'clickRegisterLink', 'Navigates away'],
  [13, 'login.e2e.spec.ts', 'logs in successfully with valid buyer', 'Auth', 'loginPage.login(buyer.email, buyer.password)', 'expectLoginSuccess'],
  [14, 'login.e2e.spec.ts', 'shows email confirmation success banner', 'UI', 'page.goto(/login?confirmed=true)', 'data-testid="login-confirmed-banner" visible'],
  [15, 'login.e2e.spec.ts', 'has forgot password link', 'Navigation', '"Forgot your password?" link + click', 'URL contains /forgot-password'],
  [16, 'login.e2e.spec.ts', 'navigates to auth callback page', 'Navigation', 'page.goto(/auth/callback)', 'h2 not empty'],
  [17, 'register.e2e.spec.ts', 'renders registration form with all fields', 'Render', 'data-testid="register-*" inputs + submit', 'Visible'],
  [18, 'register.e2e.spec.ts', 'shows error for already registered email', 'Validation', 'buyer.email + submit', 'data-testid="register-error-message" visible'],
  [19, 'register.e2e.spec.ts', 'shows password too short error', 'Validation', 'password=12 + submit', 'error message visible'],
  [20, 'register.e2e.spec.ts', 'navigates to login from sign in link', 'Navigation', '"Sign in" link click', 'URL contains /login'],
  [21, 'forgot-password.e2e.spec.ts', 'renders forgot password form', 'Render', 'h1="Reset Password", input[type=email], "Send Reset Link"', 'Visible'],
  [22, 'forgot-password.e2e.spec.ts', 'shows success after submitting email', 'Validation', 'email fill + "Send Reset Link" click', '"Check Your Email" visible'],
  [23, 'forgot-password.e2e.spec.ts', 'navigates back to login', 'Navigation', '"Sign In" link click', 'URL contains /login'],
  [24, 'update-password.e2e.spec.ts', 'renders update password form', 'Render', 'h1="Set New Password", "New Password", "Confirm New Password"', 'Visible'],
  [25, 'auth-callback.e2e.spec.ts', 'renders auth callback page', 'Render', 'page.goto(/auth/callback) + networkidle', 'No error'],
  [26, 'auth-callback.e2e.spec.ts', 'shows error state for invalid callback', 'Error', 'page.goto(/auth/callback?error=invalid_token)', 'No error'],
  [27, 'browse.e2e.spec.ts', 'displays listing cards', 'Content', 'data-testid="listing-card"', 'Visible, count > 0'],
  [28, 'browse.e2e.spec.ts', 'filters by keyword search', 'Filter', 'data-testid="listings-search-input" + Enter', 'Titles contain keyword'],
  [29, 'browse.e2e.spec.ts', 'filters by category', 'Filter', 'data-testid="listings-category-select"', 'Works (no error)'],
  [30, 'browse.e2e.spec.ts', 'has location filter', 'UI', 'data-testid="listings-city-select"', 'Visible'],
  [31, 'browse.e2e.spec.ts', 'filters by price range', 'Filter', 'price-min + price-max fill + Enter', 'Works (no error)'],
  [32, 'browse.e2e.spec.ts', 'shows empty state for no results', 'Content', 'Search "ZZZZNONEXISTENT"', 'data-testid="listings-empty-state" visible'],
  [33, 'browse.e2e.spec.ts', 'navigates to listing detail on card click', 'Navigation', 'Card click', 'URL contains /listings/uuid'],
  [34, 'browse.e2e.spec.ts', 'search input is accessible', 'Accessibility', 'data-testid="listings-search-input"', 'Has aria-label'],
  [35, 'browse.e2e.spec.ts', 'has sort dropdown', 'UI', 'select or "Sort" text', 'Visible'],
  [36, 'browse.e2e.spec.ts', 'has pagination for many listings', 'UI', 'data-testid="listings-pagination"', 'Visible if listings >= 12'],
  [37, 'detail.e2e.spec.ts', 'renders listing detail with all sections', 'Content', 'listing-detail-{title,price,description,category}', 'Visible'],
  [38, 'detail.e2e.spec.ts', 'displays listing gallery', 'Content', 'listing-detail-gallery', 'Visible'],
  [39, 'detail.e2e.spec.ts', 'displays listing location', 'Content', 'listing-detail-location', 'Visible'],
  [40, 'detail.e2e.spec.ts', 'has contact seller button', 'UI', 'listing-contact-seller', 'Visible'],
  [41, 'detail.e2e.spec.ts', 'has favorite button', 'UI', 'listing-favorite-button', 'Visible'],
  [42, 'create.e2e.spec.ts', 'renders create listing form', 'Render', '"Title", "Price" text', 'Visible'],
  [43, 'create.e2e.spec.ts', 'has location picker with map', 'UI', '"Location" text, placeholder "Search for a city or address..."', 'Visible'],
  [44, 'create.e2e.spec.ts', 'has category and condition dropdowns', 'UI', '"Category", "Condition" text', 'Visible'],
  [45, 'create.e2e.spec.ts', 'has image upload section', 'UI', '"Image" or "Photo" text', 'Visible'],
  [46, 'dashboard.e2e.spec.ts', 'renders dashboard with user listings', 'Render', 'h1/h2', 'Not empty'],
  [47, 'dashboard.e2e.spec.ts', 'has new listing button', 'Navigation', '"New Listing" / "Create Listing" button + click', 'URL contains /create'],
  [48, 'category-page.e2e.spec.ts', 'navigates to category page and shows listings', 'Navigation', '/category/vehicles', 'h1/h2 not empty'],
  [49, 'category-page.e2e.spec.ts', 'shows post ad button on category page', 'UI', '"Post an Ad" / "Post Ad" text', 'Visible'],
  [50, 'category-page.e2e.spec.ts', 'renders property category page', 'Navigation', '/category/property', 'h1/h2 not empty'],
  [51, 'category-page.e2e.spec.ts', 'renders jobs category page', 'Navigation', '/category/jobs', 'h1/h2 not empty'],
  [52, 'category-page.e2e.spec.ts', 'renders services category page', 'Navigation', '/category/services', 'h1/h2 not empty'],
  [53, 'category-page.e2e.spec.ts', 'renders electronics category page', 'Navigation', '/category/electronics', 'h1/h2 not empty'],
  [54, 'category-page.e2e.spec.ts', 'renders community category page', 'Navigation', '/category/community', 'h1/h2 not empty'],
  [55, 'category-page.e2e.spec.ts', 'has sort dropdown on category page', 'UI', '"Sort" text or select', 'Visible'],
  [56, 'favorites.e2e.spec.ts', 'renders favorites page', 'Render', 'h1/h2', 'Not empty'],
  [57, 'favorites.e2e.spec.ts', 'has browse listings link', 'Navigation', '"Browse listings" / "Browse" link + click', 'URL contains /listings'],
  [58, 'profile.e2e.spec.ts', 'renders profile page with user info', 'Render', 'h1/h2, "Email" text', 'Visible'],
  [59, 'profile.e2e.spec.ts', 'displays user email', 'Content', 'User name text ("rajesh")', 'Visible'],
  [60, 'profile.e2e.spec.ts', 'has name and phone fields', 'UI', '"Full Name"/"Name", "Phone" text', 'Visible'],
  [61, 'seller-profile.e2e.spec.ts', 'renders seller profile page', 'Navigation', '"View Profile"/"Seller" link from detail', 'Seller page loads'],
  [62, 'seller-profile.e2e.spec.ts', 'displays seller information', 'Content', 'listing-contact-seller or "Contact" text', 'Visible'],
  [63, 'messaging.e2e.spec.ts', 'should display conversation list', 'Content', 'chatPage.conversationItem', 'Count may be 0+'],
  [64, 'messaging.e2e.spec.ts', 'should display conversations for logged-in user', 'Auth', 'chatPage.conversationItem.first()', 'Visible if count > 0'],
  [65, 'messaging.e2e.spec.ts', 'should send a message in conversation', 'Action', 'selectConversation + sendMessage', 'expectMessageSent'],
  [66, 'messaging.e2e.spec.ts', 'should have accessible message input', 'Accessibility', 'chatPage.messageInput', 'Visible, has aria-label'],
  [67, 'messaging.e2e.spec.ts', 'should navigate back to conversation list', 'Navigation', 'back button click', 'Conversation list visible'],
  [68, 'messaging.e2e.spec.ts', 'should display conversation header', 'UI', 'chatPage.expectConversationHeaderVisible', 'Header visible'],
  [69, 'messaging.e2e.spec.ts', 'should display attachment buttons', 'UI', 'chatPage.attachFileButton', 'Visible if present'],
  [70, 'messaging.e2e.spec.ts', 'should have chat menu', 'UI', 'chatPage.chatMenuButton', 'Visible if present'],
  [71, 'panel.e2e.spec.ts', 'should allow admin user to access admin panel', 'Auth', 'adminPage.goto + expectAdminPanelVisible', 'Panel loads'],
  [72, 'panel.e2e.spec.ts', 'should show Admin link in nav for admin', 'UI', 'page.goto(/) after admin load', '"Admin" link visible'],
  [73, 'panel.e2e.spec.ts', 'should display pending listings tab', 'UI', '"Pending" tab text', 'Visible'],
  [74, 'panel.e2e.spec.ts', 'should display users tab', 'UI', '"Users" tab text', 'Visible'],
  [75, 'panel.e2e.spec.ts', 'should display listings tab', 'UI', '"Listings" tab text', 'Visible'],
  [76, 'access.e2e.spec.ts', 'should redirect non-admin away from /admin', 'Auth', 'page.goto(/admin)', 'URL != /admin'],
  [77, 'access.e2e.spec.ts', 'should show 403 page for non-admin', 'Auth', 'page.goto(/admin)', 'h1="403", "Access Denied" visible'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cases), 'Test Cases');

// ============================================================
// SHEET 3: Data Dependencies
// ============================================================
const deps = [
  ['Seed File', 'Tables Populated', 'Used By Files', 'Notes'],
  ['seed_test_users.sql', 'auth.users, profiles', 'login, register, forgot-password, profile, favorites, dashboard, messaging, admin/*', '3 users: buyer (rajesh), seller (priya), admin (arun)'],
  ['seed_test_listings.sql', 'listings, listing_images, categories', 'home, browse, detail, category-page, seller-profile, favorites', 'Sample listings across categories with images'],
  ['seed_test_favorites.sql', 'favorites', 'favorites', 'Pre-seeded favorites for buyer user'],
  ['seed_test_chat.sql', 'conversations, messages', 'messaging', 'Conversations and sample messages'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(deps), 'Data Dependencies');

// ============================================================
// SHEET 4: Test Coverage Summary
// ============================================================
const summary = [
  ['Metric', 'Value'],
  ['Total test files', '17'],
  ['Total test cases', '77'],
  ['Modules covered', '11 (Home, Auth, Listings, Categories, Favorites, Profile, Seller, Chat, Admin x2)'],
  ['Auth-required tests', '~22 (create, dashboard, favorites, profile, chat, admin)'],
  ['Public (no-auth) tests', '~55'],
  ['Admin-only tests', '7 (panel + access)'],
  ['POMs used', 'loginPage, chatPage, adminPage'],
  ['Fixtures used', 'noAuthContext, e2eContext, adminContext'],
  ['Seed dependencies', '4 SQL files (users, listings, favorites, chat)'],
  ['Test runner', 'Playwright 1.52+'],
  ['Execution command', 'npx playwright test --project=e2e'],
  ['Allure tags', '@allure_feature="E2E", @allure_story="{module}"'],
  ['Retries', '1 (CI), 0 (local)'],
  ['Timeout', '30s per test'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Coverage Summary');

// ============================================================
// SHEET 5: Feature Coverage Map
// ============================================================
const coverage = [
  ['Feature', 'Page / Route', 'E2E Tests', 'API Tests', 'Mock Tests', 'Total'],
  ['Home page', '/', '7', '5', '0', '12'],
  ['Login', '/login', '8', '10', '0', '18'],
  ['Register', '/register', '4', '9', '0', '13'],
  ['Forgot Password', '/forgot-password', '3', '4', '0', '7'],
  ['Update Password', '/update-password', '1', '7', '0', '8'],
  ['Auth Callback', '/auth/callback', '2', '7', '0', '9'],
  ['Browse/Search/Filter', '/listings', '10', '14', '0', '24'],
  ['Listing Detail', '/listings/:id', '5', '6', '0', '11'],
  ['Create Listing', '/create', '4', '12', '0', '16'],
  ['Dashboard', '/dashboard', '2', '4', '0', '6'],
  ['Category Pages', '/category/:slug', '7', '6', '0', '13'],
  ['Favorites', '/favorites', '2', '3', '0', '5'],
  ['Profile', '/profile', '3', '13', '0', '16'],
  ['Seller Profile', '/seller/:id', '2', '3', '0', '5'],
  ['Chat/Messaging', '/chat', '8', '0', '0', '8'],
  ['Admin Panel', '/admin', '5', '12', '0', '17'],
  ['Admin Access Control', '/admin (non-admin)', '2', '0', '0', '2'],
  ['Logout', 'header', '0', '6', '0', '6'],
  ['Auth Service (mock)', 'N/A', '0', '0', '8', '8'],
  ['Listing Queries (mock)', 'N/A', '0', '0', '8', '8'],
  ['Profile Service (mock)', 'N/A', '0', '0', '8', '8'],
  ['Category Service (mock)', 'N/A', '0', '0', '4', '4'],
  ['Chat Service (mock)', 'N/A', '0', '0', '3', '3'],
  ['Edit listing', '/edit/:id', '0', '7', '0', '7'],
  ['Delete listing', 'dashboard', '0', '7', '0', '7'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(coverage), 'Feature Coverage');

// ============================================================
// Write
// ============================================================
const outPath = resolve(ROOT, 'tests/e2e/docs/e2e-test-inventory.xlsx');
const outDir = dirname(outPath);
mkdirSync(outDir, { recursive: true });
XLSX.writeFile(wb, outPath);
console.log(`E2E test inventory written: ${outPath}`);
