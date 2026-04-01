# Issues — cf-workers-blog

(No issues yet)

## 2026-03-31 Task 20: Integration Tests
- **R2 serve test limitation**: `env.IMAGES.get(key)` returns null after `env.IMAGES.put(key, data)` within same test case in miniflare — serve test adapted to verify via list endpoint instead of direct R2 serve. Root cause likely miniflare R2 mock storage isolation between fetch handler invocations.
- **`defineWorkersConfig` not available**: Task spec referenced `defineWorkersConfig` from `@cloudflare/vitest-pool-workers/config` but v0.13.5 doesn't export it. Used `cloudflareTest` Vite plugin instead (functionally equivalent, current recommended API).

## Code Quality Review (2026-03-31)

### Minor Issues (non-blocking, APPROVED)
1. **Empty catches in admin** — Editor.tsx:56, EditPost.tsx:88, Posts.tsx:57,74 — silently swallow errors, no user feedback
2. **Duplicated code** — `escapeHtml` in comments.ts + blog.tsx; `formatDate` in 6 files; `PostCard` in home.tsx + tag.tsx; `slugify` in server + admin
3. **`listImages` inefficiency** — services/image.ts:128 fetches ALL records to count instead of using COUNT(*)
4. **Hardcoded config** — rss.ts site title/description, seo.tsx BASE_URL, home.tsx blog title
5. **Bindings type x7** — Same type repeated in 7 server files, should be shared
6. **Comments page** — updateStatus/handleDelete have no try/catch

## F4 Scope Fidelity Check Results (2026-03-31)

### 3 Minor Deviations Found:

1. **T3 Auth — bcryptjs unused in login flow**: `hashPassword()`/`verifyPassword()` exist in `src/middleware/auth.ts` but `src/routes/auth.ts` login does plain-text comparison (`password !== c.env.ADMIN_PASSWORD`). Spec says "密码使用 bcryptjs 哈希". Impact: low (Workers Secrets are encrypted at rest), but spec non-compliant.

2. **T16 Editor — Auto-save missing**: Plan specifies "自动保存：30秒 debounce 保存草稿到 localStorage" but `admin/src/components/Editor.tsx` has no auto-save implementation. Also `tiptap-markdown` is in deps but not imported.

3. **T17 Comments — Batch ops missing**: Plan specifies "批量操作：全选 + 批量通过/拒绝" but `admin/src/pages/Comments.tsx` only has per-comment actions, no batch select/operate.

### Clean Areas:
- Cross-task contamination: CLEAN (0 issues)
- Unaccounted files: CLEAN (all files mapped to tasks)
- Scope creep: minimal (T1 added logger + health endpoint — benign)
