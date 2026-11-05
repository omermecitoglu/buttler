# Cache Components & Instant Navigation

> **Next.js version:** 16+ (stabilized in v16.0.0)
> **Status:** Being adopted in this project — see [overview.md](file:///home/omer/Projects/baba/mgmt-panel/ai/overview.md)

## What Are These?

Two tightly coupled features introduced in Next.js 16 that together make client-side navigations feel instant:

- **Cache Components** — a unified config flag that changes how caching and prerendering work. Enables the `"use cache"` directive, Partial Prerendering (PPR) as default, and React's `<Activity>` component for state preservation.
- **Instant Navigation** — the observable outcome. A navigation is "instant" when the browser starts rendering the new page the moment the user clicks, with cached/static content visible immediately and dynamic content streaming in behind `<Suspense>` fallbacks.

---

## Enabling It

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
}
```

Both flags are required together. `partialPrefetching` must be explicitly set (leaving it unset logs a warning). Both will be on by default in the next major version and the options will be removed.

> **Note:** Cache Components requires the Node.js runtime. Routes using `runtime = 'edge'` must be migrated.

---

## Core Concepts

### Static Shell vs. Dynamic Content

With Cache Components, every route automatically gets **Partial Prerendering (PPR)** — Next.js prerenders a **static HTML shell** at build time (or on first request) and serves it immediately, while dynamic content streams into `<Suspense>` fallbacks.

- **Static shell**: content produced by `"use cache"` functions, layouts, and anything that doesn't depend on runtime APIs.
- **Dynamic content**: anything behind a `<Suspense>` boundary that reads `cookies()`, `headers()`, uncached data, or uses `io()` / `navigation()`.

### App Shell vs. Static Shell

- **Static shell**: what you get on an initial page load (hard navigation) — the full prerendered HTML from the CDN.
- **App Shell**: the part of a route that doesn't depend on the URL. Used as the default prefetch for `<Link>` components. Sent to the browser when the user hovers/focuses a link.

### Why Page Loads and Client Navigations Differ

On a **page load**, the full tree renders from the document root — every `<Suspense>` boundary fires.

On a **client navigation** (e.g. `/shop/shoes` → `/shop/hats`), only components *below the shared layout* re-render. A `<Suspense>` in the root layout won't trigger. This is why a route can look instant on first load but block on a client nav — and why these two scenarios must be tested independently.

---

## The `"use cache"` Directive

Mark an async function with `"use cache"` to give its result a cache lifetime. The result is included in the static shell and can be prefetched.

```tsx
async function getFeatured() {
  'use cache'
  return db.products.findFeatured()
}
```

Pair with `cacheLife()` to assign a freshness profile (`'hours'`, `'days'`, etc.) and `cacheTag()` for on-demand invalidation.

---

## Partial Prefetching & `<Link>` Behavior

With `partialPrefetching: true`:

- Every visible `<Link>` automatically prefetches the **App Shell** for its destination.
- Links to the same route share one App Shell request (not one per link).
- `<Link prefetch={true}>` additionally fetches content that depends on that specific link's URL (`params`, `searchParams`).

---

## Navigation Stages

When navigating to a route with Partial Prefetching, content loads in stages:

1. **App Shell prefetch** — triggered by a default `<Link>` becoming visible. Contains URL-independent cached content.
2. **Per-link prefetch** — triggered by `<Link prefetch={true}>`. Resolves URL-dependent cached content (`params`, `searchParams`).
3. **Navigation render** — triggered when the user clicks. Renders the remaining dynamic content.

---

## Three Key Functions

These three functions control *when* content renders relative to prerendering and prefetching. Think of them as a spectrum:

| Function | Excluded from static shell | Excluded from prefetches | Waits for real request |
|---|---|---|---|
| `io()` | ✅ | ❌ (can be cached & prefetched) | ❌ |
| `navigation()` | ✅ | ✅ (App Shell + per-link) | ❌ |
| `connection()` | ✅ | ✅ | ✅ |

### `io()` — `import { io } from 'next/cache'`

Use for synchronous non-deterministic values (`new Date()`, `Math.random()`, `crypto.randomUUID()`, synchronous DB drivers) that should be **excluded from the static shell** but can still be cached and prefetched.

- During prerendering: **suspends** (requires a wrapping `<Suspense>`).
- Inside `"use cache"`, during a real request, or in the browser: **resolves immediately** (no-op).
- In Client Components: use `use(io())` to prevent SSR from capturing the value.

```tsx
async function CurrentTime() {
  await io()
  return <p>{new Date().toISOString()}</p>
}
```

### `navigation()` — `import { navigation } from 'next/cache'`

Use for content that is **expensive to generate and should not be produced during prefetching**, but can still be cached with `"use cache"` and reused across navigations.

- Keeps content out of the App Shell and per-link prefetches.
- Resolves when the user navigates (not waiting for a full server request).
- Content below it can still use `"use cache"` with a lifetime.
- Static prerenders are unaffected — they still include the content.
- Must be called inside a `<Suspense>` boundary.

```tsx
async function Comments({ params }) {
  await navigation() // excluded from prefetch, runs on nav
  const sort = (await cookies()).get('comment-sort')?.value
  const items = await getComments(slug, sort) // can still be cached
  return <CommentList items={items} />
}
```

> **Bonus:** When all reads of `cookies()`, `headers()`, `params`, and `searchParams` sit below `navigation()`, the route's prefetch becomes fully static and can be served from CDN with zero server CPU.

### `connection()` — `import { connection } from 'next/server'`

Use when work **must wait for a real user request** — no caching, no prefetching. Replaces the old `unstable_noStore`.

```tsx
export default async function Page() {
  await connection() // prerendering and prefetching stop here
  const rand = Math.random()
  return <span>{rand}</span>
}
```

---

## Instant Navigation Validation

In development, Cache Components apps automatically validate every Page and Default segment:

- **Dev overlay** surfaces "blocking-route" insights when a navigation would block.
- Each insight shows the offending component and offers fix cards: **Stream** (add `<Suspense>`), **Cache** (add `"use cache"`), or **Block** (opt out with `instant = false`).

To opt a segment out of validation:

```tsx
// app/dashboard/layout.tsx
export const instant = false
```

---

## Testing Instant Navigation

Use `@next/playwright`'s `instant()` helper to write E2E tests that scope assertions to what's *immediately* visible on navigation:

```ts
import { instant } from '@next/playwright'

