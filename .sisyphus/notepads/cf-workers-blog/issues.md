# Issues — cf-workers-blog

(No issues yet)

## 2026-03-31 Task 20: Integration Tests
- **R2 serve test limitation**: `env.IMAGES.get(key)` returns null after `env.IMAGES.put(key, data)` within same test case in miniflare — serve test adapted to verify via list endpoint instead of direct R2 serve. Root cause likely miniflare R2 mock storage isolation between fetch handler invocations.
- **`defineWorkersConfig` not available**: Task spec referenced `defineWorkersConfig` from `@cloudflare/vitest-pool-workers/config` but v0.13.5 doesn't export it. Used `cloudflareTest` Vite plugin instead (functionally equivalent, current recommended API).
