# ValClassifieds Marketplace

A modern classifieds marketplace built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- Authentication with email confirmation
- Post, edit, delete listings
- Search & filters
- Favorites
- Seller dashboard
- Admin panel with role-based access
- Real-time chat messaging


## Tech Stack

- React + Vite
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Storage, Realtime)
- Zustand (state management)
- React Router v6
- Playwright (E2E tests)

## Getting Started

1. Clone repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure Supabase credentials
4. Run database migrations via Supabase Dashboard SQL Editor
5. Configure Supabase Auth settings (see below)
6. Start development server: `npm run dev`
7. Seed the database: `npm run db:seed`

## Email Confirmation

The application requires email confirmation for new user registration.

### Configuration

1. Enable email confirmation in Supabase Dashboard:
   - Go to **Authentication → Settings**
   - Enable **Confirm email** toggle
   - Set **Site URL** to `http://localhost:5173`
   - Add `http://localhost:5173/auth/callback` to **Redirect URLs**

2. Or use the automated script:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_your_token"
npm run setup-supabase
```
Generate an access token at: https://supabase.com/dashboard/account/tokens

### Flow

1. User registers via `/register`
2. Success message: "Account created successfully. Please check your email and click the confirmation link before signing in."
3. User checks email and clicks confirmation link
4. Link redirects to `/auth/callback` which verifies the session
5. User is redirected to `/login?confirmed=true` with a success banner
6. User can now sign in

### Error Messages

| Error | User-Friendly Message |
|-------|----------------------|
| Email already registered | "This email is already registered. Please sign in instead." |
| Password too short | "Password must be at least 6 characters long." |
| Email not confirmed | "Please confirm your email address before signing in." |
| Invalid login credentials | "Invalid email or password. Please try again." |
| Invalid/expired confirmation link | "The confirmation link is invalid or has expired." |
| Already confirmed | "This email has already been confirmed. You can sign in now." |

## Admin Role

The application uses role-based access control with two roles: `user` and `admin`.

### How It Works

- The `role` column in `public.profiles` determines user permissions
- Role is always fetched from Supabase (never client-side only)
- Admin routes are protected by `ProtectedRoute` with `adminOnly` prop
- Non-admin users are redirected to `/access-denied` (403 page) when attempting to access admin routes

### Admin Navigation

Admin users automatically see:
- An **Admin** link in the main navigation bar
- An **Admin Panel** option in the user dropdown menu
- Admin section in the mobile menu

### Security

- **No frontend-only authorization**: The role always comes from the `profiles` table via Supabase
- **Route protection**: `ProtectedRoute` component redirects non-admin users to `/access-denied`
- **Double verification**: The `Admin` component also checks role on mount
- **Existing RLS policies**: All RLS policies are preserved and continue working

### Promoting a User to Admin

**Method 1: Using the promote script**
```bash
npm run promote-admin user@example.com
```

**Method 2: Via SQL in Supabase Dashboard**
```sql
SELECT promote_to_admin('user@example.com');
```

**Method 3: Direct SQL**
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'user@example.com';
```

### Database Migration

The `promote_to_admin()` and `get_user_role()` functions are defined in migration `supabase/migrations/00013_admin_functions.sql`.


## Testing

### Playwright Test Suites

Two test suites are configured:

| Suite | Command | Description |
|-------|---------|-------------|
| Mock | `npm run test:e2e:mock` | 26 tests with mocked Supabase (fast, no backend) |
| Real | `npm run test:e2e:real` | 30+ tests against real Supabase backend |

### Test Coverage

Authentication:
- Login form renders correctly
- Invalid credentials show error
- Email validation prevents empty fields
- Empty password validation
- Navigation to register page
- Email confirmation required error
- Successful login with valid credentials
- Registration form renders
- Already registered email error
- Confirmation success banner

Admin Access (Mock):
- Admin nav link visible for admin users
- Non-admin redirected from /admin
- Admin user can access admin panel

Admin Access (E2E):
- Non-admin user redirected to /access-denied
- 403 page displayed for unauthorized access
- Admin user can access admin panel
- Admin link visible in navigation

Chat:
- Conversation list displayed
- Messages can be sent
- Conversation search works
- Back navigation works

Listings:
- Listing cards displayed
- Search, category, price range filters work
- Empty state shown for no results
- Navigation to listing detail

### Running Tests

```bash
# Start dev server
npm run dev

# Run mock tests only
npm run test:e2e:mock

# Run real backend tests only
npm run test:e2e:real

# Run all tests
npm run test:e2e
```
