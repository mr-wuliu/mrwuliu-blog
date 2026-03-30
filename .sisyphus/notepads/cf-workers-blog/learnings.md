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
