import XLSX from 'xlsx';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const wb = XLSX.utils.book_new();

// ============================================================
// SHEET 1: Endpoint Inventory
// ============================================================
const ep = [
  ['#', 'Module', 'Endpoint', 'Method', 'URL Pattern', 'Source File', 'Auth Required', 'JWT Required', 'DB Tables', 'RLS Policies', 'Existing Tests?'],
  [1, 'Auth', 'signInWithPassword', 'POST', '/auth/v1/token?grant_type=password', 'src/pages/Login.tsx:29', 'No', 'No', 'auth.users', 'N/A (auth endpoint)', 'E2E: login.e2e.spec.ts (7 tests)'],
  [2, 'Auth', 'signUp', 'POST', '/auth/v1/signup', 'src/pages/Register.tsx:33', 'No', 'No', 'auth.users, profiles', 'handle_new_user() trigger', 'E2E: register.e2e.spec.ts (3 tests)'],
  [3, 'Auth', 'signOut', 'POST', '/auth/v1/logout', 'src/contexts/AuthContext.tsx:54', 'Yes', 'Yes', 'None', 'N/A', 'None'],
  [4, 'Auth', 'getSession', 'GET', '/auth/v1/user', 'src/contexts/AuthContext.tsx:26', 'No', 'No', 'None', 'N/A', 'Covered implicitly by login'],
  [5, 'Auth', 'onAuthStateChange', 'N/A', 'Client-side event', 'src/contexts/AuthContext.tsx:36', 'No', 'No', 'None', 'N/A', 'None (client-side)'],
  [6, 'Auth', 'resetPasswordForEmail', 'POST', '/auth/v1/recover', 'src/pages/ForgotPassword.tsx:16', 'No', 'No', 'None', 'N/A', 'None'],
  [7, 'Auth', 'updateUser', 'PUT', '/auth/v1/user', 'src/pages/UpdatePassword.tsx:34', 'Yes', 'Yes', 'auth.users', 'N/A', 'None'],
  [8, 'Auth', 'AuthCallback (verify)', 'GET', '/auth/v1/verify?type=signup&token_hash=...', 'src/pages/AuthCallback.tsx:29', 'No', 'No', 'auth.users', 'N/A', 'E2E: login.e2e.spec.ts (1 test)'],
  [9, 'Listings', 'Browse/Search/Filter', 'GET', '/rest/v1/listings?select=*,category:*,images:*&eq(status,active)&...', 'src/pages/Listings.tsx:105', 'No', 'No', 'listings, categories, listing_images', 'Listings publicly readable', 'E2E: browse.e2e.spec.ts (8 tests)'],
  [10, 'Listings', 'Featured (Home)', 'GET', '/rest/v1/listings?select=*...&eq(is_featured,true)&limit(6)', 'src/pages/Home.tsx:15', 'No', 'No', 'listings', 'Listings publicly readable', 'None'],
  [11, 'Listings', 'Recent (Home)', 'GET', '/rest/v1/listings?select=*...&order(created_at.desc)&limit(8)', 'src/pages/Home.tsx:21', 'No', 'No', 'listings', 'Listings publicly readable', 'None'],
  [12, 'Listings', 'Distinct cities', 'GET', '/rest/v1/listings?select=city&eq(status,active)&not(city,is,null)&order(city)&limit(1000)', 'src/pages/Listings.tsx:56', 'No', 'No', 'listings', 'Listings publicly readable', 'None'],
  [13, 'Listings', 'Single detail', 'GET', '/rest/v1/listings?select=*,category:*,profile:*,images:*&eq(id,$id)&single()', 'src/pages/ListingDetail.tsx:28', 'No', 'No', 'listings, categories, profiles, listing_images', 'Listings publicly readable', 'E2E: browse.e2e.spec.ts (1 test)'],
  [14, 'Listings', 'Increment views', 'PATCH', '/rest/v1/listings?eq(id,$id) (views_count)', 'src/pages/ListingDetail.tsx:43', 'No', 'No', 'listings', 'Public update on views_count', 'None'],
  [15, 'Listings', 'Create listing', 'POST', '/rest/v1/listings (INSERT + .select().single())', 'src/pages/CreateListing.tsx:50', 'Yes', 'Yes', 'listings', 'Users can create own listings', 'E2E: create-listing.e2e.spec.ts'],
  [16, 'Listings', 'Create image record', 'POST', '/rest/v1/listing_images (INSERT)', 'src/pages/CreateListing.tsx:87', 'Yes', 'Yes', 'listing_images', 'Users can insert images for own listings', 'Covered by create listing'],
  [17, 'Listings', 'Update listing', 'PATCH', '/rest/v1/listings?eq(id,$id)', 'src/pages/EditListing.tsx:86', 'Yes', 'Yes', 'listings', 'Users can update own listings', 'None'],
  [18, 'Listings', 'Own listings (Dashboard)', 'GET', '/rest/v1/listings?select=id,title,price,...&eq(user_id,$userId)&limit(200)', 'src/pages/Dashboard.tsx:19', 'Yes', 'Yes', 'listings', 'Users can view own listings', 'None'],
  [19, 'Listings', 'Delete listing', 'DELETE', '/rest/v1/listings?eq(id,$id)', 'src/pages/Dashboard.tsx:32', 'Yes', 'Yes', 'listings', 'Users can delete own listings', 'None'],
  [20, 'Listings', 'Favorites batch', 'GET', '/rest/v1/listings?select=*,category:*,images:*&in(id,...ids)', 'src/pages/Favorites.tsx:22', 'Yes', 'Yes', 'listings', 'Listings publicly readable', 'None'],
  [21, 'Listings', 'Seller listings', 'GET', '/rest/v1/listings?select=...&eq(user_id,$id)&eq(status,active)&limit(50)', 'src/pages/SellerProfile.tsx:33', 'No', 'No', 'listings', 'Listings publicly readable', 'None'],
  [22, 'Listings', 'Category page', 'GET', '/rest/v1/listings?select=*,category:*,images:*&eq(category_id,$catId)&limit(50)', 'src/pages/CategoryPage.tsx:56', 'No', 'No', 'listings', 'Listings publicly readable', 'None'],
  [23, 'Listings', 'Category featured', 'GET', '/rest/v1/listings?...&eq(is_featured,true)&eq(category_id,$catId)&limit(6)', 'src/pages/CategoryPage.tsx:83', 'No', 'No', 'listings', 'Listings publicly readable', 'None'],
  [24, 'Listings', 'Admin: fetch non-pending', 'GET', '/rest/v1/listings?select=...&neq(status,pending)&limit(500)', 'src/pages/Admin.tsx:42', 'Yes (admin)', 'Yes', 'listings', 'Admins can view all listings', 'None'],
  [25, 'Listings', 'Admin: fetch pending', 'GET', '/rest/v1/listings?select=...&eq(status,pending)&limit(200)', 'src/pages/Admin.tsx:56', 'Yes (admin)', 'Yes', 'listings', 'Admins can view pending listings', 'None'],
  [26, 'Listings', 'Admin: approve', 'PATCH', '/rest/v1/listings?eq(id,$id) (status=active)', 'src/pages/Admin.tsx:72', 'Yes (admin)', 'Yes', 'listings', 'Admins can update any listing', 'None'],
  [27, 'Listings', 'Admin: reject', 'PATCH', '/rest/v1/listings?eq(id,$id) (status=inactive)', 'src/pages/Admin.tsx:86', 'Yes (admin)', 'Yes', 'listings', 'Admins can update any listing', 'None'],
  [28, 'Listings', 'Admin: toggle status', 'PATCH', '/rest/v1/listings?eq(id,$id) (status toggle)', 'src/pages/Admin.tsx:101', 'Yes (admin)', 'Yes', 'listings', 'Admins can update any listing', 'None'],
  [29, 'Listings', 'Category counts (listingService)', 'GET', '/rest/v1/listings?select=category_id&eq(status,active)', 'src/services/listingService.ts:14', 'No', 'No', 'listings', 'Listings publicly readable', 'None'],
  [30, 'Profiles', 'Fetch own profile', 'GET', '/rest/v1/profiles?select=*&eq(id,$userId)&single()', 'src/contexts/AuthContext.tsx:45', 'Yes', 'Yes', 'profiles', 'Users can view own profile', 'None'],
  [31, 'Profiles', 'Update own profile', 'PATCH', '/rest/v1/profiles?eq(id,$userId)', 'src/pages/Profile.tsx:29', 'Yes', 'Yes', 'profiles', 'Users can update own profile', 'None'],
  [32, 'Profiles', 'Admin: list all users', 'GET', '/rest/v1/profiles?select=id,email,full_name,role,created_at&limit(500)', 'src/pages/Admin.tsx:29', 'Yes (admin)', 'Yes', 'profiles', 'Admins can view all profiles', 'None'],
  [33, 'Profiles', 'View seller profile', 'GET', '/rest/v1/profiles?select=id,full_name,avatar_url,created_at,location,about&eq(id,$id)&single()', 'src/pages/SellerProfile.tsx:28', 'No', 'No', 'profiles', 'Profiles publicly readable (limited fields)', 'None'],
  [34, 'Categories', 'List all', 'GET', '/rest/v1/categories?select=*', 'src/pages/CreateListing.tsx:32', 'No', 'No', 'categories', 'Categories publicly readable', 'None'],
  [35, 'Categories', 'Select id,slug', 'GET', '/rest/v1/categories?select=id,slug', 'src/services/listingService.ts:27', 'No', 'No', 'categories', 'Categories publicly readable', 'None'],
  [36, 'Categories', 'Get by slug', 'GET', '/rest/v1/categories?select=*&eq(slug,$slug)&single()', 'src/pages/CategoryPage.tsx:47', 'No', 'No', 'categories', 'Categories publicly readable', 'None'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ep), 'Endpoint Inventory');

