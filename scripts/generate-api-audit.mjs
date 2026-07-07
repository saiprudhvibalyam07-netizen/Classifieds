import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const wb = XLSX.utils.book_new();

// ============================================================
// SHEET 1: Database Tables (REST API)
// ============================================================
const tablesSheet = [
  ['#', 'Table', 'Method', 'Endpoint Pattern', 'Source File', 'Line', 'Auth', 'Description'],
  [1, 'listings', 'GET', '/rest/v1/listings?select=category_id&eq(status,active)', 'src/services/listingService.ts', 14, 'Public', 'Fetch all active listing category IDs for counting'],
  [2, 'listings', 'GET', '/rest/v1/listings?select=*&eq(status,active)&eq(is_featured,true)&order(created_at.desc)&limit(6)', 'src/pages/Home.tsx', 15, 'Public', 'Fetch featured listings for homepage'],
  [3, 'listings', 'GET', '/rest/v1/listings?select=*,category:categories(name,slug),images:listing_images(url)&eq(status,active)&order(created_at.desc)&limit(8)', 'src/pages/Home.tsx', 21, 'Public', 'Fetch recent listings for homepage'],
  [4, 'listings', 'GET', '/rest/v1/listings?select=*,category:categories(*),images:listing_images(*)&eq(status,active)&...filters...&range(from,to)', 'src/pages/Listings.tsx', 105, 'Public', 'Browse/search listings with full filtering, pagination, sorting'],
  [5, 'listings', 'GET', '/rest/v1/listings?select=city&eq(status,active)&not(city,is,null)&order(city)&limit(1000)', 'src/pages/Listings.tsx', 56, 'Public', 'Fetch distinct city names for filter dropdown'],
  [6, 'listings', 'GET', '/rest/v1/listings?select=*,category:categories(*),profile:profiles(*),images:listing_images(*)&eq(id,$id)&single()', 'src/pages/ListingDetail.tsx', 28, 'Public', 'Fetch single listing detail with relations'],
  [7, 'listings', 'PATCH', '/rest/v1/listings?eq(id,$id) — update views_count', 'src/pages/ListingDetail.tsx', 43, 'Public', 'Increment listing view counter'],
  [8, 'listings', 'POST', '/rest/v1/listings (INSERT + .select().single())', 'src/pages/CreateListing.tsx', 50, 'Auth required', 'Create a new listing'],
  [9, 'listings', 'POST', '/rest/v1/listings (INSERT image record)', 'src/pages/CreateListing.tsx', 87, 'Auth required', 'Insert listing_image record'],
  [10, 'listings', 'PATCH', '/rest/v1/listings?eq(id,$id)', 'src/pages/EditListing.tsx', 86, 'Auth required', 'Update listing fields'],
  [11, 'listings', 'GET', '/rest/v1/listings?select=id,title,price,views_count,status,images:listing_images(url)&eq(user_id,$userId)&order(created_at.desc)&limit(200)', 'src/pages/Dashboard.tsx', 19, 'Auth required', "Fetch user's own listings for dashboard"],
  [12, 'listings', 'DELETE', '/rest/v1/listings?eq(id,$id)', 'src/pages/Dashboard.tsx', 32, 'Auth required', "Delete user's own listing"],
  [13, 'listings', 'GET', '/rest/v1/listings?select=*,category:categories(*),images:listing_images(*)&in(id,...ids)', 'src/pages/Favorites.tsx', 22, 'Auth required', 'Fetch favorite listings by ID set'],
  [14, 'listings', 'GET', '/rest/v1/listings?select=id,title,price,location,is_featured,created_at,category:categories(name),images:listing_images(url)&eq(user_id,$id)&eq(status,active)&order(created_at.desc)&limit(50)', 'src/pages/SellerProfile.tsx', 33, 'Public', "Fetch seller's active listings"],
  [15, 'listings', 'GET', '/rest/v1/listings?select=*,category:categories(*),images:listing_images(*)&eq(status,active)&eq(category_id,$catId)&...filters...&limit(50)', 'src/pages/CategoryPage.tsx', 56, 'Public', 'Browse listings by category with filters'],
  [16, 'listings', 'GET', '/rest/v1/listings?select=*,category:categories(*),images:listing_images(*)&eq(status,active)&eq(is_featured,true)&eq(category_id,$catId)&order(created_at.desc)&limit(6)', 'src/pages/CategoryPage.tsx', 83, 'Public', 'Fetch featured listings for category page'],
  [17, 'listings', 'GET', '/rest/v1/listings?select=id,title,price,status,profile:profiles(full_name)&neq(status,pending)&order(created_at.desc)&limit(500)', 'src/pages/Admin.tsx', 42, 'Admin only', 'Admin fetch non-pending listings'],
  [18, 'listings', 'GET', '/rest/v1/listings?select=id,title,price,location,status,profile:profiles(full_name),images:listing_images(url)&eq(status,pending)&order(created_at.desc)&limit(200)', 'src/pages/Admin.tsx', 56, 'Admin only', 'Admin fetch pending listings awaiting approval'],
  [19, 'listings', 'PATCH', '/rest/v1/listings?eq(id,$id) — update status to active', 'src/pages/Admin.tsx', 72, 'Admin only', 'Admin approve listing'],
  [20, 'listings', 'PATCH', '/rest/v1/listings?eq(id,$id) — update status to inactive', 'src/pages/Admin.tsx', 86, 'Admin only', 'Admin reject listing'],
  [21, 'listings', 'PATCH', '/rest/v1/listings?eq(id,$id) — update status (toggle)', 'src/pages/Admin.tsx', 101, 'Admin only', 'Admin toggle listing status (active/sold/inactive)'],
  [22, 'categories', 'GET', '/rest/v1/categories?select=id,slug', 'src/services/listingService.ts', 27, 'Public', 'Fetch category slugs for counting'],
  [23, 'categories', 'GET', '/rest/v1/categories?select=*', 'src/pages/CreateListing.tsx', 32, 'Public', 'Load categories for listing form'],
  [24, 'categories', 'GET', '/rest/v1/categories?select=*', 'src/pages/EditListing.tsx', 33, 'Public', 'Load categories for edit form'],
  [25, 'categories', 'GET', '/rest/v1/categories?select=*', 'src/pages/Listings.tsx', 44, 'Public', 'Load categories for filter dropdown'],
  [26, 'categories', 'GET', '/rest/v1/categories?select=*&eq(slug,$slug)&single()', 'src/pages/CategoryPage.tsx', 47, 'Public', 'Load single category by slug'],
  [27, 'profiles', 'GET', '/rest/v1/profiles?select=*&eq(id,$userId)&single()', 'src/contexts/AuthContext.tsx', 45, 'Auth required', 'Fetch user profile on auth state change'],
  [28, 'profiles', 'PATCH', '/rest/v1/profiles?eq(id,$userId)', 'src/pages/Profile.tsx', 29, 'Auth required', 'Update own profile (name, phone)'],
  [29, 'profiles', 'GET', '/rest/v1/profiles?select=id,email,full_name,role,created_at&order(created_at.desc)&limit(500)', 'src/pages/Admin.tsx', 29, 'Admin only', 'Admin list all users'],
  [30, 'profiles', 'GET', '/rest/v1/profiles?select=id,full_name,avatar_url,created_at,location,about&eq(id,$id)&single()', 'src/pages/SellerProfile.tsx', 28, 'Public', 'View seller profile'],
  [31, 'favorites', 'GET', '/rest/v1/favorites?select=listing_id&eq(user_id,$userId)', 'src/hooks/useFavorites.ts', 14, 'Auth required', "Load user's favorite listing IDs"],
  [32, 'favorites', 'POST', '/rest/v1/favorites (INSERT {user_id, listing_id})', 'src/hooks/useFavorites.ts', 39, 'Auth required', 'Add listing to favorites'],
  [33, 'favorites', 'DELETE', '/rest/v1/favorites?eq(user_id,$userId)&eq(listing_id,$listingId)', 'src/hooks/useFavorites.ts', 27, 'Auth required', 'Remove listing from favorites'],
  [34, 'listing_images', 'POST', '/rest/v1/listing_images (INSERT)', 'src/pages/CreateListing.tsx', 87, 'Auth required', 'Save image record after upload'],
  [35, 'conversations', 'GET', '/rest/v1/conversations?select=*,(...)&or(buyer_id.eq.$userId,seller_id.eq.$userId)&order(updated_at.desc)&limit(26)', 'src/features/chat/services/conversationService.ts', 10, 'Auth required', 'Fetch paginated conversations for user'],
  [36, 'conversations', 'GET', '/rest/v1/conversations?select=*,(...)&eq(id,$id)&maybeSingle()', 'src/features/chat/services/conversationService.ts', 34, 'Auth required', 'Fetch single conversation by ID'],
  [37, 'conversations', 'GET', '/rest/v1/conversations?select=*,(...)&eq(listing_id,$lid)&eq(buyer_id,$bid)&maybeSingle()', 'src/features/chat/services/conversationService.ts', 45, 'Auth required', 'Find existing conversation'],
  [38, 'conversations', 'POST', '/rest/v1/conversations (INSERT + .select(...).single())', 'src/features/chat/services/conversationService.ts', 54, 'Auth required', 'Create new conversation'],
  [39, 'conversations', 'GET', '/rest/v1/conversations?select=*,(...)&eq(listing_id,$lid)&eq(buyer_id,$bid)&maybeSingle() (retry after 23505)', 'src/features/chat/services/conversationService.ts', 62, 'Auth required', 'Retry fetch after unique violation'],
  [40, 'conversations', 'DELETE', '/rest/v1/conversations?eq(id,$id)', 'src/features/chat/services/conversationService.ts', 78, 'Auth required', 'Delete conversation'],
  [41, 'messages', 'GET', '/rest/v1/messages?select=*,(...)&eq(conversation_id,$cid)&order(created_at.desc)&limit(26)', 'src/features/chat/services/messageService.ts', 22, 'Auth required', 'Fetch paginated messages in conversation'],
  [42, 'messages', 'POST', '/rest/v1/messages (INSERT + .select(...).single())', 'src/features/chat/services/messageService.ts', 80, 'Auth required', 'Send a new message'],
  [43, 'messages', 'PATCH', '/rest/v1/messages?eq(id,$id)&eq(sender_id,$sid) — update content, is_edited, edited_at', 'src/features/chat/services/messageService.ts', 119, 'Auth required', 'Edit own message'],
  [44, 'messages', 'PATCH', '/rest/v1/messages?eq(id,$id)&eq(sender_id,$sid) — soft delete (is_deleted=true)', 'src/features/chat/services/messageService.ts', 129, 'Auth required', 'Delete own message (soft)'],
  [45, 'messages', 'DELETE', '/rest/v1/messages?eq(id,$id)&eq(sender_id,$sid) — hard delete', 'src/features/chat/services/messageService.ts', 139, 'Auth required', 'Delete for everyone'],
  [46, 'messages', 'GET', '/rest/v1/messages?select=id,message,content,created_at&eq(conversation_id,$cid)&eq(is_deleted,false)&ilike(message,%$query%)&order(created_at.desc)&limit(100)', 'src/features/chat/services/messageService.ts', 224, 'Auth required', 'Search messages in conversation'],
  [47, 'messages', 'GET', '/rest/v1/messages?select=*,(...)&eq(id,$id)&maybeSingle()', 'src/features/chat/services/messageService.ts', 201, 'Auth required', 'Fetch single message by ID'],
  [48, 'messages', 'GET', '/rest/v1/messages?select=id,sender_id,message,content,created_at,profile:(...)&eq(id,$mid)&maybeSingle()', 'src/features/chat/services/messageService.ts', 213, 'Auth required', 'Fetch reply message preview'],
  [49, 'messages', 'GET', '/rest/v1/messages?select=id&eq(conversation_id,$cid)&neq(sender_id,$uid)', 'src/features/chat/services/conversationService.ts', 87, 'Auth required', 'Fetch unread message IDs for mark-read'],
  [50, 'message_attachments', 'POST', '/rest/v1/message_attachments (INSERT batch)', 'src/features/chat/services/messageService.ts', 103, 'Auth required', 'Insert attachment rows after sending message'],
  [51, 'message_reads', 'POST', '/rest/v1/message_reads (UPSERT batch)', 'src/features/chat/services/conversationService.ts', 100, 'Auth required', 'Mark messages as read'],
  [52, 'message_reactions', 'POST', '/rest/v1/message_reactions (UPSERT with onConflict)', 'src/features/chat/services/messageService.ts', 149, 'Auth required', 'Add reaction to message'],
  [53, 'message_reactions', 'DELETE', '/rest/v1/message_reactions?eq(message_id,$mid)&eq(profile_id,$pid)&eq(emoji,$e)', 'src/features/chat/services/messageService.ts', 160, 'Auth required', 'Remove own reaction'],
  [54, 'message_reactions', 'GET', '/rest/v1/message_reactions?select=*&eq(message_id,$mid)', 'src/features/chat/services/messageService.ts', 171, 'Auth required', 'Fetch reactions for a message'],
  [55, 'message_reactions', 'GET', '/rest/v1/message_reactions?select=*&in(message_id,...ids)', 'src/features/chat/services/messageService.ts', 183, 'Auth required', 'Batch load reactions for multiple messages'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tablesSheet), 'Database Tables (REST)');