test('is instant on a client navigation', async ({ page }) => {
  await page.goto('/store/shoes')
  await instant(page, async () => {
    await page.click('a[href="/store/hats"]')
    await page.waitForURL((url) => url.pathname === '/store/hats')
    await expect(page.locator('h1')).toContainText('Baseball Cap')
    // inventory hasn't streamed in yet — assert it's not there
    await expect(page.getByText('In stock')).toHaveCount(0)
  })
  // after instant() scope, dynamic content has streamed in
  await expect(page.getByText('In stock')).toBeVisible()
})
```

---

## Visualizing Loading States

The **Navigation Inspector** in Next.js DevTools lets you pause navigations and inspect the static shell:

- Toggle **Pause on navigations** → the next refresh or link click freezes the page.
- Shows **Page load** (full static shell from CDN) or **Client nav** (App Shell prefetch) separately.
- Pair with React DevTools Suspense panel to see which `<Suspense>` boundary covers which part of the page.

Available when `cacheComponents: true`.

---

## Fix Pattern for a Blocking Route

When a navigation blocks, the typical fix is one or both of:

1. **Move slug/param-dependent work into `<Suspense>`** — extract it into a sub-component so the parent can be static.
2. **Add `"use cache"` to stable data fetches** — so they land in the App Shell.

```tsx
// Before: blocks — uncached fetch at top level
export default async function ProductPage(props) {
  const featured = await getFeatured()   // uncached, blocks
  const { slug } = await props.params    // awaiting params, blocks
  const product = await fetch(`/products/${slug}`).then(r => r.json())
  ...
}

// After: instant
export default async function ProductPage(props) {
  const featured = await getFeatured()   // now cached with "use cache"
  return (
    <div>
      <FeaturedSection items={featured} />
      <Suspense fallback={<p>Loading product...</p>}>
        <ProductInfo params={props.params} />  {/* slug work moved here */}
      </Suspense>
    </div>
  )
}

async function getFeatured() {
  'use cache'
  return fetch('...').then(r => r.json())
}
```

---

## `next/root-params` — Root Layout Parameters (v16.3+)

`next/root-params` provides importable async getter functions for the dynamic segments defined in the **root layout** (e.g. `[locale]`, `[lang]`). These getters can be called from any Server Component in the tree — no prop drilling needed.

```tsx
// app/[locale]/layout.tsx
import { locale } from 'next/root-params'

