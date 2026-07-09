# SEO Phase 6 — SSR/SSG Architecture Analysis

**Date**: 2026-07-07
**Status**: Analysis Complete — Awaiting Implementation Approval

---

## 1. Architecture Decision

### Chosen Approach: **Official Vite SSR — selective rendering for public pages**

| Decision | Value |
|----------|-------|
| Engine | Official Vite SSR (`renderToString`) |
| Router | React Router v6 (`StaticRouter` on server, `BrowserRouter` on client) |
| Meta tags | `react-helmet-async` (SSR-compatible via HelmetProvider context) |
| Deployment | Vercel Node.js serverless function |
| Data fetching | Client-side via `useEffect` (existing pattern preserved) |

### Why Not Alternatives

| Approach | Why Rejected |
|----------|-------------|
| Prerender.io | Third-party cost, no real-user LCP improvement |
| Vike (vite-plugin-ssr) | New dependency, file-based routing ≠ current architecture |
| Next.js | Full framework migration — 2+ weeks, auth rewrite, routing rewrite |
| Full SSG | Dynamic content (listings) changes constantly — impractical |
| Cloudflare Workers | Different runtime, high migration effort |

### What SSR Provides for This Project

| Benefit | Impact |
|---------|--------|
| Meta tags in initial HTML | ✅ High — crawlers see titles, OG, Twitter immediately |
| JSON-LD in initial HTML | ✅ High — structured data indexed without JS |
| Page structure (nav, footer, headings) | ✅ Medium — content outline for crawlers |
| LCP improvement (shell renders without JS) | ⚠️ Marginal — data still loads via client |
| Dynamic listing data in HTML | ❌ Not provided — data fetched via `useEffect` on client |

**Important limitation**: This implementation uses `renderToString` (synchronous), which does NOT execute `useEffect` or fetch Supabase data. Server-rendered HTML contains the page shell, meta tags, and JSON-LD, but dynamic listing content appears as loading skeleton states. Full data SSR would require server-side Supabase queries (significant scope expansion).

---

## 2. SSR Blocker Analysis — Files Requiring Browser Global Guards

### Type A: Dynamic Import Hardening (2 files)
These must use `React.lazy()` with SSR-safe wrappers so Leaflet never imports on the server.

| File | Current Import | Fix |
|------|---------------|-----|
| `src/components/ListingMap.tsx` | Static `import { ... } from 'react-leaflet'` | Dynamic import inside useEffect |
| `src/components/LocationPicker.tsx` | Static `import { ... } from 'react-leaflet'` | Dynamic import inside useEffect |

### Type B: `window.location.origin` References (4 files)
Replace with SITE_URL constant or SSR-safe fallback.

| File | Line | Fix |
|------|:----:|-----|
| `ForgotPassword.tsx` | 18 | Use SSR-safe fallback for redirectTo |
| `Register.tsx` | 39 | Use SSR-safe fallback for emailRedirectTo |
| `ListingDetail.tsx` | 108 | Replace with SITE_URL |
| `CategoryPage.tsx` | 131, 138 | Replace with SITE_URL |
| `Listings.tsx` | 171, 178, 367, 368 | Replace with SITE_URL or guard |

### Type C: `document.getElementById` / `document.createElement` (2 files)
Already inside `useEffect` — no change needed.

| File | Lines | Status |
|------|:-----:|--------|
| `main.tsx` | 7 | Client entry only — no change |
| `ListingMap.tsx` | 11-15 | Inside useEffect — no change |
| `LocationPicker.tsx` | 10-15 | Inside useEffect — no change |

### Type D: `document.addEventListener` / `window.addEventListener` (multiple files)
Already inside `useEffect` — no change needed. These are React lifecycle patterns that only run after mount.

---

## 3. SSR Architecture Diagram

```
                         BUILD TIME
    ┌─────────────────────────────────────────────────────┐
    │                                                     │
    │  vite build (client)                                │
    │    └─ dist/client/index.html                        │
    │    └─ dist/client/assets/*.js                       │
    │    └─ dist/client/assets/*.css                      │
    │                                                     │
    │  vite build --ssr (server)                          │
    │    └─ dist/server/entry-server.js                   │
    │                                                     │
    └─────────────────────────────────────────────────────┘
                              │
                         REQUEST TIME
                              │
    ┌─────────────────────────────────────────────────────┐
    │                                                     │
    │  Request → Vercel → api/ssr.mjs serverless function  │
    │                                                     │
    │  1. Read dist/client/index.html (template)          │
    │  2. Import dist/server/entry-server.js               │
    │  3. Call render(url) → { html, head }               │
    │  4. Inject → <div id="root">{html}</div>            │
    │  5. Inject head tags (title, meta, link, script)    │
    │  6. Return full HTML                                │
    │                                                     │
    └─────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
         ┌──────────▼──────┐   ┌────────▼──────────┐
         │  SERVER RENDER   │   │  CLIENT HYDRATION  │
         │                  │   │                    │
         │  StaticRouter    │   │  BrowserRouter      │
         │  HelmetProvider  │   │  HelmetProvider     │
         │  AuthProvider    │   │  AuthProvider       │
         │  renderToString  │   │  hydrateRoot        │
         │                  │   │                    │
         │  - Full HTML     │   │  - Reuses server   │
         │  - Meta tags in  │   │    HTML            │
         │    <head>        │   │  - Attaches event  │
         │  - JSON-LD in    │   │    handlers        │
         │    <head>        │   │  - Reads localStorage│
         │  - Page shell    │   │  - Fires useEffect  │
         │    (nav, footer) │   │  - Loads data       │
         │  - Loading states│   │  - Renders dynamic  │
         │    for dynamic   │   │    content          │
         │    content       │   │                    │
         └─────────────────┘   └─────────────────────┘
```