// ============================================================
// SHEET 2: Positive Test Cases
// ============================================================
const pos = [
  ['#', 'Module', 'Endpoint', 'Test Case', 'Precondition', 'Input', 'Expected Status', 'Expected Response'],
  [1, 'Auth', 'signInWithPassword', 'Valid buyer credentials return session', 'User exists', 'email=buyer, password=buyer_password', '200', 'access_token, refresh_token, user.id matches'],
  [2, 'Auth', 'signInWithPassword', 'Valid seller credentials return session', 'User exists', 'email=seller, password=seller_password', '200', 'access_token, refresh_token, user.id matches'],
  [3, 'Auth', 'signUp', 'New user with valid data creates account', 'Email not registered', 'email, password(>=6), full_name', '200', 'user.id, identity created, email_confirmed_at=null'],
  [4, 'Auth', 'signUp', 'Signup with user_metadata (full_name)', 'Email not registered', 'email, password, options.data.full_name', '200', 'user.user_metadata.full_name matches'],
  [5, 'Auth', 'signOut', 'Sign out clears session', 'Logged in', 'JWT in header', '204', 'Empty body, getSession returns null'],
  [6, 'Auth', 'getSession', 'Valid session returns user', 'Logged in', 'JWT in header', '200', 'user.id, user.email match'],
  [7, 'Auth', 'getSession', 'No session returns null', 'Not logged in', 'No auth header', '200', 'user is null or undefined'],
  [8, 'Auth', 'resetPasswordForEmail', 'Registered email receives reset', 'Email exists', 'email=registered', '200', 'Empty object {}'],
  [9, 'Auth', 'updateUser', 'Valid new password updates successfully', 'Has reset session', 'password=NewPass123!', '200', 'user.id matches, user.updated_at updated'],
  [10, 'Auth', 'AuthCallback', 'Valid confirmation shows confirmed status', 'Valid token_hash', 'type=signup, token_hash=valid', '200', 'getSession returns session with email_confirmed_at'],
  [11, 'Auth', 'AuthCallback', 'Already confirmed shows already_confirmed', 'Already confirmed', 'error=access_denied, error_description=already', '200', 'already_confirmed status shown'],
  [12, 'Auth', 'AuthCallback', 'No token shows processing/invalid state', 'No params', 'No query params', '200', 'invalid_link or processing status'],
  [13, 'Listings', 'Browse/Search', 'Returns active listings with joins', 'Listings exist', 'eq(status,active)', '200', 'Array with category, images nested'],
  [14, 'Listings', 'Browse/Search', 'Keyword search returns matching titles', 'Listings exist', 'q=Vintage, ilike filter', '200', 'All titles contain "Vintage" (case-insensitive)'],
  [15, 'Listings', 'Browse/Search', 'Category filter returns filtered results', 'Listings in category exist', 'category_id=catId', '200', 'All results have matching category_id'],
  [16, 'Listings', 'Browse/Search', 'City filter returns filtered results', 'Listings in city exist', 'eq(city,Mumbai)', '200', 'All results have city=Mumbai'],
  [17, 'Listings', 'Browse/Search', 'Price range filter works', 'Listings exist', 'gte(price,100), lte(price,5000)', '200', 'All prices between 100 and 5000'],
  [18, 'Listings', 'Browse/Search', 'Sort by price ascending works', 'Listings exist', 'order(price,asc)', '200', 'Prices are non-decreasing'],
  [19, 'Listings', 'Browse/Search', 'Pagination returns correct slice', '20+ listings exist', 'range(0,11)', '200', '12 items, content-range header present'],
  [20, 'Listings', 'Featured (Home)', 'Returns ≤6 featured listings', 'Featured exist', 'eq(is_featured,true)&limit(6)', '200', 'Array length ≤ 6, all is_featured=true'],
  [21, 'Listings', 'Featured (Home)', 'Featured with 0 results returns empty array', 'No featured', 'eq(is_featured,true)&limit(6)', '200', 'Empty array []'],
  [22, 'Listings', 'Recent (Home)', 'Returns ≤8 recent listings', 'Listings exist', 'order(created_at.desc)&limit(8)', '200', 'Array length ≤ 8, newest first'],
  [23, 'Listings', 'Distinct cities', 'Returns sorted unique cities', 'Listings with cities exist', 'select=city&order(city)&limit(1000)', '200', 'Sorted unique city strings'],
  [24, 'Listings', 'Single detail', 'Valid ID returns listing with joins', 'Listing exists', 'eq(id,validId)&single()', '200', 'Single object with category, profile, images'],
  [25, 'Listings', 'Single detail', 'Detail includes view count', 'Listing exists', 'eq(id,validId)&single()', '200', 'views_count is a number >= 0'],
  [26, 'Listings', 'Increment views', 'Views count increments by 1', 'Listing exists', 'PATCH views_count=N+1', '204', 'Subsequent GET shows N+1'],
  [27, 'Listings', 'Create listing', 'Create with all fields succeeds', 'Logged in', 'title, description, price, category_id, location, condition', '201', 'Returned listing with id, status=pending'],
  [28, 'Listings', 'Create listing', 'Create with minimum fields succeeds', 'Logged in', 'title, description, price, category_id only', '201', 'Returned listing with default values'],
  [29, 'Listings', 'Create listing', 'Auto-sets status=pending on create', 'Logged in', 'Valid create data', '201', 'Listing.status === "pending"'],
  [30, 'Listings', 'Create image record', 'Valid image record inserts', 'Listing exists', 'listing_id, url, sort_order', '201', 'Record created with id'],
  [31, 'Listings', 'Update listing', 'Update all fields succeeds', 'Owns listing', 'title, description, price, category_id', '204', 'Subsequent GET shows updated values'],
  [32, 'Listings', 'Update listing', 'Partial update (single field) succeeds', 'Owns listing', 'PATCH {title: "New Title"}', '204', 'Only title changed, other fields unchanged'],
  [33, 'Listings', 'Own listings (Dashboard)', 'Returns own listings', 'Logged in, has listings', 'eq(user_id,ownId)', '200', 'All results have user_id=ownId'],
  [34, 'Listings', 'Own listings (Dashboard)', 'Empty array when user has no listings', 'Logged in, no listings', 'eq(user_id,ownId)', '200', 'Empty array []'],
  [35, 'Listings', 'Delete listing', 'Delete own listing succeeds', 'Owns listing', 'DELETE eq(id,listingId)', '204', 'Subsequent GET returns 404'],
  [36, 'Listings', 'Favorites batch', 'Fetch by ID list returns matching', 'Listings exist', 'in(id,[id1,id2])', '200', 'Array contains only those IDs'],
  [37, 'Listings', 'Seller listings', 'Returns active listings for seller', 'Seller exists, has active', 'eq(user_id,sellerId)&eq(status,active)', '200', 'All results have user_id=sellerId, status=active'],
  [38, 'Listings', 'Category page', 'Returns listings for category', 'Category has listings', 'eq(category_id,catId)', '200', 'All results have category_id=catId'],
  [39, 'Listings', 'Category page', 'Returns ≤50 listings', '50+ listings in category', 'limit(50)', '200', 'Array length ≤ 50'],
  [40, 'Listings', 'Category featured', 'Returns featured for category', 'Category has featured', 'eq(category_id,catId)&eq(is_featured,true)', '200', 'All is_featured=true'],
  [41, 'Listings', 'Admin: fetch non-pending', 'Admin sees non-pending listings', 'Logged in as admin', 'neq(status,pending)', '200', 'No results have status=pending'],
  [42, 'Listings', 'Admin: fetch pending', 'Admin sees pending listings', 'Logged in as admin', 'eq(status,pending)', '200', 'All results have status=pending'],
  [43, 'Listings', 'Admin: approve', 'Admin approves pending listing', 'Logged in as admin', 'PATCH status=active', '200', 'Status changes to active'],
  [44, 'Listings', 'Admin: reject', 'Admin rejects pending listing', 'Logged in as admin', 'PATCH status=inactive', '200', 'Status changes to inactive'],
  [45, 'Listings', 'Admin: toggle', 'Admin toggles to sold', 'Logged in as admin', 'PATCH status=sold', '200', 'Status changes to sold'],
  [46, 'Listings', 'Category counts (listingService)', 'Returns category_id counts', 'Listings exist', 'select=category_id, eq(status,active)', '200', 'Array of category_ids'],
  [47, 'Profiles', 'Fetch own profile', 'Returns own profile', 'Logged in', 'eq(id,ownId)&single()', '200', 'id, email, full_name, role returned'],
  [48, 'Profiles', 'Update own profile', 'Update full_name succeeds', 'Logged in', 'PATCH {full_name: "New Name"}', '204', 'Subsequent GET shows new name'],
  [49, 'Profiles', 'Update own profile', 'Update phone succeeds', 'Logged in', 'PATCH {phone: "9999999999"}', '204', 'Subsequent GET shows new phone'],
  [50, 'Profiles', 'Admin: list all', 'Admin sees all users', 'Logged in as admin', 'order(created_at.desc)', '200', 'Array of users with id, email, role'],
  [51, 'Profiles', 'Seller profile (public)', 'Valid seller ID returns profile', 'Seller exists', 'eq(id,sellerId)&single()', '200', 'id, full_name, avatar_url, created_at'],
  [52, 'Categories', 'List all', 'Returns all categories', 'Seeded', 'select=*', '200', 'Array of 16 categories with all fields'],
  [53, 'Categories', 'List all', 'Returns correct structure', 'Seeded', 'select=*', '200', 'Each has id, name, slug, icon, description, display_order'],
  [54, 'Categories', 'Select id,slug', 'Returns id and slug only', 'Seeded', 'select=id,slug', '200', 'Each has only id and slug fields'],
  [55, 'Categories', 'Get by slug', 'Valid slug returns category', 'Seeded', 'eq(slug,vehicles)&single()', '200', 'Single category with slug=vehicles'],
  [56, 'Categories', 'Get by slug', 'Returns all fields for slug', 'Seeded', 'eq(slug,vehicles)&single()', '200', 'All category fields present'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pos), 'Positive Test Cases');