export default async function RootLayout(props: LayoutProps<'/[locale]'>) {
  return (
    <html lang={await locale()}>
      <body>{props.children}</body>
    </html>
  )
}

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'tr' }]
}
```

> **With Cache Components:** `generateStaticParams` is required in the root layout. Each root parameter must have at least one value or the build fails.

### Why Root Params Are Special for Instant Navigation

Root parameters are the dynamic segments that appear **before** the root layout file. They are:

- **Shared by all routes** under that root layout — every page under `app/[locale]/` has the same `locale` value for a given request.
- **Known at the App Shell level** — they don't vary per page, only per locale. This means they can be resolved as part of the static shell without blocking instant navigation.
- **Safe inside `"use cache"`** — Next.js tracks which root params a cached function reads and includes only those in the cache key. A cached function reading `locale` will have one cache entry per locale, not per every possible deeper route parameter.

```tsx
async function getNavigation() {
  'use cache'
  const language = await locale() // cache key = locale value only
  return fetch(`/api/nav?lang=${language}`).then(r => r.json())
}
```

Compare to regular `params`: you'd have to `await params` outside the cached function and pass the value as an argument. With root params you can call the getter directly inside `"use cache"`.

### How This Applies to `next-intl`

In this project the root layout is at `app/[locale]/`. The `next-intl` functions `getLocale()` and `getTranslations()` are built on top of `next/root-params` — they read the `[locale]` root parameter internally.

This means calling them directly in a page component:

```tsx
const [locale, t] = await Promise.all([
  getLocale(),
  getTranslations("Home"),
])
```

**does not break the static shell or instant navigation**, because:

1. `locale` is a root parameter — it's available at the App Shell level.
2. `getTranslations()` is locale-scoped and effectively cached per locale.
3. Neither call reads per-request APIs like `cookies()` or `headers()` in a way that would force dynamic rendering.

The result (translated strings, locale value) can be used freely in the static part of the page — page titles, skeleton fallback labels passed as props, toolbar content — without wrapping them in `<Suspense>`.

### Restrictions

- Server Components only — cannot be used in Client Components, Server Actions, or Route Handlers (Route Handler support is planned).
- Cannot be used inside `unstable_cache` — use `"use cache"` instead.
- Segment names must be valid JS identifiers — kebab-case like `[post-slug]` is not supported.

---

## Project-Specific Patterns

### API Access at Build Time

The Baba API is not available at build time — the build runs inside an isolated Docker container with no API access. This means any component that calls the API must be excluded from the static prerender.

Before any API data fetch, one of `io()`, `navigation()`, or `connection()` must be called at the top of the component. **Which one to use depends on the specific page** — there is no single blanket rule. Use the decision table below as a guide.

| | Build time | App Shell prefetch | Per-link prefetch | Navigation |
|---|---|---|---|---|
| `io()` | ✅ not called | ⚠️ **called** (resolves immediately) | ⚠️ **called** | ✅ called (cacheable) |
| `navigation()` | ✅ not called | ✅ not called | ✅ not called | ✅ called (cacheable) |
| `connection()` | ✅ not called | ✅ not called | ✅ not called | ✅ called (not cacheable) |

**When to reach for each:**

- **`io()`** — data is stable enough to prefetch and cache. Calling the API during App Shell or per-link prefetches is acceptable and beneficial (data is ready before the user clicks).
- **`navigation()`** — data depends on URL-specific values (e.g. `searchParams`, per-slug params) that vary per link, making App Shell prefetching wasteful or meaningless. Results can still be cached with `"use cache"` after first navigation.
- **`connection()`** — data must be fresh per real request, cannot be cached at all.

### Paginated Pages → Always `navigation()`

Any page that uses `searchParams` for pagination should always use `navigation()` before the API call. The reasoning:

1. The paginated data depends on the current page number — the App Shell prefetch has no way to know which page to load.
2. Prefetching arbitrary page-1 data during App Shell would be misleading (the user might be on page 5).
3. `navigation()` still allows `"use cache"` on the data fetch, so the result is cached and reused by the client-side router after the first visit.

### Pattern: Making a Page Instant

When migrating a page to support instant navigation, the general checklist is:

**1. Remove `export const instant = false`**
Only present if instant navigation was explicitly opted out. Remove it so the dev overlay validates the page again.

**2. Delete `loading.tsx` (or replace it with per-component fallbacks)**
A `loading.tsx` file creates a single coarse `<Suspense>` boundary wrapping the entire page. Replace it with fine-grained `<Suspense>` boundaries around each individual dynamic section.

**3. Move `searchParams` out of the page root**
`searchParams` is per-URL, per-request data. Using it at the top level blocks the entire page from being statically prerendered. Extract it into a child component wrapped in `<Suspense>` so the static parts of the page (title, toolbar, layout chrome) can land in the App Shell.

**4. Choose `io()`, `navigation()`, or `connection()` per component**
Add the appropriate call before each API data fetch. Wrap that component in `<Suspense>` with a meaningful skeleton fallback.

---

## Reference Links

- [cacheComponents config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [Instant Navigation guide](https://nextjs.org/docs/app/guides/instant-navigation)
- [io() API reference](https://nextjs.org/docs/app/api-reference/functions/io)
- [navigation() API reference](https://nextjs.org/docs/app/api-reference/functions/navigation)
- [connection() API reference](https://nextjs.org/docs/app/api-reference/functions/connection)
- [next/root-params API reference](https://nextjs.org/docs/app/api-reference/functions/next-root-params)