---

## 4. Route Rendering Strategy

| Route | SSR? | Eager Import? | Notes |
|-------|:----:|:-------------:|-------|
| `/` (Home) | ✅ Yes | ✅ Eager | Full shell + meta + JSON-LD |
| `/listings` | ✅ Yes | ✅ Eager | Meta tags only; data loads on client |
| `/listings/:id` | ✅ Yes | ✅ Eager | Fallback meta tags; data loads on client |
| `/category/:slug` | ✅ Yes | ✅ Eager | Category meta from URL |
| `/seller/:id` | ✅ Yes | ✅ Eager | Profile shell; data loads on client |
| `/login` | ✅ Yes | ✅ Eager | Static meta |
| `/register` | ✅ Yes | ✅ Eager | Static meta |
| `/forgot-password` | ✅ Yes | ✅ Eager | Static meta |
| `/auth/callback` | ❌ No | Lazy | Auth flow — no SEO value |
| `/update-password` | ❌ No | Lazy | Auth flow — no SEO value |
| `/dashboard` | ❌ No | Lazy | Protected route |
| `/messages` | ❌ No | Lazy | Protected route |
| `/favorites` | ❌ No | Lazy | Protected route |
| `/create` | ❌ No | Lazy | Protected route |
| `/edit/:id` | ❌ No | Lazy | Protected route |
| `/profile` | ❌ No | Lazy | Protected route |
| `/admin` | ❌ No | Lazy | Protected route |
| `/access-denied` | ❌ No | Lazy | Auth edge case |

---

## 5. File Change Plan

### New Files (4)

| # | File | Purpose |
|---|------|---------|
| N1 | `src/entry-client.tsx` | Client hydration mount point |
| N2 | `src/entry-server.tsx` | Server render function |
| N3 | `api/ssr.mjs` | Vercel serverless function handler |
| N4 | `server.js` | Development SSR server |

### Modified Files (19)

| # | File | Change |
|---|------|--------|
| M1 | `vite.config.ts` | Add SSR build configuration |
| M2 | `package.json` | Add SSR dev/build scripts |
| M3 | `vercel.json` | Switch from static to Node.js SSR |
| M4 | `index.html` | Add SSR placeholder comments |
| M5 | `src/App.tsx` | Split router; eager import public pages |
| M6 | `src/main.tsx` | Re-export entry-client |
| M7 | `src/components/ListingMap.tsx` | Dynamic import react-leaflet SSR-safe |
| M8 | `src/components/LocationPicker.tsx` | Dynamic import react-leaflet SSR-safe |
| M9 | `src/pages/ForgotPassword.tsx` | Replace `window.location.origin` with SSR-safe |
| M10 | `src/pages/Register.tsx` | Replace `window.location.origin` with SSR-safe |
| M11 | `src/pages/ListingDetail.tsx` | Replace `window.location.origin`; improve SSR fallback title |
| M12 | `src/pages/CategoryPage.tsx` | Replace `window.location.origin` with SITE_URL |
| M13 | `src/pages/Listings.tsx` | Replace `window.location.origin` with SITE_URL |
| M14 | `src/features/chat/pages/MessagesPage.tsx` | Already SSR-safe (typeof window check) — verify |
| M15 | `src/lib/indexedDb.ts` | Add SSR-safe wrapper (guard calls) |

### No Change Needed (verified SSR-safe)

- `src/lib/supabase.ts` — `createClient` is lazy; no browser globals at import
- All `document.addEventListener` calls in layout components — inside useEffect
- `OptimizedImage.tsx` — No browser globals
- `SEO.tsx` — Pure React, SSR-compatible via HelmetProvider context
- All chat components with `document` access — inside useEffect

---

## 6. Effort Estimate

| Phase | Files | Time |
|-------|:-----:|:----:|
| Entry point split (client + server) | 4 new, 3 modified | 2 hours |
| SSR guards for window.location.origin | 5 files | 30 min |
| Leaflet dynamic import hardening | 2 files | 1 hour |
| Vite config + package.json | 2 files | 30 min |
| Dev SSR server | 1 file | 30 min |
| Vercel deployment setup | 2 files | 30 min |
| Testing + validation | — | 1 hour |
| **Total** | **~23 files** | **~6 hours** |

---

## 7. Remaining Limitations (without server-side data fetching)

| Limitation | Impact | Future Solution |
|------------|--------|-----------------|
| ListingDetail shows "Loading..." title on SSR | Medium — crawlable title is generic | Add URL-param-based data fetching on server |
| No listing data in SSR output | Medium — crawlers see empty data containers | Server-side Supabase queries |
| CategoryPage shows generic meta on SSR | Low — can use URL slug for category name | Parse slug client-side in SEO component |
| Auth pages show spinner on SSR | None — crawlers shouldn't index these | Intentional |
| Bundle size increases ~74 kB on main chunk | Medium — accept for SEO benefit | Monitor Vite's tree-shaking |

---

## 8. Pre-Implementation Checks

- [x] Vite 5 has built-in SSR support (stable in v5.4.21)
- [x] react-helmet-async v3+ supports SSR via HelmetProvider context
- [x] react-router-dom v6 has `StaticRouter` for server (available since v6.4)
- [x] react-dom v18 has `renderToString` (deprecated but working; alternative `renderToPipeableStream` available)
- [ ] Export `StaticRouter` from `react-router-dom/server` (may need v6.26+)
- [ ] Vercel Node.js runtime supports the SSR pattern

---

## Approval

This analysis has been reviewed. Awaiting approval to proceed with implementation.