// ============================================================
// SHEET 3: Negative Test Cases
// ============================================================
const neg = [
  ['#', 'Module', 'Endpoint', 'Test Case', 'Input', 'Expected Status', 'Expected Error'],
  [1, 'Auth', 'signInWithPassword', 'Wrong password', 'email=valid, password=wrong', '400', 'Invalid login credentials'],
  [2, 'Auth', 'signInWithPassword', 'Unregistered email', 'email=nonexistent@test.com, password=any', '400', 'Invalid login credentials'],
  [3, 'Auth', 'signInWithPassword', 'Empty email field', 'email=, password=any', '400', 'Validation error or form blocked'],
  [4, 'Auth', 'signInWithPassword', 'Empty password field', 'email=valid, password=', '400', 'Validation error or form blocked'],
  [5, 'Auth', 'signUp', 'Already-registered email', 'email=existing@test.com, password=Pass123!', '422', 'User already registered'],
  [6, 'Auth', 'signUp', 'Password too short (< 6 chars)', 'email=new@test.com, password=12', '400', 'Password should be at least 6 characters'],
  [7, 'Auth', 'signUp', 'Invalid email format', 'email=notanemail, password=Pass123!', '400', 'Invalid email'],
  [8, 'Auth', 'signOut', 'Sign out without auth', 'No JWT in header', '401', 'Unauthorized'],
  [9, 'Auth', 'resetPasswordForEmail', 'Invalid email format', 'email=notanemail', '400', 'Validation error'],
  [10, 'Auth', 'updateUser', 'Password < 6 chars', 'password=12', '400', 'Password should be at least 6 characters'],
  [11, 'Auth', 'updateUser', 'Passwords do not match (client-side)', 'password=abc123, confirm=def456', '400', 'Passwords do not match (client validation)'],
  [12, 'Auth', 'AuthCallback', 'Invalid/expired token_hash', 'type=signup, token_hash=invalid', '200', 'invalid_link status shown'],
  [13, 'Auth', 'AuthCallback', 'Error in URL params', 'error=access_denied, error_description=...', '200', 'Appropriate error status shown'],
  [14, 'Listings', 'Browse/Search', 'Empty result for non-matching query', 'q=__nonexistent_zzz__', '200', 'Empty array []'],
  [15, 'Listings', 'Browse/Search', 'Invalid category slug returns all', 'category=__invalid__', '200', 'All active listings (slug ignored if no match)'],
  [16, 'Listings', 'Single detail', 'Non-existent listing ID', 'eq(id,00000000-0000-0000-0000-000000000000)&single()', '406', 'Not acceptable / JSON or null'],
  [17, 'Listings', 'Single detail', 'Deleted/inactive listing by ID', 'eq(id,deletedId)&single()', '406', 'Not found (status filter blocks)'],
  [18, 'Listings', 'Increment views', 'Non-existent listing ID', 'PATCH eq(id,fakeId)', '204', 'No-op (no rows matched)'],
  [19, 'Listings', 'Create listing', 'Missing title', 'INSERT without title', '400', 'not-null constraint violation'],
  [20, 'Listings', 'Create listing', 'Missing price', 'INSERT without price', '400', 'not-null constraint violation'],
  [21, 'Listings', 'Create listing', 'Negative price', 'INSERT price=-100', '400', 'check constraint violation'],
  [22, 'Listings', 'Create image record', 'Missing listing_id', 'INSERT without listing_id', '400', 'not-null constraint violation'],
  [23, 'Listings', 'Create image record', 'Invalid listing_id (no FK match)', 'INSERT listing_id=fakeId', '400', 'foreign key constraint violation'],
  [24, 'Listings', 'Update listing', 'Update non-owned listing', 'PATCH another_users_listing', '403', 'RLS blocks update (no rows affected)'],
  [25, 'Listings', 'Delete listing', 'Delete non-existent listing', 'DELETE eq(id,fakeId)', '204', 'No-op (0 rows deleted)'],
  [26, 'Listings', 'Delete listing', 'Delete non-owned listing', 'DELETE another_users_listing', '403', 'RLS blocks delete (0 rows affected)'],
  [27, 'Listings', 'Favorites batch', 'Empty ID list', 'in(id,[])', '200', 'Empty array []'],
  [28, 'Listings', 'Seller listings', 'Seller with no active listings', 'eq(user_id,newUserId)&eq(status,active)', '200', 'Empty array []'],
  [29, 'Listings', 'Category page', 'Category with 0 listings', 'eq(category_id,emptyCatId)', '200', 'Empty array []'],
  [30, 'Listings', 'Admin: approve', 'Non-admin tries to approve', 'PATCH as non-admin user', '403', 'RLS blocks (0 rows affected)'],
  [31, 'Profiles', 'Fetch own profile', 'Another user\'s profile (RLS blocked)', 'eq(id,otherUserId)&single()', '404', 'Not found or RLS empty'],
  [32, 'Profiles', 'Update own profile', 'Update another user\'s profile', 'PATCH other_users_profile', '403', 'RLS blocks (0 rows affected)'],
  [33, 'Profiles', 'Admin: list all (non-admin)', 'Non-admin tries to list all users', 'GET as non-admin', '200', 'Returns only own profile (RLS filter)'],
  [34, 'Profiles', 'Seller profile (public)', 'Non-existent user ID', 'eq(id,fakeId)&single()', '406', 'Not found'],
  [35, 'Categories', 'Get by slug', 'Non-existent slug', 'eq(slug,__invalid__)&single()', '406', 'Not found'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(neg), 'Negative Test Cases');

// ============================================================
// SHEET 4: Authorization Tests
// ============================================================
const authz = [
  ['#', 'Module', 'Endpoint', 'Test Case', 'Role', 'Expected Status', 'Expected Behavior'],
  [1, 'Auth', 'signOut', 'No JWT → 401', 'Anonymous', '401', 'Request rejected'],
  [2, 'Auth', 'signOut', 'Expired JWT → 401', 'Expired session', '401', 'Request rejected'],
  [3, 'Auth', 'updateUser', 'No JWT → 401', 'Anonymous', '401', 'Request rejected'],
  [4, 'Auth', 'updateUser', 'Expired reset token → 401', 'Expired session', '401', 'Request rejected'],
  [5, 'Auth', 'getSession', 'No JWT returns null (not 401)', 'Anonymous', '200', 'Returns null user'],
  [6, 'Listings', 'Create listing', 'No JWT → 401', 'Anonymous', '401', 'Request rejected'],
  [7, 'Listings', 'Create listing', 'JWT with wrong user_id in body overridden by RLS', 'Buyer', '201', 'user_id set to auth.uid() ignoring body'],
  [8, 'Listings', 'Create image record', 'No JWT → 401', 'Anonymous', '401', 'Request rejected'],
  [9, 'Listings', 'Update listing', 'No JWT → 401', 'Anonymous', '401', 'Request rejected'],
  [10, 'Listings', 'Update listing', 'Other user\'s listing → 403 (0 rows)', 'Buyer (different)', '204', '0 rows affected, unchanged'],
  [11, 'Listings', 'Update listing', 'Admin can update any listing', 'Admin', '204', 'Updates regardless of owner'],
  [12, 'Listings', 'Own listings (Dashboard)', 'No JWT → 401 or filtered', 'Anonymous', '200', 'Empty array (RLS: user_id=auth.uid()=null)'],
  [13, 'Listings', 'Delete listing', 'No JWT → 401', 'Anonymous', '401', 'Request rejected'],
  [14, 'Listings', 'Delete listing', 'Other user\'s listing → 403 (0 rows)', 'Buyer (different)', '204', '0 rows affected, unchanged'],
  [15, 'Listings', 'Delete listing', 'Admin can delete any listing', 'Admin', '204', 'Deletes regardless of owner'],
  [16, 'Listings', 'Admin: fetch non-pending', 'Non-admin → only own listings', 'Buyer', '200', 'Own listings only (RLS filter)'],
  [17, 'Listings', 'Admin: fetch pending', 'Non-admin → only own pending', 'Buyer', '200', 'Own pending listings only'],
  [18, 'Listings', 'Admin: approve', 'Non-admin → 403 (0 rows)', 'Buyer', '200', '0 rows affected (RLS blocks)'],
  [19, 'Listings', 'Admin: reject', 'Non-admin → 403 (0 rows)', 'Buyer', '200', '0 rows affected (RLS blocks)'],
  [20, 'Listings', 'Admin: toggle', 'Non-admin → 403 (0 rows)', 'Buyer', '200', '0 rows affected (RLS blocks)'],
  [21, 'Profiles', 'Fetch own profile', 'No JWT → null', 'Anonymous', '200', 'null (not 401)'],
  [22, 'Profiles', 'Fetch own profile', 'Other user\'s ID → empty (RLS)', 'Buyer', '200', 'Returns null/404 (RLS blocks)'],
  [23, 'Profiles', 'Update own profile', 'No JWT → 401', 'Anonymous', '401', 'Request rejected'],
  [24, 'Profiles', 'Update own profile', 'Other user\'s profile → 403 (0 rows)', 'Buyer (different)', '204', '0 rows affected (RLS blocks)'],
  [25, 'Profiles', 'Admin: list all', 'Non-admin → own profile only', 'Buyer', '200', 'Single result (RLS filters)'],
  [26, 'Profiles', 'Admin: list all', 'Admin → all users', 'Admin', '200', 'Multiple results'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(authz), 'Authorization Tests');

// ============================================================
// SHEET 5: Validation Tests
// ============================================================
const val = [
  ['#', 'Module', 'Endpoint', 'Test Case', 'Input', 'Expected Error', 'Error Source'],
  [1, 'Auth', 'signInWithPassword', 'Invalid email format (client)', 'email=notanemail, password=Pass123!', 'Browser HTML5 validation blocks', 'Client-side (type=email)'],
  [2, 'Auth', 'signInWithPassword', 'Empty required field', 'email=, password=', 'HTML5 required attribute', 'Client-side (required)'],
  [3, 'Auth', 'signUp', 'Password < 6 chars (client pre-check)', 'password=12', 'Password must be at least 6 characters', 'Client-side (JS check)'],
  [4, 'Auth', 'signUp', 'Password < 6 chars (Supabase)', 'password=12345', 'Password should be at least 6 characters', 'Supabase API'],
  [5, 'Auth', 'signUp', 'Invalid email format', 'email=invalid, password=Pass123!', 'Invalid email', 'Supabase API'],
  [6, 'Auth', 'resetPasswordForEmail', 'Invalid email format', 'email=notanemail', 'Validation error', 'Supabase API'],
  [7, 'Auth', 'updateUser', 'Password < 6 chars', 'password=12', 'Password should be at least 6 characters', 'Supabase API'],
  [8, 'Auth', 'updateUser', 'Passwords mismatch (client)', 'password=abc123, confirm=xyz789', 'Passwords do not match', 'Client-side (JS check)'],
  [9, 'Listings', 'Browse/Search', 'SQL injection in query param', 'q=\' OR 1=1; --', '200', 'Treated as literal string (parameterized)'],
  [10, 'Listings', 'Browse/Search', 'XSS in search query', 'q=<script>alert("xss")</script>', '200', 'Returned as data (app must escape)'],
  [11, 'Listings', 'Browse/Search', 'Invalid price range (min > max)', 'minPrice=5000, maxPrice=100', '200', 'No matching results (valid query)'],
  [12, 'Listings', 'Create listing', 'Non-numeric price', 'price="abc"', '400', 'Type mismatch / bad request'],
  [13, 'Listings', 'Create listing', 'Negative price', 'price=-100', '400', 'Check constraint violation'],
  [14, 'Listings', 'Create listing', 'Price = 0', 'price=0', '400', 'Check constraint (if min > 0)'],
  [15, 'Listings', 'Create listing', 'Invalid condition value', 'condition="broken"', '400', 'Check constraint violation'],
  [16, 'Listings', 'Create image record', 'Invalid sort_order (non-integer)', 'sort_order="abc"', '400', 'Type mismatch'],
  [17, 'Listings', 'Update listing', 'Invalid price update', 'price=-50', '400', 'Check constraint violation'],
  [18, 'Listings', 'Category page', 'Invalid price range filter', 'filter price=abc', '200', 'Ignored or treated as no filter'],
  [19, 'Profiles', 'Update own profile', 'Empty full_name (nullable)', 'full_name=""', '204', 'Accepted (nullable field)'],
  [20, 'Profiles', 'Update own profile', 'Very long name', 'full_name="A".repeat(256)', '400', 'Max length constraint (if any)'],
  [21, 'Categories', 'Get by slug', 'Uppercase slug (case-sensitive?)', 'slug="VEHICLES"', '406', 'Not found (case-sensitive match)'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(val), 'Validation Tests');

// ============================================================
// SHEET 6: Edge Cases
// ============================================================
const edge = [
  ['#', 'Module', 'Endpoint', 'Edge Case', 'Input / Condition', 'Expected Behavior'],
  [1, 'Auth', 'signInWithPassword', 'Already logged in user signs in again', 'User has valid session, calls signIn again', 'New session issued, old one invalidated'],
  [2, 'Auth', 'signInWithPassword', 'Rate limiting (too many attempts)', 'Multiple rapid failed sign-in attempts', '429 Too Many Requests after threshold'],
  [3, 'Auth', 'signInWithPassword', 'Disabled/ deleted user account', 'Account deleted via auth admin', '400 Invalid login credentials'],
  [4, 'Auth', 'signUp', 'Concurrent signup same email', 'Two requests simultaneously same email', 'One succeeds, one gets 422 (unique constraint)'],
  [5, 'Auth', 'signUp', 'Signup with email confirmation disabled', 'Settings may vary', 'User created with email_confirmed_at=now()'],
  [6, 'Auth', 'signOut', 'Double sign-out', 'Sign out twice', 'Second call returns 401 (already signed out)'],
  [7, 'Auth', 'signOut', 'Sign out after session expired', 'Expired JWT', '401 Unauthorized (JWT expired)'],
  [8, 'Auth', 'getSession', 'Session just refreshed', 'Token refreshed milliseconds ago', 'Returns current valid user'],
  [9, 'Auth', 'getSession', 'Session from different device', 'JWT from another device', 'Returns same user (stateless)'],
  [10, 'Auth', 'resetPasswordForEmail', 'Rate limiting (1 email per 60s)', 'Rapid repeated requests same email', '429 or silent success (Supabase rate limit)'],
  [11, 'Auth', 'updateUser', 'New password same as old', 'password=same as current', 'Accepted (no uniqueness constraint on password)'],
  [12, 'Auth', 'updateUser', 'Special characters in password', 'password="!@#$%^&*()\"', 'Accepted if >= 6 chars'],
  [13, 'Listings', 'Browse/Search', '0 total results', 'q=__nonexistent_zzz__', 'Empty array, 0 count'],
  [14, 'Listings', 'Browse/Search', '1000+ results (pagination boundary)', 'No filters (all active listings)', 'First page returned, content-range header present'],
  [15, 'Listings', 'Browse/Search', 'Special characters in search', 'q="fahrzeug mit ö, ü, ß"', 'Treated as literal (URL-encoded)'],
  [16, 'Listings', 'Browse/Search', 'Concurrent listing creation during browse', 'Create listing while browsing', 'Eventually consistent (no isolation issues)'],
  [17, 'Listings', 'Single detail', 'Listing with no images', 'Listing with null/empty images', 'Returns null/empty images array, does not error'],
  [18, 'Listings', 'Single detail', 'Listing with no profile (orphaned)', 'user_id references deleted auth user', 'profile is null, does not error'],
  [19, 'Listings', 'Increment views', 'Concurrent view increments', 'Two requests simultaneously', 'Both increment (no race condition guarantee)'],
  [20, 'Listings', 'Increment views', 'Max integer overflow', 'views_count = 2^31-1, increment', 'Depends on DB column type (bigint safe)'],
  [21, 'Listings', 'Create listing', 'Very long title (>200 chars)', 'title="A".repeat(300)', '400 max length constraint violation'],
  [22, 'Listings', 'Create listing', 'Very long description (>10K chars)', 'description="A".repeat(15000)', '400 max length or truncated'],
  [23, 'Listings', 'Create listing', 'Price = $0.01 (minimum)', 'price=0.01', 'Accepted if min > 0 check not present'],
  [24, 'Listings', 'Create listing', 'Concurrent same-listing creation (different users)', 'Two users create for same listing?', 'N/A (each creates their own listing)'],
  [25, 'Listings', 'Update listing', 'Update after listing is already active', 'Status=active, PATCH title', 'Accepted (edit allowed for active)'],
  [26, 'Listings', 'Update listing', 'Update after listing is sold', 'Status=sold, PATCH title', 'Accepted or blocked by app logic'],
  [27, 'Listings', 'Delete listing', 'Delete listing with images', 'Listing has 5 images', 'Cascade delete or manual cleanup needed'],
  [28, 'Listings', 'Delete listing', 'Delete already-deleted listing', 'Listing already deleted', '204 (idempotent — 0 rows affected)'],
  [29, 'Listings', 'Favorites batch', 'Mix of valid and invalid UUIDs', 'in(id,[validId,fakeId])', 'Returns only valid matches'],
  [30, 'Listings', 'Seller listings', 'Seller has only inactive/pending listings', 'No active listings', 'Empty array (status=active filter)'],
  [31, 'Listings', 'Category page', '50+ listings in category', '51 listings, category page limit 50', 'Returns exactly 50 (limit)'],
  [32, 'Listings', 'Category page', 'Category with both active and inactive', 'Inactive exist', 'Only active returned'],
  [33, 'Listings', 'Admin: approve', 'Approve already-active listing', 'Status already active', 'No-op (0 rows affected)'],
  [34, 'Profiles', 'Fetch own profile', 'Profile not yet created (race condition)', 'User created, profile trigger pending', 'null or 404 (transient)'],
  [35, 'Profiles', 'Fetch own profile', 'Deleted user (auth disabled)', 'User deleted from auth', 'Session invalid, redirect to login'],
  [36, 'Profiles', 'Update own profile', 'Update with same values (no-op)', 'PATCH same full_name', '204 (0 rows changed conceptually)'],
  [37, 'Profiles', 'Update own profile', 'Update immediately after signup', 'Seconds after signup', '204 (profile exists from trigger)'],
  [38, 'Profiles', 'Seller profile (public)', 'Seller has no avatar, no location', 'avatar_url=null, location=null', 'Returns null fields gracefully'],
  [39, 'Categories', 'List all', 'Cache behavior (listingService)', 'Multiple rapid calls', 'Cached after first call (5 min TTL)'],
  [40, 'Categories', 'List all', 'Category display_order consistency', 'Checking order', 'Returned in display_order sequence'],
  [41, 'Categories', 'Get by slug', 'Slug with hyphens', 'slug="real-estate"', 'Matches correctly'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(edge), 'Edge Cases');

// ============================================================
// SHEET 7: Test Execution Strategy
// ============================================================
const exec = [
  ['#', 'Aspect', 'Decision', 'Rationale'],
  [1, 'Real vs Mock', 'Real Supabase', 'Phase 1 tests validate full stack (RLS, triggers, auth). Mocks bypass the security layer we need to test.'],
  [2, 'Real vs Mock Exception', 'onAuthStateChange (mock)', 'Client-side EventEmitter — no HTTP endpoint to hit. Mock the subscription callbacks.'],
  [3, 'Real vs Mock Exception', 'AuthCallback verification (mock + real)', 'Mix: mock URL params for error states; real Supabase for default email confirmation check.'],
  [4, 'Parallel execution', 'Disabled (fullyParallel: false)', 'Test data sharing (same test user accounts) requires sequential execution to avoid conflicts.'],
  [5, 'Test isolation', 'Per-file setup/teardown', 'Each spec file creates its own tagged records and cleans up in afterAll.'],
  [6, 'Cleanup strategy', 'Soft-delete (PATCH status=inactive) + tagged prefix', 'No DELETE available on some tables. Tagged [API_TEST:<uuid>] titles enable precise cleanup queries.'],
  [7, 'Pre-clean', 'beforeAll: remove stale tagged records', 'Handles aborted runs from previous executions. Query + PATCH status=inactive.'],
  [8, 'Post-clean verification', 'afterAll: GET tagged records, assert 0 visible', 'Fail the spec if cleanup left visible tagged data behind.'],
  [9, 'Auth approach', 'Direct Supabase auth REST calls', 'Use fetch() to POST /auth/v1/token directly. No UI navigation needed for API tests.'],
  [10, 'JWT extraction', 'From sign-in response body (access_token)', 'Extract from JSON response, store in test context.'],
  [11, 'Retry policy', '1 retry on failure (CI), 0 locally', 'Consistent with existing Playwright config.'],
  [12, 'Timeout', '30s per test (API tests faster than UI)', 'API calls typically respond < 2s. 30s budget allows for retries and slow connections.'],
  [13, 'Reporting', 'Allure + HTML + list', 'Existing reporters reused. Tag API tests with @allure_feature="API" for filtering.'],
  [14, 'Execution command', 'npx playwright test --project=api', 'Separate project for independent execution. Can also run full suite: npx playwright test'],
  [15, 'CI integration', 'Add to CI pipeline as optional step', 'API tests depend on Supabase availability. Mark as non-blocking initially.'],
  [16, 'Data directory', 'tests/e2e/api/', 'Shared utilities under api/. Specs under specs/api/. Clean separation from UI tests.'],
  [17, 'Environment', 'Uses existing .env.test', 'No new env vars needed. SUPABASE_URL and SUPABASE_ANON_KEY already present.'],
  [18, 'Test user accounts', '3 existing + 1 dynamic (signup test)', 'Buyer, seller, admin for authed tests. Dynamic unique email for signup.'],
  [19, 'Signup test cleanup', 'No cleanup needed for signup', 'Supabase email confirmation means unconfirmed users are inert. Can leave in DB.'],
  [20, 'Rate limiting', 'Add 1s delay between auth tests', 'Avoid 429 on password reset and sign-in attempts. Use test.beforeEach for spacing.'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exec), 'Test Execution Strategy');

// ============================================================
// SHEET 8: Risk & Priority Matrix
// ============================================================
const risk = [
  ['#', 'Risk', 'Module', 'Likelihood', 'Impact', 'Priority', 'Mitigation'],
  [1, 'RLS blocks cleanup (cannot soft-delete)', 'Listings', 'Medium', 'High', 'P0', 'Use unique [API_TEST:<uuid>] tagging + pre-clean before each run. Verification step in afterAll.'],
  [2, 'Test data leaks between runs', 'All', 'Low', 'Medium', 'P0', 'Tagging + pre-clean + post-clean triple defense. Verification asserts zero visible tagged records.'],
  [3, 'Auth rate limiting (429 on sign-in)', 'Auth', 'Medium', 'Low', 'P0', 'Add retry with exponential backoff in auth helpers. Stagger auth tests with 1s delay.'],
  [4, 'Real Supabase downtime / network', 'All', 'Low', 'High', 'P0', 'Tests fail with clear error message. Document as environment issue. Add health check in global-setup.'],
  [5, 'Existing test user password changes', 'Auth', 'Low', 'Medium', 'P1', 'Passwords stored in .env.test. Document credential rotation process. Alert on first auth failure.'],
  [6, 'Category count changes with seed data', 'Categories', 'Low', 'Low', 'P2', 'Test structure (fields present), not exact count. Use expect.toBeGreaterThan(0) not (toEqual(16)).'],
  [7, 'Listing page size constant changes', 'Listings', 'Low', 'Low', 'P2', 'Use configurable constant (PAGE_SIZE). Accept dynamic values rather than hardcoded 12.'],
  [8, 'UUID generation for test data collisions', 'All', 'Very Low', 'Medium', 'P1', 'Use crypto.randomUUID() for unique IDs. Namespace with prefix per module.'],
  [9, 'Concurrent pipeline runs collide', 'All', 'Low', 'Medium', 'P1', 'Include CI build ID in tag: [API_TEST:<buildId>:<uuid>]. Presently sequential (fullyParallel: false).'],
  [10, 'Signup test leaves user in auth.users', 'Auth', 'High', 'Low', 'P2', 'Unconfirmed users are inert. Supabase auto-cleans old unconfirmed users. Acceptable to leave.'],
  [11, 'Profile update test modifies real user name', 'Profiles', 'Low', 'Medium', 'P1', 'Reset profile to known default in afterAll. Verify reset succeeded.'],
  [12, 'Admin test modifies listing status', 'Listings', 'Medium', 'Medium', 'P1', 'Use test-specific listing (create in beforeAll, restore in afterAll). Tag with [API_TEST:].'],
  [13, 'Test execution time exceeds CI timeout', 'All', 'Low', 'Medium', 'P1', 'Estimated 8-12 min. Split into groups if needed. Run as separate CI job with longer timeout.'],
  [14, 'RLS policy change breaks tests', 'All', 'Low', 'High', 'P0', 'Tests validate existing RLS. Policy change = test update. Document dependency.'],
  [15, 'Browser dependency for API tests', 'All', 'Low', 'Low', 'P3', 'API tests use fetch() / Supabase client. No browser needed. Can run without --project=api.'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(risk), 'Risk & Priority Matrix');

// ============================================================
// Write file
// ============================================================
const outPath = resolve(ROOT, 'tests/e2e/docs/api-phase1-test-plan.xlsx');
const outDir = dirname(outPath);
mkdirSync(outDir, { recursive: true });
XLSX.writeFile(wb, outPath);
console.log(`Phase 1 test matrix written: ${outPath}`);
