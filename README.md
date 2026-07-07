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
- React Router v6
- Playwright (E2E tests)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (free tier)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/valclassifieds.git
cd valclassifieds

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase project credentials
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (safe for client) |

**Important**: Never commit `.env` or any file containing real secrets. The `.env.example` file is safe to commit.

### Running Locally

```bash
# Start development server
npm run dev

# The app is now available at http://localhost:5173
```

### Database Setup

1. Run all migration files from `supabase/migrations/` in the Supabase Dashboard SQL Editor
2. Configure Supabase Auth settings (see Email Confirmation below)
3. (Optional) Seed the database: `npm run db:seed`

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


## Build

```bash
# Production build
npm run build

# Output in dist/
# TypeScript check runs before Vite build
```

## Deploy to Vercel

The project is configured for Vercel deployment with `vercel.json`. It handles SPA routing (React Router) and static asset caching.

### One-click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Deploy

```bash
npm i -g vercel
vercel
```

### Environment Variables on Vercel

Set these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |

### Post-Deployment

1. Update Supabase Auth Settings:
   - Set **Site URL** to your Vercel deployment URL
   - Add `https://your-domain.vercel.app/auth/callback` to **Redirect URLs**
2. Submit sitemap to Google Search Console
3. Configure custom domain in Vercel Dashboard (optional)

## Testing

### Test Suites

Three test suites are configured:

| Suite | Command | Tests | Description |
|-------|---------|:-----:|-------------|
| Mock | `npm run test:e2e:mock` | 31 | Mocked Supabase (fast, no backend) |
| E2E | `npm run test:e2e:real` | 76 | Against real Supabase backend |
| API | `npm run test:e2e` | 72 | Direct Supabase API contract tests |

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
# Start dev server (required for E2E tests)
npm run dev

# Run mock tests (fast, no backend needed)
npm run test:e2e:mock

# Run real backend tests (requires Supabase)
npm run test:e2e:real

# Run all test suites (mock + e2e + api)
npm run test:e2e
```
