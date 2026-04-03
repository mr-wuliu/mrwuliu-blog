# Worker Backend Knowledge Base

**Parent:** `../AGENTS.md`

## OVERVIEW

Cloudflare Worker serving SSR public site + REST API. Hono framework, hono/jsx for views, Drizzle ORM for D1, R2 for images.

## STRUCTURE

```
src/
├── index.ts         # Hono app entry — routes, security headers, CORS (inline middleware)
├── db/              # Schema (7 tables), queries, connection factory
├── routes/          # 7 route files — blog.tsx (SSR) + 6 API modules
├── views/           # 10 SSR views + 3 shared components
├── services/        # image.ts — R2 upload/serve/delete
├── utils/           # latex, rate-limit, rss, sitemap, slugify
├── i18n/            # Custom zh/en with t(), langPath(), formatDateLang()
├── middleware/       # EMPTY — middleware is inline in index.ts
└── styles/          # EMPTY — styles are Tailwind inline in JSX
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add SSR page | `views/<name>.tsx` + `routes/blog.tsx` | Register in `createBlogRouter()` for both zh and en |
| Add REST endpoint | `routes/<resource>.ts` | Export Hono sub-router, mount in `index.ts` |
| Add DB table | `db/schema.ts` → `npx drizzle-kit generate` | Also add queries in `db/queries.ts` if needed |
| Add i18n key | `i18n/locales/zh.ts` + `en.ts` | Use `t(lang, 'key')` server-side, `__t('key')` client-side |
| Add shared component | `views/components/<name>.tsx` | hono/jsx FC, import in layout or views |
| Add utility | `utils/<name>.ts` | Self-contained, import where needed |
| Change security headers | `index.ts` lines 21-31 | Inline middleware on `app.use('*', ...)` |
| Change CORS | `index.ts` lines 33-51 | Scoped to `/api/*` |

## CODE MAP

### Dependency Flow
```
index.ts (entry)
├── routes/blog.tsx ──→ db, i18n, utils (latex,rss,sitemap,rate-limit), views/*
├── routes/posts.ts ──→ db, utils/slugify
├── routes/tags.ts ──→ db, utils/slugify
├── routes/comments.ts ──→ db, utils/rate-limit
├── routes/images.ts ──→ services/image
├── routes/projects.ts ──→ db
└── routes/site-config.ts ──→ db

views/* ──→ i18n (every view), views/layout.tsx, views/components/*
services/image.ts ──→ db/schema
utils/rate-limit.ts ──→ db/schema
```

### Key Symbols

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `app` | Hono | `index.ts:17` | Root app, mounts all sub-routers |
| `Bindings` | Type | `index.ts:11` | D1 + R2 + ASSETS + secrets |
| `createDb()` | Fn | `db/index.ts:4` | `drizzle(d1, { schema })` — ALWAYS use this |
| `Database` | Type | `db/index.ts:8` | `ReturnType<typeof createDb>` |
| `posts` | Table | `db/schema.ts:5` | Posts (status, slug, hidden, pinned, coverImageKey) |
| `tags` | Table | `db/schema.ts:26` | Tags (name, slug) |
| `postTags` | Table | `db/schema.ts:34` | Post↔Tag junction (cascade delete) |
| `comments` | Table | `db/schema.ts:43` | Comments (pending/approved/rejected) |
| `images` | Table | `db/schema.ts:58` | R2 object tracker (r2Key, mimeType, sizeBytes) |
| `siteConfig` | Table | `db/schema.ts:68` | Key-value site settings |
| `projects` | Table | `db/schema.ts:75` | Project cards (sortOrder, status) |
| `postLikes` | Table | `db/schema.ts:91` | Post likes (fingerprint-based, unique per post) |
| `rateLimits` | Table | `db/schema.ts:101` | Rate limiting (ip + action + timestamp) |
| `createBlogRouter()` | Fn | `routes/blog.tsx:32` | Creates zh/en router pair — all SSR routes |
| `Layout` | Component | `views/layout.tsx` | Base HTML shell (header, nav, footer, sidebar) |
| `renderLatex()` | Fn | `utils/latex.ts:29` | TipTap data attrs + fallback $$ delimiters → KaTeX HTML |
| `generateToc()` | Fn | `utils/latex.ts:91` | Extracts h2-h4 headings, adds IDs |
| `checkRateLimit()` | Fn | `utils/rate-limit.ts:6` | D1-backed: count actions by IP in time window |
| `slugify()` | Fn | `utils/slugify.ts:1` | URL-safe slug (supports CJK via \u4e00-\u9fa5) |
| `generateUniqueSlug()` | Fn | `utils/slugify.ts:11` | slugify + 6-char UUID suffix |
| `t()` | Fn | `i18n/index.ts:8` | Dot-notation key lookup: `t('zh', 'nav.writings')` |
| `langPath()` | Fn | `i18n/index.ts:29` | Prepends `/en` for English, unchanged for Chinese |

## CONVENTIONS

- **Route pattern** — each file creates `new Hono<{ Bindings: Bindings }>()`, exports it, mounted via `app.route()` in index.ts
- **DB in handlers** — always `const db = createDb(c.env.DB)` at handler start
- **IDs** — `crypto.randomUUID()` for all entities, no auto-increment
- **Timestamps** — `datetime('now')` in D1 defaults, `new Date().toISOString()` in app code
- **Validation** — Zod schemas via `@hono/zod-validator` on API POST/PUT (see `routes/posts.ts`)
- **SSR rendering** — `c.html(<ViewComponent lang={lang} ... />)` in blog routes
- **i18n routing** — `blogRoutes.route('/', createBlogRouter('zh'))` and `blogRoutes.route('/en', createBlogRouter('en'))`
- **Client-side i18n** — layout.tsx embeds flat JSON + `__t()` / `__applyLang()` inline scripts
- **LaTeX** — TipTap stores as `<div data-latex="..." data-type="block-math">`, `renderLatex()` converts to KaTeX

## ANTI-PATTERNS

- **NEVER** use React here — views use `hono/jsx` (`jsxImportSource: "hono/jsx"`)
- **NEVER** instantiate `drizzle()` directly — use `createDb(c.env.DB)`
- **NEVER** put middleware in `middleware/` — it's inline in `index.ts` (directory exists but is empty)
- **NEVER** add CSS files — use Tailwind inline in view JSX
- **NEVER** use auto-increment IDs — always `crypto.randomUUID()`
