# Admin Panel Knowledge Base

**Parent:** `../AGENTS.md`

## OVERVIEW

React 18 SPA for blog administration. Vite builds to `../public/admin/`, served as static assets by the Cloudflare Worker.

## STRUCTURE

```
admin/
├── src/
│   ├── pages/        # Route pages (7 files)
│   ├── components/   # Layout, Editor, LangToggle, math/
│   ├── lib/          # api.ts — fetch wrapper
│   ├── i18n/         # i18next with locales/en.json, zh.json
│   ├── App.tsx       # React Router (all routes under Layout)
│   ├── main.tsx      # Entry (BrowserRouter basename="/admin")
│   └── index.css     # Tailwind + math editor + lang toggle styles
├── vite.config.ts    # base: '/admin/', outDir: '../public/admin', proxy /api → :8787
└── package.json      # Separate npm project (NOT a workspace)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add admin page | `src/pages/<Name>.tsx` + `src/App.tsx` | Add `<Route>` under `<Layout>` |
| Modify rich text editor | `src/components/Editor.tsx` | TipTap: Markdown, LaTeX, image upload |
| Add math rendering | `src/components/math/` | TipTap NodeViewRenderer (Block/Inline) |
| Change API calls | `src/pages/*.tsx` directly | Uses `api` from `src/lib/api.ts` |
| Change styling | Tailwind classes inline + `src/index.css` | Black/white brutalist design |
| Add i18n key | `src/i18n/locales/zh.json` + `en.json` | Use `t('key')` via react-i18next |
| Change API client | `src/lib/api.ts` | Fetch wrapper: get/post/put/delete/upload |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `App` | Component | `src/App.tsx` | React Router with 6 routes + catch-all |
| `Layout` | Component | `src/components/Layout.tsx` | Sidebar nav + header + `<Outlet/>` |
| `Editor` | Component | `src/components/Editor.tsx` | TipTap rich text (math, images, links) |
| `api` | Object | `src/lib/api.ts` | HTTP client (get/post/put/delete/upload) |
| `EditPost` | Page | `src/pages/EditPost.tsx` | New + Edit post (detects `isEdit` from `:id`) |

## CONVENTIONS

- **No global state library** — pure useState/useEffect per page
- **API calls** — all via `api` object from `src/lib/api.ts`, never raw `fetch` (except Editor image upload)
- **i18n** — i18next with `react-i18next`, persisted to localStorage key `admin-lang`
- **Design system** — black borders, no border-radius, uppercase tracking-widest labels, opacity for hierarchy
- **NewPost = EditPost** — `/posts/new` renders `<EditPost/>` without `:id`, component detects mode

## ANTI-PATTERNS

- **NEVER** import from `../src/` — admin and Worker are separate projects, no shared code
- **NEVER** edit `../public/admin/` — this is Vite build output, wiped on rebuild
- **NEVER** add a state management library — useState/useEffect is the pattern
- **NEVER** bypass `api` object for HTTP calls — use `src/lib/api.ts` (exception: Editor raw fetch for image upload)

## COMMANDS

```bash
npm run dev          # Vite dev server (proxies /api → :8787)
npm run build        # tsc + vite build → ../public/admin/
```
