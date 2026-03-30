# Learnings — cf-workers-blog

## 2026-03-30 Planning Phase
- Use Hono framework for CF Workers (14KB, SSR+API+JSX)
- D1 is single-threaded, 100 bound params per query max, 10GB max
- Use bcryptjs (NOT SHA-256) for passwords — works in Workers via WASM
- Use jose for JWT (Workers-compatible, no Node.js crypto)
- JWT expiry: 7 days via setExpirationTime()
- Tiptap (NOT raw ProseMirror) for editor — 80% less boilerplate
- `run_worker_first` + `not_found_handling = "single-page-application"` for hybrid SSR+SPA
- `drizzle-kit generate` then `wrangler d1 migrations apply` (NOT drizzle-kit migrate)
- Serve images through Worker with Cache-Control headers (NOT R2 public bucket)
- Assets binding: `directory = "./public"`, `binding = "ASSETS"`
- Admin SPA outputs to `../public/admin/` for Workers assets binding
- KaTeX `renderToString` for SSR LaTeX rendering (no client JS needed)

## 2026-03-31 Image Service
- `crypto.randomUUID()` available in CF Workers runtime
- R2 `put()` accepts `ArrayBuffer` with `httpMetadata.contentType`
- R2 object has `writeHttpMetadata(headers)` to copy stored metadata to response headers
- R2 object has `etag` property for conditional requests
- Images served through Worker (not R2 public bucket) with `Cache-Control: public, max-age=31536000, immutable`
- D1 has no efficient COUNT(*) — fetching all records for total count is acceptable for small blogs
- `drizzle-orm/d1` import for D1 database initialization
- Schema index errors in `sqliteTable` extraConfig are a drizzle version issue (not blocking)

## 2026-03-31 Task 1: Project Scaffolding
- **Wrangler 3.x doesn't support `run_worker_first` as array** — only boolean. Must use wrangler 4.x for pattern-based `run_worker_first`
- **Wrangler 4.x crashes with empty `database_id = ""`** — even for local dev, needs a non-empty placeholder string like `"local-dev-placeholder"`
- Wrangler 4.78.0 works with `nodejs_compat` flag + Hono without issues
- `database_id` placeholder for local dev: `"local-dev-placeholder"` — replace with real UUID after `wrangler d1 create blog-db`
- `npx wrangler dev --port 8787` successfully starts with D1 + R2 + Assets bindings in local mode
- `src/db/schema.ts` (from Task 2) has drizzle index typing issues — not related to scaffolding

## 2026-03-31 D1 Schema + Drizzle ORM Setup
- Drizzle ORM v0.36.4 `sqliteTable` extraConfig must return `Record<string, ...>` (object), NOT array
  - Wrong: `(table) => [index('x').on(table.y)]` — TypeScript strict mode rejects `IndexBuilder[]` as `SQLiteTableExtraConfig`
  - Right: `(table) => ({ x_idx: index('x').on(table.y) })`
  - Runtime works either way (`Object.values()` used internally), but strict TS only accepts objects
- `drizzle-kit generate` creates `migrations/0000_xxx.sql` + `migrations/meta/` snapshot+journal
- `.unique()` on column definition generates `CREATE UNIQUE INDEX` automatically (no extra config needed)
- `sql\`(datetime('now'))\`` generates `DEFAULT (datetime('now'))` in D1-compatible SQL
- `text('status', { enum: ['draft', 'published'] })` — enum is TypeScript-only hint, SQL still uses `text`
- Foreign keys with `onDelete: 'cascade'` generate `ON DELETE cascade` in migration SQL
- Index naming convention: `{table}_{column}_idx` — explicit names in `index('name')` call

## 2026-03-31 Auth System (bcryptjs + JWT + Login API)
- jose `jwtVerify()` returns `{ payload, protectedHeader }` — must destructure: `const { payload } = await jwtVerify(...)`
- bcryptjs v3.0.3 works with `import bcrypt from 'bcryptjs'` — same API as v2
- jose v6.2.2 `SignJWT`/`jwtVerify` API unchanged from v5
- Login uses direct comparison against env secrets (REVISED APPROACH): `password !== c.env.ADMIN_PASSWORD` — simpler for single-admin model where Workers Secrets store the credential
- `hashPassword`/`verifyPassword` still exported for future D1-based multi-user support
- Hono `setCookie` with `sameSite: 'Strict'` literal works (Hono types accept string)
- `createMiddleware` from `hono/factory` with generic `{ Bindings, Variables }` provides typed context

