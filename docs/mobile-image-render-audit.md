# Mobile Image Render Audit — Home.tsx Listing Cards

## Problem

On mobile viewports (375px), listing card images rendered at **2154×2130px** — 
6× wider than the viewport. Cards were completely unconstrained, causing horizontal 
overflow, broken layouts, and unprofessional rendering compared to OLX/Facebook Marketplace.

## Rendering Hierarchy

```
<div>                              ← page root
  <section>                       ← bg-gray-50 / py-12
    <div.max-w-7xl.px-4>         ← container (375px on mobile)
      <div.grid.gap-3>           ← CSS Grid (single column on mobile)
        <Link.group>             ← card element  ← ROOT CAUSE: min-width: auto
          <div.relative.aspect-square>  ← image container (aspect-ratio: 1/1)
            <div.absolute.inset-0>
              <img.object-cover> ← listing image
          <div.mt-2>             ← text content (title, location, price)
```

## Component Chain

| Level | Component | Role |
|-------|-----------|------|
| 1 | `Home` | Page shell, SEO, state |
| 2 | `HomeContent` | Fetches data, renders sections |
| 3 | Inline `<Link>` | Card wrapper (NO shared ListingCard component exists) |
| 4 | Inline `<div.relative>` | Image container with aspect-ratio |
| 5 | Inline `<img>` | Raw `<img>` with `object-cover` (NOT OptimizedImage) |

**Note:** Home.tsx uses raw `<img>` directly. All other pages (Listings, CategoryPage, 
Favorites, SellerProfile) use the `<OptimizedImage>` component.

## CSS Chain

### Grid Container
```html
<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
```
- On mobile (<640px): single column (`1fr`)
- On sm (640px+): 2 columns
- On md (768px+): 3 columns
- On lg (1024px+): 4 columns
- On xl (1280px+): 5 columns

### Card Element (BEFORE fix)
```html
<a class="group rounded-xl bg-white p-3 shadow-sm transition hover:shadow-md">
```
- `display: block`
- `min-width: auto` ← **CSS Grid default, NOT overridden**
- `overflow: visible` ← no clipping
- Result: card expands to content intrinsic width

### Card Element (AFTER fix)
```html
<a class="group min-w-0 overflow-hidden rounded-xl bg-white p-3 shadow-sm transition hover:shadow-md">
```
- `min-width: 0px` ← overrides CSS Grid default
- `overflow: hidden` ← clips content to card bounds

### Image Container
```html
<div class="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
```
- `aspect-ratio: 1 / 1` ← enforced square
- `min-width: 0px` ← already correct from Tailwind
- `overflow: hidden` ← clips image

### Image
```html
<img class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
```
- `object-fit: cover` ← fills container without stretching

## Root Cause

**CSS Grid `min-width: auto` on the card element.**

By default, CSS Grid items have `min-width: auto`, which means the item's column will 
expand to fit the item's minimum content size. The `aspect-square` container inherits 
this expansion, causing the image container to grow to the image's intrinsic width. 
Since `overflow: visible` was the default, nothing clipped the overflow.

The `.relative.aspect-square` child already had `min-width: 0` (from Tailwind defaults),
but the parent `<Link>` card did not. The grid algorithm sizes columns based on the 
grid item's minimum size, and the `<Link>` with `min-width: auto` was the bottleneck.

## Before / After — Computed Styles (375px viewport)

### BEFORE

| Property | Grid | Card | Image Container | Image |
|----------|------|------|-----------------|-------|
| width | 343px | **2154.44px** | **2130.44px** | **2130.44px** |
| height | — | **2226.44px** | **2130.44px** | **2130.44px** |
| min-width | — | **auto** | 0px | 0px |
| max-width | none | none | none | 100% |
| aspect-ratio | — | auto | **1 / 1** | auto |
| object-fit | — | — | — | cover |
| overflow | visible | visible | hidden | clip |
| grid-template-columns | **2154.44px** | — | — | — |

### AFTER

| Property | Grid | Card | Image Container | Image |
|----------|------|------|-----------------|-------|
| width | 343px | **343px** | **319px** | **319px** |
| height | — | **415px** | **319px** | **319px** |
| min-width | — | **0px** | 0px | 0px |
| max-width | none | none | none | 100% |
| aspect-ratio | — | auto | **1 / 1** | auto |
| object-fit | — | — | — | cover |
| overflow | visible | **hidden** | hidden | clip |
| grid-template-columns | **343px** | — | — | — |

## Responsive Verification (Post-Fix)

| Viewport | Grid Columns | Card Width | Image Container | Aspect Ratio |
|----------|-------------|------------|-----------------|-------------|
| 375px (iPhone SE) | 343px (1 col) | 343px | 319×319px | 1/1 ✓ |
| 414px (iPhone XR) | 382px (1 col) | 382px | 358×358px | 1/1 ✓ |
| 768px (iPad) | 232px×3 | 232px | 208×208px | 1/1 ✓ |
| 1280px (Desktop) | 233.6px×5 | 233.6px | 209.6×209.6px | 1/1 ✓ |
| 1440px (Wide) | 233.6px×5 | 233.6px | 209.6×209.6px | 1/1 ✓ |

All breakpoints: `object-fit: cover` ✓, `aspect-ratio: 1/1` ✓, no overflow ✓

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Home.tsx:128` | Added `min-w-0 overflow-hidden` to Featured Listings card `<Link>` |
| `src/pages/Home.tsx:195` | Added `min-w-0 overflow-hidden` to Recently Added card `<Link>` |

## Build Status

- TypeScript: PASS (0 errors)
- Production build: PASS (vite build, 5.29s)
- Tests: 579 passed, 1 failed (pre-existing parse error in `securityEngine.test.ts`, unrelated)

## Remaining Notes

- The same `min-w-0` pattern should be applied to listing cards in `Listings.tsx`, 
  `CategoryPage.tsx`, `Favorites.tsx`, and `SellerProfile.tsx` if similar issues are 
  observed on those pages.
- Home.tsx uses raw `<img>` while other pages use `<OptimizedImage>` — consider 
  unifying for WebP optimization and error fallback.
- No ESLint config exists (`eslint.config.js` missing) — pre-existing issue.
