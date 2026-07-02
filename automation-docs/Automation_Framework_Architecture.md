# Automation Framework Architecture — Valclassifieds

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CI Pipeline                       │
│              (GitHub Actions)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Lint/     │  │ Build    │  │ E2E Tests         │  │
│  │ Typecheck │  │ Vite     │  │ (Playwright)      │  │
│  └──────────┘  └──────────┘  └────────┬─────────┘  │
│                                        │            │
│                               ┌────────▼────────┐   │
│                               │  Allure Report   │   │
│                               └─────────────────┘   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   Test Suite                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │    Auth      │  │   Listings   │  │   Chat   │  │
│  │  Spec Files  │  │  Spec Files  │  │ Spec F.  │  │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │
│         │                  │               │        │
│  ┌──────▼──────────────────▼───────────────▼────┐   │
│  │            Page Object Layer                  │   │
│  │  LoginPage  ListingsPage  ChatPage  Profile  │   │
│  └──────────────────────┬───────────────────────┘   │
│                         │                           │
│  ┌──────────────────────▼───────────────────────┐   │
│  │           Component Object Layer              │   │
│  │  Navbar  ListingCard  MessageComposer  Image  │   │
│  └──────────────────────┬───────────────────────┘   │
│                         │                           │
│  ┌──────────────────────▼───────────────────────┐   │
│  │              Utilities / Helpers              │   │
│  │  apiMocks  testData  fixtures  selectors     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 2. Layer Responsibilities

### Spec Files
- Define test cases using Playwright `test` blocks
- Use Page Objects for page-level interactions
- Use Component Objects for reusable UI snippets
- Organized by feature module: `auth/`, `listings/`, `chat/`, `profile/`, `admin/`

### Page Object Layer
- Each page gets a class (e.g., `LoginPage`, `ListingsPage`)
- Exposes methods for user actions (e.g., `login()`, `searchListings()`)
- Encapsulates selectors and interaction logic
- Located at `tests/e2e/pages/<feature>/`

### Component Object Layer
- Reusable UI components (e.g., `Navbar`, `ListingCard`, `MessageComposer`)
- Methods for component-level interactions
- Located at `tests/e2e/components/`

### Utilities Layer
- Test data factories
- API route mocking (for non-CI local runs)
- Fixture management (user sessions, listings, etc.)
- Common assertion helpers
- Located at `tests/e2e/utils/`

## 3. Configuration Files
- `playwright.config.ts` — global test configuration
- `.env.test` — test environment variables
- `tests/e2e/global-setup.ts` — auth setup before suite
- `tests/e2e/global-teardown.ts` — cleanup after suite

## 4. Data Flow
1. Test script calls Page Object method
2. Page Object uses Playwright locator to find elements
3. Interactions trigger API calls (real Supabase or mocked)
4. Assertions validate UI state changes
5. Screenshots/videos captured on failure
6. Allure annotations attached for reporting