## 2026-03-31 Task 14: SEO Meta Tags + Open Graph
- SEO component uses constants for SITE_NAME, BASE_URL, DEFAULT_DESCRIPTION — centralized config
- Title format: `{title} | {siteName}` for all pages, except homepage where title === siteName (no duplication)
- URL handling: relative paths (e.g., `/tags/foo`) prepended with BASE_URL in SEO component, not at call site
- Image URL resolution: handles both absolute URLs and relative paths
- Layout passes all SEO props through to SEO component — page components just pass data to Layout
- `description` and `url` props are optional on both Layout and SEO (sensible defaults)
- Only pre-existing tsc error in `src/routes/blog.ts` (`FC.render()` doesn't exist) — not related to SEO changes

## 2026-03-31 Task 11: Homepage SSR + Pagination
- Hono JSX `.tsx` files required for JSX syntax — `.ts` files cannot contain JSX even with `jsxImportSource` configured
- Hono FC components don't have a `.render()` method — use JSX syntax `<Component props />` or call as function `Component({props})`
- `c.html()` accepts JSX elements directly in `.tsx` files, but not in `.ts` files (type mismatch with `HtmlEscapedString`)
- `getPublishedPosts()` returns posts without tags — must call `getPostWithTags()` separately for each post (N+1 acceptable for 10 posts/page)
- Date formatting: `new Date(isoString)` + `getFullYear()/getMonth()/getDate()` for "YYYY年MM月DD日" format
- `app.route('/', blogRoutes)` mounts blog routes at root — homepage `GET /` is defined in blogRoutes
- Removed placeholder `app.get('/', () => c.text('Blog is running'))` replaced with SSR blog homepage

## 2026-03-31 Task 13: Tag Page SSR + RSS Feed
- `src/routes/blog.ts` was renamed to `blog.tsx` by parallel Task 12 — must handle file extension changes
- Hono `.tsx` files can use `<Component props={...} />` JSX syntax with `c.html()` directly — no need for `renderToString` or `.render()`
- Function call syntax `Component({...})` returns `HtmlEscapedString | null` which doesn't match `c.html()` signature — MUST use JSX syntax in `.tsx` route files
- `renderToString` from `hono/jsx/dom/server` is available but unnecessary when using `.tsx` files with JSX syntax
- RSS 2.0 pubDate must be RFC 822 format — `new Date().toUTCString()` produces correct format
- CDATA sections `<![CDATA[...]]>` used for RSS description content to handle special characters
- Tag posts query requires joining postTags → posts with status='published' filter + count query for pagination
- Parallel tasks heavily modify shared files — always re-read before editing

## 2026-03-31 Task 12: Post Detail SSR + LaTeX + Comments
- KaTeX `renderToString(tex, { displayMode, throwOnError: false })` works in Workers runtime
- KaTeX CSS loaded conditionally via layout `type === 'article'` check — only for post detail pages
- LaTeX rendering protects `<code>`, `<pre>`, and HTML tags from processing via placeholder substitution pattern
- Display math `$$...$$` must be matched before inline `$...$` to avoid partial matches
- Hono JSX form attributes: `method` must be lowercase `"post"` (not `"POST"`), `maxlength` expects number not string
- HTML forms send `application/x-www-form-urlencoded` — can't POST directly to JSON API endpoints
- Solution: added a form-handling route `POST /posts/:slug/comments` in blog.tsx that accepts both JSON and form-data
- `c.req.parseBody()` parses form data in Hono; `c.req.json()` parses JSON — check `Content-Type` header to handle both
- TOC generation: regex replace on `<h[234]>` tags to inject `id` attributes, extract plain text by stripping inner HTML
- `InferSelectModel<typeof schema.posts>` from drizzle-orm provides proper TypeScript types for DB rows
- `getPostWithTags()` from queries.ts returns `{ ...post, tags: Tag[] }` — use it instead of manual joins for post+tags

## 2026-03-31 Task 16: Tiptap Editor + Post Create/Edit
- Tiptap `useEditor` hook requires `content` prop as initial HTML string
- `@tiptap/extension-placeholder` uses CSS `::before` pseudo-element on `.is-editor-empty` class — needs Tailwind arbitrary selectors for styling
- Image upload must use raw `fetch` with `FormData`, NOT `api.post()` which sets `Content-Type: application/json`
- `@tiptap/extension-mathematics` depends on `katex` — import `katex/dist/katex.min.css` for rendering
- `tiptap-markdown` installed for future markdown support
- NewPost.tsx is a thin wrapper that renders EditPost without `:id` param — EditPost detects create vs edit mode via `useParams()`
- `slugify()` client-side: keep `\u4e00-\u9fa5` (Chinese chars) alongside alphanumeric and hyphens
- Route split in App.tsx: `/posts/new` → NewPost, `/posts/:id/edit` → EditPost (avoids route param ambiguity)

## 2026-03-31 Task 15: Admin Layout + Auth Guard + Dashboard
- Auth `/api/auth/me` returns `{ authenticated: true, username: string }` (not `{ sub, iat, exp }`)
- Auth `/api/auth/login` returns `{ success: true, username: string }` with httpOnly cookie
- Auth `/api/auth/logout` is `POST` (not GET) — clears cookie
- `api.ts` has auto-401 redirect to `/admin/login` — but AuthGuard handles auth check before that kicks in
- BrowserRouter has `basename="/admin"` so all routes are relative (`/login` not `/admin/login`)
- React Router nested routes: `<Route element={<AuthGuard />}>` renders `<Outlet />` inside AuthGuard, passing user via `useOutletContext<User>()`
- Layout also renders `<Outlet />` for child routes — double nesting: AuthGuard → Layout → Page
- `useOutletContext<T>()` must be typed — Layout reads user from AuthGuard's Outlet context
- Posts API `GET /posts` returns `{ posts: Post[], total: number }` — posts array has raw DB row shape
- Comments API `GET /admin/comments?status=pending&limit=N` returns `{ comments: Comment[], total: number }`
- NewPost.tsx was created by parallel task as thin wrapper around EditPost — App.tsx routes `/posts/new` directly to EditPost as per spec

## 2026-03-31 Task 19: Build Pipeline + Deploy Scripts
- `scripts/build.sh` uses `set -e` for fail-fast behavior — any command failure stops the script
- Admin SPA builds to `../public/admin/` (configured in admin/vite.config.ts) — 61 asset files including KaTeX fonts
- `npm run build` (root) delegates to `cd admin && npm run build` — lightweight wrapper
- `build:deploy` uses `bash scripts/build.sh` for explicit shell invocation (cross-platform safe)
- `deploy` script chains build + env sourcing + wrangler deploy with CF_API_TOKEN env var
- Vite build warning: index chunk is 841KB — consider code-splitting for production optimization
- Root package.json already had most scripts from prior tasks — only `build:deploy` and updated `deploy` were missing