// ============================================================
// SHEET 2: Storage Buckets
// ============================================================
const storageSheet = [
  ['#', 'Bucket', 'Operation', 'Source File', 'Line', 'Auth', 'Description'],
  [1, 'listing-images (public)', 'upload(filePath, file)', 'src/pages/CreateListing.tsx', 80, 'Auth required', 'Upload listing image file'],
  [2, 'listing-images (public)', 'getPublicUrl(filePath)', 'src/pages/CreateListing.tsx', 83, 'Public', 'Get public URL of uploaded image'],
  [3, 'chat-images (private)', 'upload(path, file)', 'src/features/chat/services/attachmentService.ts', 108, 'Auth required', 'Upload chat image'],
  [4, 'chat-images (private)', 'createSignedUrl(path, 604800)', 'src/features/chat/services/attachmentService.ts', 114, 'Auth required', 'Get 7-day signed URL for image'],
  [5, 'chat-files (private)', 'upload(path, file)', 'src/features/chat/services/attachmentService.ts', 108, 'Auth required', 'Upload chat document/file'],
  [6, 'chat-files (private)', 'createSignedUrl(path, 604800)', 'src/features/chat/services/attachmentService.ts', 114, 'Auth required', 'Get 7-day signed URL for file'],
  [7, 'chat-videos (private)', 'upload(path, file)', 'src/features/chat/services/attachmentService.ts', 108, 'Auth required', 'Upload chat video'],
  [8, 'chat-videos (private)', 'createSignedUrl(path, 604800)', 'src/features/chat/services/attachmentService.ts', 114, 'Auth required', 'Get 7-day signed URL'],
  [9, 'chat-audio (private)', 'upload(path, file)', 'src/features/chat/services/attachmentService.ts', 108, 'Auth required', 'Upload voice note'],
  [10, 'chat-audio (private)', 'createSignedUrl(path, 604800)', 'src/features/chat/services/attachmentService.ts', 114, 'Auth required', 'Get 7-day signed URL'],
  [11, 'Dynamic (via BUCKETS map)', 'createSignedUrl(storagePath, 604800)', 'src/features/chat/services/attachmentService.ts', 180, 'Auth required', 'Generic signed URL fetcher by type'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(storageSheet), 'Storage');

// ============================================================
// SHEET 3: RPC Functions
// ============================================================
const rpcSheet = [
  ['#', 'RPC Name', 'Arguments', 'Source File', 'Line', 'Auth', 'Description'],
  [1, 'chat_unread_conversation_ids', 'p_user_id: uuid', 'src/features/chat/services/conversationService.ts', 108, 'Auth required', 'Get set of conversation IDs with unread messages'],
  [2, 'chat_unread_count', 'p_user_id: uuid', 'src/features/chat/services/conversationService.ts', 115, 'Auth required', 'Get total unread message count'],
  [3, 'promote_to_admin', 'target_email TEXT', 'Migrations (00013)', '—', 'Service role', 'Promote user to admin'],
  [4, 'get_user_role', 'target_id UUID', 'Migrations (00013)', '—', 'Service role', "Get user's role"],
  [5, 'handle_new_user', '(trigger)', 'Migrations (00001/00012)', '—', 'Database trigger', 'Auto-create profile on signup'],
  [6, 'chat_is_participant', 'conv_id uuid', 'Migrations (00009)', '—', 'RLS policy', 'Check user is conversation participant'],
  [7, 'chat_user_has_role', 'conv_id uuid, allowed_roles text[]', 'Migrations (00009)', '—', 'RLS policy', 'Check user has allowed role'],
  [8, 'chat_listing_belongs_to_user', 'listing_id uuid, owner_id uuid', 'Migrations (00010)', '—', 'RLS policy', 'Check listing belongs to user'],
  [9, 'populate_conversation_participants', '(trigger)', 'Migrations (00010/00014)', '—', 'Database trigger', 'Auto-populate participants'],
  [10, 'update_conversation_on_message', '(trigger)', 'Migrations (00006)', '—', 'Database trigger', 'Update conversation updated_at on new message'],
  [11, 'create_notification_on_message', '(trigger)', 'Migrations (00006)', '—', 'Database trigger', 'Create notification event from message'],
  [12, 'create_notification_on_offer', '(trigger)', 'Migrations (00006)', '—', 'Database trigger', 'Create notification event from offer'],
  [13, 'set_updated_at', '(trigger)', 'Migrations (00006)', '—', 'Database trigger', 'Generic updated_at setter'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rpcSheet), 'RPC Functions');

// ============================================================
// SHEET 4: Realtime Channels
// ============================================================
const realtimeSheet = [
  ['#', 'Channel', 'Table', 'Events', 'Filter', 'Source File', 'Line', 'Auth', 'Description'],
  [1, 'conversations-updates-{userId}', 'conversations', 'INSERT', 'buyer_id=eq.{userId}', 'src/features/chat/services/realtimeService.ts', 89, 'Auth required', 'Notify on new conversation as buyer'],
  [2, 'conversations-updates-{userId}', 'conversations', 'UPDATE', 'buyer_id=eq.{userId}', 'src/features/chat/services/realtimeService.ts', 94, 'Auth required', 'Notify on conversation update as buyer'],
  [3, 'conversations-updates-{userId}', 'conversations', 'INSERT', 'seller_id=eq.{userId}', 'src/features/chat/services/realtimeService.ts', 99, 'Auth required', 'Notify on new conversation as seller'],
  [4, 'conversations-updates-{userId}', 'conversations', 'UPDATE', 'seller_id=eq.{userId}', 'src/features/chat/services/realtimeService.ts', 104, 'Auth required', 'Notify on conversation update as seller'],
  [5, 'messages-{conversationId}', 'messages', 'INSERT', 'conversation_id=eq.{id}', 'src/features/chat/services/realtimeService.ts', 146, 'Auth required', 'Receive new messages'],
  [6, 'messages-{conversationId}', 'messages', 'UPDATE', 'conversation_id=eq.{id}', 'src/features/chat/services/realtimeService.ts', 151, 'Auth required', 'Receive message edits'],
  [7, 'messages-{conversationId}', 'messages', 'DELETE', 'conversation_id=eq.{id}', 'src/features/chat/services/realtimeService.ts', 156, 'Auth required', 'Receive message deletions'],
  [8, 'reactions-{conversationId}', 'message_reactions', 'INSERT', '(none)', 'src/features/chat/services/realtimeService.ts', 196, 'Auth required', 'Receive new reactions'],
  [9, 'reactions-{conversationId}', 'message_reactions', 'DELETE', '(none)', 'src/features/chat/services/realtimeService.ts', 201, 'Auth required', 'Receive reaction removals'],
  [10, 'message-reads-{userId}', 'message_reads', 'INSERT', 'profile_id=eq.{userId}', 'src/features/chat/services/realtimeService.ts', 228, 'Auth required', 'Notify when own messages are read'],
  [11, 'read-receipts-{conversationId}', 'message_reads', 'INSERT', '(none)', 'src/features/chat/services/realtimeService.ts', 246, 'Auth required', 'Receive read receipts for messages'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(realtimeSheet), 'Realtime');

// ============================================================
// SHEET 5: Auth Endpoints
// ============================================================
const authSheet = [
  ['#', 'Auth Method', 'Source File', 'Line', 'Auth', 'Description'],
  [1, 'supabase.auth.signUp({ email, password, options })', 'src/pages/Register.tsx', 33, 'Public', 'Register new user'],
  [2, 'supabase.auth.signInWithPassword({ email, password })', 'src/pages/Login.tsx', 29, 'Public', 'Sign in with email/password'],
  [3, 'supabase.auth.signOut()', 'src/contexts/AuthContext.tsx', 54, 'Auth required', 'Sign out current user'],
  [4, 'supabase.auth.getSession()', 'src/contexts/AuthContext.tsx', 26, 'Public', 'Check existing session on mount'],
  [5, 'supabase.auth.getSession()', 'src/pages/AuthCallback.tsx', 29, 'Public', 'Verify session after email confirmation'],
  [6, 'supabase.auth.onAuthStateChange(callback)', 'src/contexts/AuthContext.tsx', 36, 'Public', 'Subscribe to auth state changes'],
  [7, 'supabase.auth.resetPasswordForEmail(email, { redirectTo })', 'src/pages/ForgotPassword.tsx', 16, 'Public', 'Send password reset email'],
  [8, 'supabase.auth.updateUser({ password })', 'src/pages/UpdatePassword.tsx', 34, 'Auth required', 'Update password after reset'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(authSheet), 'Auth');

// ============================================================
// SHEET 6: External APIs
// ============================================================
const externalSheet = [
  ['#', 'Provider', 'Method', 'URL', 'Source File', 'Line', 'Auth', 'Description'],
  [1, 'OpenStreetMap Nominatim', 'GET', 'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5&addressdetails=1', 'src/lib/geocode.ts', 12, 'Public (rate-limited)', 'Forward geocode: search locations by text'],
  [2, 'OpenStreetMap Nominatim', 'GET', 'https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&addressdetails=1', 'src/lib/geocode.ts', 32, 'Public (rate-limited)', 'Reverse geocode: get address from coordinates'],
  [3, 'OpenStreetMap (tiles)', 'GET', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 'src/components/LocationPicker.tsx', 166, 'Public', 'Map tile rendering'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(externalSheet), 'External APIs');

// ============================================================
// SHEET 7: Frontend Routes
// ============================================================
const routesSheet = [
  ['#', 'Route', 'Component', 'Auth', 'Source File', 'Line'],
  [1, '/', 'Home', 'Public', 'src/App.tsx', 30],
  [2, '/login', 'Login', 'Public', 'src/App.tsx', 31],
  [3, '/register', 'Register', 'Public', 'src/App.tsx', 32],
  [4, '/auth/callback', 'AuthCallback', 'Public', 'src/App.tsx', 33],
  [5, '/forgot-password', 'ForgotPassword', 'Public', 'src/App.tsx', 34],
  [6, '/update-password', 'UpdatePassword', 'Public', 'src/App.tsx', 35],
  [7, '/listings', 'Listings', 'Public', 'src/App.tsx', 36],
  [8, '/listings/:id', 'ListingDetail', 'Public', 'src/App.tsx', 37],
  [9, '/create', 'CreateListing', 'Auth required', 'src/App.tsx', 38],
  [10, '/edit/:id', 'EditListing', 'Auth required', 'src/App.tsx', 39],
  [11, '/dashboard', 'Dashboard', 'Auth required', 'src/App.tsx', 40],
  [12, '/favorites', 'Favorites', 'Auth required', 'src/App.tsx', 41],
  [13, '/messages', 'MessagesPage', 'Auth required', 'src/App.tsx', 42],
  [14, '/profile', 'Profile', 'Auth required', 'src/App.tsx', 43],
  [15, '/seller/:id', 'SellerProfile', 'Public', 'src/App.tsx', 44],
  [16, '/category/:slug', 'CategoryPage', 'Public', 'src/App.tsx', 45],
  [17, '/admin', 'Admin', 'Admin only', 'src/App.tsx', 46],
  [18, '/access-denied', 'AccessDenied', 'Public', 'src/App.tsx', 47],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(routesSheet), 'Frontend Routes');

// ============================================================
// SHEET 8: Test Coverage & Priority
// ============================================================
const testPlanSheet = [
  ['#', 'Category', 'Endpoint Group', 'Priority', 'Existing Tests', 'Gap', 'Recommendation'],
  [1, 'Auth', 'signUp / signIn / signOut', 'P0', 'E2E login flows exist', 'No signup or password reset tests', 'Add signup E2E test + password reset E2E'],
  [2, 'Auth', 'getSession / onAuthStateChange', 'P0', 'Covered by login tests', '—', 'Covered implicitly'],
  [3, 'Auth', 'resetPasswordForEmail / updateUser', 'P1', 'None', 'Full reset flow untested', 'Add E2E for forgot-password → update-password'],
  [4, 'Listings', 'Browse / Search / Filter', 'P0', 'E2E: listing listing-navigation.spec.ts', 'No search query test, no empty-state test', 'Add search E2E + empty results test'],
  [5, 'Listings', 'Detail + view count increment', 'P1', 'E2E: listing listing-navigation.spec.ts', 'View count increment not verified', 'PATCH views_count test'],
  [6, 'Listings', 'Create (POST)', 'P0', 'E2E: listing create-listing.spec.ts', '—', 'Covered'],
  [7, 'Listings', 'Edit (PATCH)', 'P1', 'None', 'Edit flow not tested', 'Add edit listing E2E'],
  [8, 'Listings', 'Delete (DELETE)', 'P1', 'None', 'Delete flow not tested', 'Add delete listing E2E'],
  [9, 'Listings', 'Admin approve/reject/toggle', 'P1', 'None', 'Admin listing mgmt untested', 'Add admin E2E for approval flows'],
  [10, 'Categories', 'List / Get by slug', 'P1', 'None', 'Category pages not tested', 'Add category browse E2E'],
  [11, 'Profiles', 'View own profile', 'P1', 'None', 'Profile page not tested', 'Add profile view/update E2E'],
  [12, 'Profiles', 'Update profile', 'P1', 'None', 'Profile update not tested', 'Add profile update E2E'],
  [13, 'Profiles', 'Admin list users', 'P2', 'None', 'Admin user list untested', 'Lower priority'],
  [14, 'Profiles', 'View seller profile', 'P1', 'None', 'Seller profile page untested', 'Add seller profile E2E'],
  [15, 'Favorites', 'Add / Remove / List', 'P1', 'None', 'Favorites flow untested', 'Add favorites E2E (toggle heart icon)'],
  [16, 'Chat Conversations', 'List / Fetch / Find-or-Create', 'P0', 'E2E: chat messaging.e2e.spec.ts', '—', 'Covered'],
  [17, 'Chat Conversations', 'Delete conversation', 'P1', 'None', 'Delete conversation untested', 'Add delete conversation E2E'],
  [18, 'Chat Conversations', 'Mark read / Unread count', 'P0', 'E2E: chat messaging.e2e.spec.ts', '—', 'Covered'],
  [19, 'Chat Messages', 'Send / Edit / Soft-delete / Hard-delete', 'P0', 'E2E: chat messaging.e2e.spec.ts', '—', 'Covered (most operations)'],
  [20, 'Chat Messages', 'Search messages', 'P2', 'Not implemented in app', 'Feature does not exist', 'Defer until feature implemented'],
  [21, 'Chat Messages', 'Reactions (add/remove/list)', 'P1', 'None', 'Reactions untested', 'Add reaction E2E'],
  [22, 'Chat Messages', 'Attachments (image/file/voice/video upload)', 'P1', 'Mock: chat messaging.spec.ts (3 tests)', 'No E2E attachment tests', 'Add E2E for file upload in chat'],
  [23, 'Chat Messages', 'Reply-to (fetch reply preview)', 'P1', 'None', 'Reply flow untested', 'Add reply message E2E'],
  [24, 'Storage', 'Upload listing images', 'P1', 'E2E: listing create-listing.spec.ts (partial)', 'Upload itself not directly tested', 'Covered implicitly via create-listing'],
  [25, 'Storage', 'Chat storage (signed URLs)', 'P1', 'None', 'No direct storage tests', 'Covered by attachment tests'],
  [26, 'Realtime', 'Conversation subscriptions', 'P0', 'Mock: chat realtime.spec.ts', 'No E2E realtime tests', 'Covered by mock due to complexity'],
  [27, 'Realtime', 'Message subscriptions', 'P0', 'Mock: chat realtime.spec.ts', 'No E2E realtime tests', 'Covered by mock due to complexity'],
  [28, 'Realtime', 'Reaction subscriptions', 'P1', 'Mock: chat realtime.spec.ts', 'No E2E realtime tests', 'Covered by mock'],
  [29, 'Realtime', 'Read receipt subscriptions', 'P1', 'Mock: chat realtime.spec.ts', 'No E2E realtime tests', 'Covered by mock'],
  [30, 'RPC', 'chat_unread_conversation_ids', 'P0', 'E2E: chat messaging.e2e.spec.ts', '—', 'Covered'],
  [31, 'RPC', 'chat_unread_count', 'P0', 'E2E: chat messaging.e2e.spec.ts', '—', 'Covered'],
  [32, 'External', 'Nominatim geocoding (forward/reverse)', 'P1', 'None', 'Geocoding untested', 'Add API-level mock test'],
  [33, 'External', 'Map tiles rendering', 'P2', 'None', 'Map rendering untested', 'Visual test (low priority)'],
  [34, 'Admin', 'Dashboard (listings, users, approve/reject)', 'P1', 'None', 'Admin functionality untested', 'Add admin E2E suite'],
  [35, 'Admin', 'Toggle listing status', 'P1', 'None', 'Admin toggle untested', 'Part of admin suite'],
  [36, 'Dashboard', "View own listings, delete own listing", 'P1', 'None', 'Dashboard untested', 'Add dashboard E2E'],
  [37, 'Images', 'Upload listing image records', 'P2', 'Covered by create-listing flow', '—', 'Covered implicitly'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(testPlanSheet), 'Test Plan & Coverage');

// ============================================================
// Write file
// ============================================================
const outPath = resolve(ROOT, 'tests/e2e/docs/api-audit.xlsx');
const outDir = dirname(outPath);
import { mkdirSync } from 'fs';
mkdirSync(outDir, { recursive: true });
XLSX.writeFile(wb, outPath);
console.log(`API audit written: ${outPath}`);
