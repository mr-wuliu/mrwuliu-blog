# Cloudflare Workers Blog — mrwuliu.top

## TL;DR

> **Quick Summary**: 在 Cloudflare Workers 上从零搭建一个完整的博客平台，包含 Hono SSR 公开页面、React SPA 管理后台（Tiptap/ProseMirror 编辑器）、D1 数据库、R2 图片存储、读者评论系统、RSS、标签系统和 LaTeX 渲染。
> 
> **Deliverables**:
> - 完整的博客系统，部署到 mrwuliu.top
> - 公开页面 SSR（首页、文章详情、标签页、RSS）
> - 管理后台 SPA（文章 CRUD、评论审核、图片上传）
> - Tiptap 编辑器（ProseMirror 内核，Typora 体验）
> - 读者评论系统（管理员审核）
> - LaTeX 公式渲染（KaTeX）
> - R2 图片上传与管理
> - RSS 订阅源
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Task 1 → Task 6 → Task 12 → Task 16 → Task 19 → Final

---

## Context

### Original Request
在 Cloudflare Workers 上搭建博客系统，包含博客内容编辑功能。域名为 mrwuliu.top。CF_API_TOKEN 已在 .env 中配置。

### Interview Summary
**Key Discussions**:
- 内容编辑格式：类似 Typora 的体验，使用 ProseMirror 集成
- 用户系统：单人管理 + 读者评论（管理员审核后显示）
- 渲染方式：混合模式 — 公开页面 SSR，管理后台 SPA
- 图片存储：Cloudflare R2
- 额外功能：RSS 订阅、标签系统、LaTeX 公式渲染
- 样式风格：极简风（干净简洁、内容为主、大量留白）
- 测试策略：Tests-after

### Research Findings
- **Rin (⭐2555)**: Hono + D1 + R2 + React SPA 单 Worker 架构，但为纯 SPA 无 SSR（SEO 差）
- **SonicJS (⭐1500)**: Hono + D1 + R2 + HTMX，插件系统
- 两者均使用 Drizzle ORM 操作 D1
- D1 为单线程，需加索引，每查询最多 100 绑定参数
- `run_worker_first` + `not_found_handling = "single-page-application"` 是混合架构关键配置
- **Tiptap**（基于 ProseMirror）比原生 ProseMirror 开发效率高 80%，推荐使用

### Metis Review
**Identified Gaps** (addressed):
- 密码哈希必须使用 bcryptjs（非 SHA-256）
- JWT 必须设置过期时间（7 天）
- 图片需通过 Worker 代理并提供缓存头
- 使用 `wrangler d1 migrations apply`（非 `drizzle-kit migrate`）
- 批量数据库操作需分块（≤100 参数）
- 公开页面 SSR / 管理 SPA 的路由边界需明确

---

## Work Objectives

### Core Objective
在 Cloudflare Workers 上构建一个完整的博客平台，支持文章发布与管理、读者评论、图片上传，通过混合架构（SSR + SPA）兼顾 SEO 和管理体验。

### Concrete Deliverables
- `src/` — Hono Worker 服务端代码（API + SSR）
- `admin/` — React SPA 管理后台源码
- `public/` — 构建后的管理后台静态资源（Workers assets binding）
- `migrations/` — D1 数据库迁移文件
- `wrangler.toml` — Workers 部署配置（D1 + R2 + 自定义域名）
- 部署到 mrwuliu.top 的完整可用博客

### Definition of Done
- [ ] `wrangler deploy` 成功部署
- [ ] mrwuliu.top 可访问博客首页
- [ ] 管理员可登录并发布文章
- [ ] 文章详情页正确渲染 LaTeX 公式
- [ ] 图片可上传到 R2 并在文章中显示
- [ ] 读者可提交评论，管理员可审核
- [ ] RSS 订阅源可正常访问 (/feed.xml)
- [ ] 标签页可正常浏览

### Must Have
- Hono 框架 + JSX SSR（公开页面）
- React SPA 管理后台（Vite 构建）
- D1 + Drizzle ORM（数据库）
- R2（图片存储）
- Tiptap 编辑器（ProseMirror 内核，Typora 体验）
- JWT + bcryptjs 认证
- 评论系统（管理员审核）
- RSS 订阅源
- 标签系统
- LaTeX 渲染（KaTeX）
- 极简 CSS 设计
- 基础 SEO（meta tags、Open Graph）
- 自定义域名 mrwuliu.top

### Must NOT Have (Guardrails)
- **不使用** SHA-256 哈希密码（必须用 bcryptjs）
- **不使用** 无过期时间的 JWT（必须设置 7 天过期）
- **不复制** Rin 的纯 SPA 路由模式（公开页面必须 SSR）
- **不使用** `drizzle-kit migrate`（必须用 `wrangler d1 migrations apply`）
- **不暴露** R2 公共 bucket（图片必须通过 Worker 代理）
- **不添加** 多用户系统
- **不添加** OAuth 第三方登录（首版）
- **不添加** 评论通知推送
- **不添加** 暗色模式（首版）
- **不添加** 全文搜索
- **不使用** `as any` / `@ts-ignore` / 空 catch / console.log 生产代码
- **不添加** 过度注释或过度抽象

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO（新项目）
- **Automated tests**: Tests-after
- **Framework**: vitest（Worker 环境兼容性好）
- **Setup task**: Task 20 包含测试基础设施搭建

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/Admin UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **SSR Pages**: Use Playwright — Verify rendered HTML, meta tags, content
- **Database**: Use Bash (wrangler d1 execute) — Verify data in D1

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 5 tasks, ALL parallel, no dependencies):
├── Task 1:  Project scaffolding + wrangler config + Hono setup [quick]
├── Task 2:  D1 schema + Drizzle ORM + migrations [deep]
├── Task 3:  Auth system (bcryptjs + JWT + login API) [deep]
├── Task 4:  Admin SPA scaffold (Vite + React + Router + Tailwind) [visual-engineering]
└── Task 5:  R2 image storage service [quick]

Wave 2 (Core APIs — 4 tasks, parallel, depend on Wave 1):
├── Task 6:  Blog post CRUD API (depends: 1, 2, 3) [deep]
├── Task 7:  Tag system API (depends: 2, 3) [unspecified-high]
├── Task 8:  Comment system API + moderation (depends: 2, 3) [unspecified-high]
└── Task 9:  Image upload/serve API routes (depends: 3, 5) [unspecified-high]

Wave 3 (Public Blog SSR — 5 tasks, parallel, depend on Wave 2):
├── Task 10: Blog layout + minimalist CSS design (depends: 1) [visual-engineering]
├── Task 11: Homepage SSR + pagination (depends: 6, 10) [unspecified-high]
├── Task 12: Post detail SSR + LaTeX + comments (depends: 6, 8, 10) [deep]
├── Task 13: Tag page SSR + RSS feed (depends: 7, 10) [unspecified-high]
└── Task 14: SEO meta tags + Open Graph (depends: 11, 12, 13) [quick]

Wave 4 (Admin SPA Features — 4 tasks, parallel, depend on Wave 2+3):
├── Task 15: Admin layout + auth guard + dashboard (depends: 4, 6, 8) [visual-engineering]
├── Task 16: Tiptap editor + post create/edit (depends: 4, 9, 15) [deep]
├── Task 17: Comment moderation page (depends: 4, 8, 15) [unspecified-high]
└── Task 18: Post list + management page (depends: 4, 6, 15) [unspecified-high]

Wave 5 (Deploy + Tests — 2 tasks):
├── Task 19: Build pipeline + deploy + custom domain (depends: all) [deep]
└── Task 20: Integration tests (depends: all) [unspecified-high]

Wave FINAL (Verification — 4 tasks, parallel):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + playwright)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 6 → Task 12 → Task 16 → Task 19 → Final
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 6, 10 | 1 |
| 2 | — | 6, 7, 8 | 1 |
| 3 | — | 6, 7, 8, 9 | 1 |
| 4 | — | 15, 16, 17, 18 | 1 |
| 5 | — | 9 | 1 |
| 6 | 1, 2, 3 | 11, 12, 15, 18 | 2 |
| 7 | 2, 3 | 13 | 2 |
| 8 | 2, 3 | 12, 15, 17 | 2 |
| 9 | 3, 5 | 16 | 2 |
| 10 | 1 | 11, 12, 13, 14 | 3 |
| 11 | 6, 10 | 14 | 3 |
| 12 | 6, 8, 10 | 14 | 3 |
| 13 | 7, 10 | 14 | 3 |
| 14 | 11, 12, 13 | — | 3 |
| 15 | 4, 6, 8 | 16, 17, 18 | 4 |
| 16 | 4, 9, 15 | 19 | 4 |
| 17 | 4, 8, 15 | 19 | 4 |
| 18 | 4, 6, 15 | 19 | 4 |
| 19 | all | 20 | 5 |
| 20 | 19 | Final | 5 |

### Agent Dispatch Summary

- **Wave 1**: **5** — T1→`quick`, T2→`deep`, T3→`deep`, T4→`visual-engineering`, T5→`quick`
- **Wave 2**: **4** — T6→`deep`, T7→`unspecified-high`, T8→`unspecified-high`, T9→`unspecified-high`
- **Wave 3**: **5** — T10→`visual-engineering`, T11→`unspecified-high`, T12→`deep`, T13→`unspecified-high`, T14→`quick`
- **Wave 4**: **4** — T15→`visual-engineering`, T16→`deep`, T17→`unspecified-high`, T18→`unspecified-high`
- **Wave 5**: **2** — T19→`deep`, T20→`unspecified-high`
- **FINAL**: **4** — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

### Wave 1 — Foundation

- [x] 1. Project Scaffolding + Wrangler Config + Hono Setup

  **What to do**:
  - 初始化 package.json，安装核心依赖：`hono`, `drizzle-orm`, `bcryptjs`, `jose`
  - 安装开发依赖：`wrangler`, `typescript`, `@cloudflare/workers-types`, `drizzle-kit`, `vitest`
  - 创建 `tsconfig.json`（配置 JSX: "react-jsx", types: ["@cloudflare/workers-types"]）
  - 创建 `wrangler.toml` 配置：
    ```toml
    name = "blog"
    main = "src/index.ts"
    compatibility_date = "2024-12-01"
    compatibility_flags = ["nodejs_compat"]
    
    [[d1_databases]]
    binding = "DB"
    database_name = "blog-db"
    database_id = ""  # Task 19 填入
    
    [[r2_buckets]]
    binding = "IMAGES"
    bucket_name = "blog-images"
    
    [assets]
    directory = "./public"
    binding = "ASSETS"
    not_found_handling = "single-page-application"
    run_worker_first = ["/api/*", "/posts/*", "/tags/*", "/feed.xml", "/images/*"]
    
    [[routes]]
    pattern = "mrwuliu.top"
    custom_domain = true
    ```
  - 创建 `src/index.ts` — Hono 应用入口，定义 `Bindings` 类型（DB: D1Database, IMAGES: R2Bucket, ASSETS: Fetcher, JWT_SECRET: string, ADMIN_USERNAME: string, ADMIN_PASSWORD: string）
  - 创建基础路由结构：`/` → 占位响应，`/api/*` → 占位
  - 创建 `drizzle.config.ts`
  - 配置 npm scripts：`dev`, `build`, `deploy`, `db:generate`, `db:migrate:local`, `db:migrate:prod`

  **Must NOT do**:
  - 不安装 `@remix-run/*` 或 `next` 等非 Hono 框架
  - 不在 wrangler.toml 中硬编码密码（使用 Workers Secrets）
  - 不使用 `as any` 类型断言

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 主要是配置文件和脚手架，无复杂逻辑
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 纯配置，无 UI 设计需求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 6, 10
  - **Blocked By**: None (can start immediately)

  **References**:
  **Pattern References**:
  - Rin 项目的 `wrangler.toml` — Worker + D1 + R2 + assets 配置模式
  - Hono 官方 Cloudflare Workers 模板 — 入口文件结构

  **API/Type References**:
  - `@cloudflare/workers-types` — D1Database, R2Bucket, Fetcher 类型定义
  - Hono `Bindings` 类型模式 — `new Hono<{ Bindings: Bindings }>()`

  **External References**:
  - Hono Cloudflare Workers 指南: https://hono.dev/docs/getting-started/cloudflare-workers
  - Wrangler 配置文档: https://developers.cloudflare.com/workers/wrangler/configuration/
  - Assets binding: https://developers.cloudflare.com/workers/static-assets/

  **WHY Each Reference Matters**:
  - wrangler.toml 的 `run_worker_first` + `not_found_handling` 配置是混合 SSR + SPA 架构的关键
  - Hono Bindings 类型确保 D1/R2 访问的类型安全
  - Assets binding 让 Worker 同时服务静态资源和动态内容

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Hono dev server starts successfully
    Tool: Bash (interactive via pty)
    Preconditions: package.json installed, src/index.ts exists
    Steps:
      1. Run `npx wrangler dev --port 8787`
      2. Wait for "Ready on http://localhost:8787"
      3. Run `curl -s http://localhost:8787/` in another terminal
    Expected Result: HTTP 200 with placeholder response
    Failure Indicators: Process exits, port binding error, TypeScript compilation error
    Evidence: .sisyphus/evidence/task-1-dev-server.txt

  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: tsconfig.json configured
    Steps:
      1. Run `npx tsc --noEmit`
    Expected Result: Exit code 0, no type errors
    Failure Indicators: Type errors in output
    Evidence: .sisyphus/evidence/task-1-tsc.txt

  Scenario: Wrangler config is valid
    Tool: Bash
    Preconditions: wrangler.toml exists
    Steps:
      1. Run `npx wrangler dev --port 8788` briefly to validate config loads
    Expected Result: Config parsed without errors, Worker starts
    Failure Indicators: Config parse error, binding error
    Evidence: .sisyphus/evidence/task-1-config.txt
  ```

  **Commit**: YES
  - Message: `feat: init project scaffolding with Hono + Wrangler`
  - Files: `package.json, tsconfig.json, wrangler.toml, src/index.ts, drizzle.config.ts`

- [x] 2. D1 Database Schema + Drizzle ORM + Migrations

  **What to do**:
  - 创建 `src/db/schema.ts` — Drizzle ORM schema 定义：
    ```typescript
    // posts 表
    posts = sqliteTable('posts', {
      id: text('id').primaryKey(),           // crypto.randomUUID()
      title: text('title').notNull(),
      slug: text('slug').notNull().unique(),
      content: text('content').notNull().default(''),
      excerpt: text('excerpt').notNull().default(''),
      coverImageKey: text('cover_image_key'), // R2 key
      status: text('status').notNull().default('draft'), // 'draft' | 'published'
      publishedAt: text('published_at'),
      createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
      updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
    })
    
    // tags 表
    tags = sqliteTable('tags', {
      id: text('id').primaryKey(),
      name: text('name').notNull().unique(),
      slug: text('slug').notNull().unique(),
      createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    })
    
    // post_tags 关联表
    postTags = sqliteTable('post_tags', {
      postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
      tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    })
    
    // comments 表
    comments = sqliteTable('comments', {
      id: text('id').primaryKey(),
      postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
      authorName: text('author_name').notNull(),
      authorEmail: text('author_email'),
      content: text('content').notNull(),
      status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
      createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    })
    
    // images 表（追踪 R2 中的图片）
    images = sqliteTable('images', {
      id: text('id').primaryKey(),
      r2Key: text('r2_key').notNull().unique(),
      altText: text('alt_text'),
      mimeType: text('mime_type').notNull(),
      sizeBytes: integer('size_bytes').notNull(),
      createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    })
    ```
  - 创建 `src/db/index.ts` — 导出类型安全的数据库操作函数
  - 使用 `drizzle-kit generate` 生成迁移文件到 `migrations/`
  - 创建索引：posts(slug), posts(status), posts(publishedAt DESC), comments(post_id), comments(status), post_tags(post_id), post_tags(tag_id)

  **Must NOT do**:
  - 不使用 `drizzle-kit migrate`（Workers 不支持文件系统）
  - 不在 schema 中使用 JSON 列存储标签（用关联表）
  - 不创建 >100 参数的批量操作

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Schema 设计需要仔细考虑关系和索引，有一定复杂度
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: None (can start immediately)

  **References**:
  **Pattern References**:
  - Rin `server/src/db/schema.ts` — Drizzle schema 模式参考（posts, tags, comments 表设计）
  - SonicJS `packages/core/src/db/` — 迁移文件命名和版本管理模式

  **API/Type References**:
  - Drizzle ORM SQLite Schema API: https://orm.drizzle.team/docs/sqlite-core
  - `drizzle-orm/sqlite-core` — sqliteTable, text, integer, sql 函数

  **External References**:
  - Drizzle ORM 文档: https://orm.drizzle.team/docs/overview
  - D1 迁移指南: https://developers.cloudflare.com/d1/migrations/

  **WHY Each Reference Matters**:
  - Drizzle SQLite schema API 与 D1 的兼容性需要注意（如 `sql\`(datetime('now'))\`` 语法）
  - 关联表设计（post_tags）替代 JSON 列，便于标签过滤查询
  - D1 迁移必须用 wrangler 而非 drizzle-kit 直接执行

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Migration file generated successfully
    Tool: Bash
    Preconditions: drizzle.config.ts and schema.ts exist
    Steps:
      1. Run `npx drizzle-kit generate`
      2. Check `migrations/` directory for generated SQL file
    Expected Result: SQL file exists with CREATE TABLE statements for posts, tags, post_tags, comments, images
    Failure Indicators: No migration file, SQL syntax error
    Evidence: .sisyphus/evidence/task-2-migration.txt

  Scenario: Schema TypeScript types are correct
    Tool: Bash
    Preconditions: schema.ts exists
    Steps:
      1. Run `npx tsc --noEmit src/db/schema.ts`
    Expected Result: No type errors
    Failure Indicators: Type errors in Drizzle schema definitions
    Evidence: .sisyphus/evidence/task-2-types.txt

  Scenario: Local D1 migration applies successfully
    Tool: Bash
    Preconditions: migration SQL file exists
    Steps:
      1. Run `npx wrangler d1 migrations apply blog-db --local`
      2. Run `npx wrangler d1 execute blog-db --local --command="SELECT name FROM sqlite_master WHERE type='table'"`
    Expected Result: Tables: posts, tags, post_tags, comments, images all listed
    Failure Indicators: Migration fails, missing tables
    Evidence: .sisyphus/evidence/task-2-d1-tables.txt
  ```

  **Commit**: YES
  - Message: `feat: add D1 schema, Drizzle ORM setup, and initial migration`
  - Files: `src/db/schema.ts, src/db/index.ts, migrations/0001_init.sql, drizzle.config.ts`

- [x] 3. Auth System (bcryptjs + JWT + Login API)

  **What to do**:
  - 创建 `src/middleware/auth.ts`:
    - `hashPassword(password: string): Promise<string>` — bcryptjs hash, salt rounds=10
    - `verifyPassword(password: string, hash: string): Promise<boolean>` — bcryptjs compare
    - `generateToken(payload: {sub: string}, secret: string): Promise<string>` — jose JWT sign, expiresIn: '7d'
    - `verifyToken(token: string, secret: string): Promise<JWTVerifyResult>` — jose JWT verify
    - `authMiddleware` — Hono middleware：从 cookie 读取 `admin_token`，验证 JWT，设置 `c.set('user', payload)`
  - 创建 `src/routes/auth.ts`:
    - `POST /api/auth/login` — 验证 username/password，返回 JWT cookie
    - `POST /api/auth/logout` — 清除 cookie
    - `GET /api/auth/me` — 返回当前认证状态（受 authMiddleware 保护）
  - 在 `src/index.ts` 中注册路由
  - 密码使用 bcryptjs 哈希，初始管理员密码通过 `wrangler secret put ADMIN_PASSWORD` 设置

  **Must NOT do**:
  - 不使用 SHA-256 哈希（必须 bcryptjs）
  - 不生成无过期时间的 JWT（必须 7 天过期）
  - 不在 JWT payload 中存储敏感信息
  - 不使用 localStorage 存储 token（必须 httpOnly cookie）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 安全相关代码需谨慎实现，涉及密码学和中间件设计
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 6, 7, 8, 9
  - **Blocked By**: None (can start immediately)

  **References**:
  **Pattern References**:
  - Rin `server/src/services/auth.ts` — JWT + cookie 模式参考（注意其用 SHA-256 是反面教材）
  - Hono JWT 中间件: https://hono.dev/docs/helpers/jwt

  **API/Type References**:
  - `bcryptjs` — compare, hash 函数
  - `jose` — SignJWT, jwtVerify
  - `hono/cookie` — setCookie, getCookie

  **External References**:
  - Hono Cookie helpers: https://hono.dev/docs/helpers/cookie
  - jose JWT 库: https://github.com/panva/jose

  **WHY Each Reference Matters**:
  - httpOnly + secure + sameSite cookie 配置防止 XSS 和 CSRF
  - bcryptjs 的 saltRounds=10 在 Workers 运行时中平衡安全和性能
  - jose 是 Workers 兼容的 JWT 库（不依赖 Node.js crypto）

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Login with correct credentials returns JWT cookie
    Tool: Bash (curl)
    Preconditions: dev server running, ADMIN_USERNAME and ADMIN_PASSWORD set as secrets
    Steps:
      1. `curl -s -X POST http://localhost:8787/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"test123"}' -c cookies.txt`
      2. Check response status is 200
      3. Check cookies.txt contains admin_token
    Expected Result: HTTP 200, Set-Cookie header with admin_token=eyJ...; HttpOnly; Secure; SameSite=Strict
    Failure Indicators: 401 status, no cookie set, missing HttpOnly flag
    Evidence: .sisyphus/evidence/task-3-login-success.txt

  Scenario: Login with wrong credentials returns 401
    Tool: Bash (curl)
    Preconditions: dev server running
    Steps:
      1. `curl -s -X POST http://localhost:8787/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"wrong"}' -w "%{http_code}"`
    Expected Result: HTTP 401, response body contains error message
    Failure Indicators: HTTP 200 with token (password check bypassed)
    Evidence: .sisyphus/evidence/task-3-login-fail.txt

  Scenario: Protected route rejects unauthenticated request
    Tool: Bash (curl)
    Preconditions: dev server running, /api/auth/me route registered
    Steps:
      1. `curl -s http://localhost:8787/api/auth/me -w "%{http_code}"`
    Expected Result: HTTP 401
    Failure Indicators: HTTP 200 (auth middleware not working)
    Evidence: .sisyphus/evidence/task-3-auth-guard.txt
  ```

  **Commit**: YES
  - Message: `feat: add JWT auth system with bcryptjs password hashing`
  - Files: `src/middleware/auth.ts, src/routes/auth.ts`

- [x] 4. Admin SPA Scaffold (Vite + React + Router + Tailwind)

  **What to do**:
  - 创建 `admin/` 子项目：
    - `admin/package.json` — React 18, React Router, Tailwind CSS, Tiptap（预留）
    - `admin/vite.config.ts` — 输出到 `../public/admin/`，开发时代理 `/api/*` 到 `http://localhost:8787`
    - `admin/index.html` — SPA 入口
    - `admin/src/main.tsx` — React 入口，BrowserRouter basename="/admin"
    - `admin/src/App.tsx` — 路由定义（/admin/login, /admin/posts, /admin/posts/new, /admin/posts/:id/edit, /admin/comments, /admin/）
    - `admin/src/lib/api.ts` — API 客户端：封装 fetch，自动附加 credentials: 'include'，处理 401 跳转登录
    - `admin/tailwind.config.js` — 极简配置，无多余插件
    - `admin/postcss.config.js`
  - 创建占位页面组件：Login, Dashboard, Posts, EditPost, Comments
  - 配置根 package.json 的 build 脚本：`npm run build:admin` 构建 admin SPA 到 `public/admin/`
  - 创建 `public/admin/index.html` 占位（首次构建前）

  **Must NOT do**:
  - 不安装 Next.js 或 Remix
  - 不添加复杂的 UI 组件库（Ant Design, MUI 等）
  - 不使用 CSS-in-JS（只用 Tailwind）
  - 不在 admin 中实现业务逻辑（只做占位组件）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 前端脚手架搭建，涉及 Vite + React + Tailwind 配置
  - **Skills**: [`/frontend-ui-ux`]
    - `/frontend-ui-ux`: 前端项目初始化和配置

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Tasks 15, 16, 17, 18
  - **Blocked By**: None (can start immediately)

  **References**:
  **Pattern References**:
  - Rin `client/` 目录 — Vite + React SPA 结构参考
  - Vite 代理配置 — 开发环境 API 代理模式

  **API/Type References**:
  - Vite `server.proxy` — 开发环境代理配置
  - React Router v6 — 路由定义模式
  - Tailwind CSS v3 — 配置模式

  **External References**:
  - Vite 配置: https://vitejs.dev/config/
  - React Router: https://reactrouter.com/en/main
  - Tailwind CSS: https://tailwindcss.com/docs/installation

  **WHY Each Reference Matters**:
  - Vite 代理确保开发时 API 请求路由到 Worker
  - 输出到 `../public/admin/` 让 Workers assets binding 直接服务
  - basename="/admin" 确保路由在子路径下正常工作

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin SPA builds and outputs to public/admin/
    Tool: Bash
    Preconditions: admin/ package installed
    Steps:
      1. Run `cd admin && npm run build`
      2. Check `../public/admin/index.html` exists
      3. Check `../public/admin/assets/` contains JS and CSS files
    Expected Result: Build succeeds, output files in correct location
    Failure Indicators: Build fails, wrong output directory, missing files
    Evidence: .sisyphus/evidence/task-4-build.txt

  Scenario: Admin dev server starts with proxy
    Tool: Bash (pty)
    Preconditions: admin/ package installed, Worker dev server running on :8787
    Steps:
      1. Run `cd admin && npm run dev`
      2. Wait for Vite ready
      3. `curl http://localhost:5173/admin/` — should return SPA HTML
    Expected Result: SPA loads, HTML contains React root div
    Failure Indicators: Vite fails to start, proxy misconfigured
    Evidence: .sisyphus/evidence/task-4-dev.txt
  ```

  **Commit**: YES
  - Message: `feat: scaffold admin SPA with Vite, React, Router, Tailwind`
  - Files: `admin/*`

- [x] 5. R2 Image Storage Service

  **What to do**:
  - 创建 `src/services/image.ts`:
    - `uploadImage(env: Bindings, file: File): Promise<{id: string, url: string}>` — 上传图片到 R2，生成唯一 key（`images/{uuid}.{ext}`），记录到 images 表
    - `serveImage(env: Bindings, key: string): Promise<Response>` — 从 R2 读取图片，设置 Cache-Control: `public, max-age=31536000, immutable`
    - `deleteImage(env: Bindings, key: string): Promise<void>` — 从 R2 和 images 表删除
    - `listImages(env: Bindings): Promise<Image[]>` — 列出所有图片
  - 支持的格式：image/jpeg, image/png, image/gif, image/webp, image/svg+xml
  - 文件大小限制：10MB
  - 生成唯一 R2 key：`images/{crypto.randomUUID()}.{extension}`

  **Must NOT do**:
  - 不暴露 R2 公共 bucket（必须通过 Worker 代理）
  - 不跳过文件类型验证
  - 不跳过文件大小检查

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 逻辑简单的 CRUD 服务，主要封装 R2 API
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Task 9
  - **Blocked By**: None (can start immediately)

  **References**:
  **API/Type References**:
  - `R2Bucket` — Workers R2 绑定 API（put, get, delete, list）
  - `R2Object` — R2 对象元数据

  **External References**:
  - R2 Workers API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

  **WHY Each Reference Matters**:
  - R2 put/get API 是图片上传和读取的核心
  - Cache-Control 头确保浏览器缓存图片（减少 Worker 调用）

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Image upload to R2 succeeds
    Tool: Bash (curl)
    Preconditions: Worker dev running, R2 binding configured
    Steps:
      1. Create a test image: `convert -size 100x100 xc:red /tmp/test.png`
      2. `curl -X POST http://localhost:8787/api/images -F "file=@/tmp/test.png" -b cookies.txt`
      3. Check response contains id and url
    Expected Result: HTTP 201, response with {id, url: "/images/..."}
    Failure Indicators: 500 error, R2 binding not found
    Evidence: .sisyphus/evidence/task-5-upload.txt

  Scenario: Image serve with cache headers
    Tool: Bash (curl)
    Preconditions: Image uploaded to R2
    Steps:
      1. `curl -I http://localhost:8787/images/{uploaded-key}`
    Expected Result: HTTP 200, Cache-Control: public, max-age=31536000, Content-Type: image/png
    Failure Indicators: Missing Cache-Control, wrong Content-Type
    Evidence: .sisyphus/evidence/task-5-serve.txt
  ```

  **Commit**: YES
  - Message: `feat: add R2 image storage service with cache headers`
  - Files: `src/services/image.ts`

### Wave 2 — Core APIs

- [x] 6. Blog Post CRUD API

  **What to do**:
  - 创建 `src/routes/posts.ts` — 所有路由受 authMiddleware 保护：
    - `POST /api/posts` — 创建文章：生成 slug（从 title），设置 publishedAt（如果 status=published），批量插入 postTags（≤100/批）
    - `GET /api/posts` — 列出所有文章（管理用）：支持 ?status=draft|published, ?page=1, ?limit=20, 返回分页结果
    - `GET /api/posts/:id` — 获取单篇文章（含标签）
    - `PUT /api/posts/:id` — 更新文章：同步更新标签关联（删除旧的，插入新的），更新 updatedAt
    - `DELETE /api/posts/:id` — 删除文章（CASCADE 删除 postTags 和 comments）
  - 创建 `src/db/queries.ts` — 封装常用查询：
    - `getPostsWithPagination(db, options)` — 分页查询
    - `getPostBySlug(db, slug)` — slug 查询
    - `getPostWithTags(db, id)` — 文章 + 标签 JOIN
  - 创建 `src/utils/slugify.ts` — 标题转 slug（中文支持：保留拼音或 transliterate）
  - 在 `src/index.ts` 中注册路由
  - 使用 Zod 验证请求体（title 必填, content 必填, status 枚举, tags 数组）

  **Must NOT do**:
  - 不在单个查询中使用 >100 绑定参数
  - 不使用 `sql` 拼接用户输入（必须参数化查询）
  - 不返回已删除文章（软删除除外）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: CRUD API 涉及多表操作、分页逻辑、数据验证
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9)
  - **Blocks**: Tasks 11, 12, 15, 18
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  **Pattern References**:
  - Rin `server/src/services/feed.ts` — 文章 CRUD 完整实现参考
  - SonicJS `packages/core/src/routes/admin-content.ts` — 内容 CRUD 路由模式

  **API/Type References**:
  - Drizzle ORM 查询 API: https://orm.drizzle.team/docs/select
  - `@hono/zod-validator` — Hono + Zod 请求验证
  - `src/db/schema.ts` (Task 2) — posts, postTags, tags 表结构

  **External References**:
  - Drizzle ORM CRUD: https://orm.drizzle.team/docs/insert
  - Hono 验证: https://hono.dev/docs/guides/validation

  **WHY Each Reference Matters**:
  - Drizzle 的关联查询（with tags）需要在 schema 中正确定义关系
  - Zod 验证确保 API 数据完整性
  - 分页查询需要计算 total 和 hasMore

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Create a new blog post
    Tool: Bash (curl)
    Preconditions: DB migrated, auth cookie obtained
    Steps:
      1. `curl -s -X POST http://localhost:8787/api/posts -H "Content-Type: application/json" -b cookies.txt -d '{"title":"Test Post","content":"Hello World","status":"draft","tags":["test"]}'`
    Expected Result: HTTP 201, response with {id, title, slug:"test-post", status:"draft"}
    Failure Indicators: 500 error, slug not generated, tag not created
    Evidence: .sisyphus/evidence/task-6-create-post.txt

  Scenario: List posts with pagination
    Tool: Bash (curl)
    Preconditions: At least 1 post exists
    Steps:
      1. `curl -s "http://localhost:8787/api/posts?page=1&limit=10" -b cookies.txt`
    Expected Result: HTTP 200, response with {posts: [...], total: N, page: 1, limit: 10}
    Failure Indicators: Missing pagination fields, empty results
    Evidence: .sisyphus/evidence/task-6-list-posts.txt

  Scenario: Update post status to published
    Tool: Bash (curl)
    Preconditions: Post exists in draft status
    Steps:
      1. `curl -s -X PUT http://localhost:8787/api/posts/{id} -H "Content-Type: application/json" -b cookies.txt -d '{"status":"published","title":"Updated Title","content":"Updated"}'`
    Expected Result: HTTP 200, publishedAt is set, updatedAt is recent
    Failure Indicators: publishedAt null for published status
    Evidence: .sisyphus/evidence/task-6-update-post.txt

  Scenario: Delete post cascades to tags and comments
    Tool: Bash (curl)
    Preconditions: Post with tags and comments exists
    Steps:
      1. `curl -s -X DELETE http://localhost:8787/api/posts/{id} -b cookies.txt`
      2. Query DB to verify post_tags and comments for this post_id are gone
    Expected Result: HTTP 200, post and related records deleted
    Failure Indicators: Orphaned records in post_tags or comments
    Evidence: .sisyphus/evidence/task-6-delete-post.txt
  ```

  **Commit**: YES
  - Message: `feat: add blog post CRUD API with pagination and tag management`
  - Files: `src/routes/posts.ts, src/db/queries.ts, src/utils/slugify.ts`

- [x] 7. Tag System API

  **What to do**:
  - 创建 `src/routes/tags.ts`:
    - `GET /api/tags` — 列出所有标签（含文章数量）：JOIN postTags 统计
    - `GET /api/tags/:slug` — 获取标签详情（含关联文章列表，分页）
    - `POST /api/tags` — 创建标签（受 authMiddleware 保护）
    - `DELETE /api/tags/:id` — 删除标签（受 authMiddleware 保护，CASCADE 删除关联）
  - slug 自动从 tag name 生成

  **Must NOT do**:
  - 不在标签中使用 JSON 列（用关联表 postTags）
  - 不创建重复标签（name 和 slug 都 unique）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 标准的 CRUD API，但涉及 JOIN 和聚合查询
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 2, 3

  **References**:
  **API/Type References**:
  - `src/db/schema.ts` (Task 2) — tags, postTags 表结构
  - Drizzle ORM 聚合查询: https://orm.drizzle.team/docs/select#aggregations

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: List tags with post count
    Tool: Bash (curl)
    Preconditions: Tags exist with posts associated
    Steps:
      1. `curl -s http://localhost:8787/api/tags`
    Expected Result: HTTP 200, [{id, name, slug, postCount: N}]
    Failure Indicators: Missing postCount, SQL JOIN error
    Evidence: .sisyphus/evidence/task-7-list-tags.txt

  Scenario: Create tag with auto slug
    Tool: Bash (curl)
    Preconditions: Auth cookie obtained
    Steps:
      1. `curl -s -X POST http://localhost:8787/api/tags -H "Content-Type: application/json" -b cookies.txt -d '{"name":"JavaScript"}'`
    Expected Result: HTTP 201, {id, name:"JavaScript", slug:"javascript"}
    Failure Indicators: Slug not generated, duplicate not rejected
    Evidence: .sisyphus/evidence/task-7-create-tag.txt
  ```

  **Commit**: YES
  - Message: `feat: add tag system API with post count aggregation`
  - Files: `src/routes/tags.ts`

- [x] 8. Comment System API + Moderation

  **What to do**:
  - 创建 `src/routes/comments.ts`:
    - `POST /api/posts/:postId/comments` — 读者提交评论（无需认证）：authorName 必填, authorEmail 选填, content 必填, status 默认 'pending'
    - `GET /api/posts/:postId/comments` — 获取已审核评论列表（公开：只返回 status='approved'）
    - `GET /api/admin/comments` — 管理员获取所有评论（受 authMiddleware 保护）：支持 ?status=pending|approved|rejected 过滤, ?page 分页
    - `PUT /api/admin/comments/:id` — 管理员审核评论（受 authMiddleware）：{status: 'approved'|'rejected'}
    - `DELETE /api/admin/comments/:id` — 管理员删除评论（受 authMiddleware）
  - 输入验证：authorName 1-50 字符, content 1-1000 字符, email 格式校验（如提供）
  - XSS 防护：HTML 转义评论内容

  **Must NOT do**:
  - 不允许 HTML 标签在评论内容中（必须转义）
  - 不自动发布评论（默认 pending）
  - 不要求读者注册或登录

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 标准 CRUD + 审核逻辑，中等复杂度
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9)
  - **Blocks**: Tasks 12, 15, 17
  - **Blocked By**: Tasks 2, 3

  **References**:
  **API/Type References**:
  - `src/db/schema.ts` (Task 2) — comments 表结构（postId, status, authorName, content）

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Reader submits a comment (unauthenticated)
    Tool: Bash (curl)
    Preconditions: A published post exists
    Steps:
      1. `curl -s -X POST http://localhost:8787/api/posts/{postId}/comments -H "Content-Type: application/json" -d '{"authorName":"Reader","content":"Great article!"}'`
    Expected Result: HTTP 201, comment created with status:"pending"
    Failure Indicators: 401 (should not require auth), status not "pending"
    Evidence: .sisyphus/evidence/task-8-submit-comment.txt

  Scenario: Public comment list only shows approved
    Tool: Bash (curl)
    Preconditions: Comments exist with pending and approved status
    Steps:
      1. `curl -s http://localhost:8787/api/posts/{postId}/comments`
    Expected Result: Only comments with status:"approved" returned, no pending/rejected
    Failure Indicators: Pending comments visible to public
    Evidence: .sisyphus/evidence/task-8-public-comments.txt

  Scenario: Admin approves a comment
    Tool: Bash (curl)
    Preconditions: Pending comment exists, auth cookie obtained
    Steps:
      1. `curl -s -X PUT http://localhost:8787/api/admin/comments/{id} -H "Content-Type: application/json" -b cookies.txt -d '{"status":"approved"}'`
    Expected Result: HTTP 200, comment status changed to "approved"
    Failure Indicators: 401, status not updated
    Evidence: .sisyphus/evidence/task-8-approve-comment.txt

  Scenario: XSS in comment content is escaped
    Tool: Bash (curl)
    Preconditions: None
    Steps:
      1. `curl -s -X POST http://localhost:8787/api/posts/{postId}/comments -H "Content-Type: application/json" -d '{"authorName":"Hacker","content":"<script>alert(1)</script>"}'`
    Expected Result: Content stored and returned as escaped HTML, not raw script tag
    Failure Indicators: Raw <script> in response or stored in DB
    Evidence: .sisyphus/evidence/task-8-xss-protection.txt
  ```

  **Commit**: YES
  - Message: `feat: add comment system with admin moderation`
  - Files: `src/routes/comments.ts`

- [x] 9. Image Upload/Serve API Routes

  **What to do**:
  - 创建 `src/routes/images.ts`:
    - `POST /api/images` — 上传图片（受 authMiddleware）：接收 multipart/form-data，调用 image service，返回 {id, url: "/images/{key}"}
    - `GET /images/:key` — 公开访问图片：从 R2 读取，设置 Cache-Control, Content-Type, ETag
    - `DELETE /api/images/:id` — 删除图片（受 authMiddleware）
    - `GET /api/images` — 列出所有图片（受 authMiddleware）：分页，返回缩略信息
  - 文件验证：类型检查（image/*），大小检查（≤10MB）
  - 在 `src/index.ts` 中注册路由

  **Must NOT do**:
  - 不直接暴露 R2 公共 URL
  - 不允许上传非图片文件
  - 不返回超过 10MB 的文件

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: multipart 处理 + R2 集成，需要注意细节
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 3, 5

  **References**:
  **Pattern References**:
  - `src/services/image.ts` (Task 5) — 图片上传/读取服务函数
  - Rin 图片上传模式：`server/src/services/storage.ts`

  **API/Type References**:
  - Hono `c.req.parseBody()` — multipart/form-data 解析
  - R2Bucket API — put, get, delete

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Upload image via multipart form
    Tool: Bash (curl)
    Preconditions: Auth cookie obtained, R2 binding configured
    Steps:
      1. `curl -s -X POST http://localhost:8787/api/images -F "file=@/tmp/test.png" -b cookies.txt`
    Expected Result: HTTP 201, {id: "...", url: "/images/..."}
    Failure Indicators: 500, R2 write error, missing auth
    Evidence: .sisyphus/evidence/task-9-upload-api.txt

  Scenario: Serve image with correct headers
    Tool: Bash (curl)
    Preconditions: Image uploaded
    Steps:
      1. `curl -I http://localhost:8787/images/{key}`
    Expected Result: Content-Type: image/png, Cache-Control: public, max-age=31536000
    Failure Indicators: Missing headers, 404
    Evidence: .sisyphus/evidence/task-9-serve-api.txt

  Scenario: Reject non-image file upload
    Tool: Bash (curl)
    Preconditions: Auth cookie obtained
    Steps:
      1. `echo "not an image" > /tmp/test.txt`
      2. `curl -s -X POST http://localhost:8787/api/images -F "file=@/tmp/test.txt" -b cookies.txt -w "%{http_code}"`
    Expected Result: HTTP 400, error message about invalid file type
    Failure Indicators: 201 (uploaded non-image)
    Evidence: .sisyphus/evidence/task-9-reject-non-image.txt
  ```

  **Commit**: YES
  - Message: `feat: add image upload and serve API routes`
  - Files: `src/routes/images.ts`

### Wave 3 — Public Blog SSR

- [x] 10. Blog Layout + Minimalist CSS Design

  **What to do**:
  - 创建 `src/views/layout.tsx` — 基础 HTML 布局：
    - `<html>`, `<head>` (charset, viewport, title, meta description, Open Graph), `<body>`
    - 导航栏：博客名称（左），RSS 链接（右）
    - 页脚：版权信息，Powered by Cloudflare Workers
  - 创建 `src/views/components/seo.tsx` — SEO 组件：
    - Open Graph 标签：og:title, og:description, og:image, og:url, og:type
    - Twitter Card 标签
    - Canonical URL
  - 创建 `public/css/style.css` — 极简设计系统：
    - 基础：system-ui 字体，1.6 行高，max-width: 720px 内容区居中
    - 颜色：深灰文字(#333)，浅灰背景(#fafafa)，强调色(#0066cc)
    - 文章排版：h1-h6 层级、段落间距、代码块样式、引用样式、列表样式
    - LaTeX 公式样式（KaTeX）
    - 响应式：移动端适配（padding, font-size 调整）
    - 导航和页脚样式
  - 在 Hono JSX 中引入 `hono/jsx`，配置 `jsxImportSource`

  **Must NOT do**:
  - 不使用 CSS 框架（Bootstrap, Tailwind 等）— 公开页面纯手写 CSS
  - 不添加 JavaScript（公开页面零 JS，纯 HTML+CSS）
  - 不添加动画效果
  - 不使用 Google Fonts（用 system-ui）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS 设计和 JSX 模板需要视觉审美和前端技能
  - **Skills**: [`/frontend-ui-ux`]
    - `/frontend-ui-ux`: 极简设计实现

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12, 13, 14)
  - **Blocks**: Tasks 11, 12, 13, 14
  - **Blocked By**: Task 1

  **References**:
  **Pattern References**:
  - Hono JSX 文档: https://hono.dev/docs/guides/jsx — SSR 模板模式

  **External References**:
  - KaTeX CSS: https://katex.org/docs/browser.html — 公式渲染样式

  **WHY Each Reference Matters**:
  - Hono JSX 需要正确配置 tsconfig（jsx: "react-jsx", jsxImportSource: "hono/jsx"）
  - 极简设计的关键是排版和留白，不是视觉元素

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Layout renders valid HTML with correct meta tags
    Tool: Bash (curl)
    Preconditions: Layout component created
    Steps:
      1. `curl -s http://localhost:8787/ | head -30`
    Expected Result: Valid HTML5, contains <meta charset>, <meta name="viewport">, <title>
    Failure Indicators: Malformed HTML, missing meta tags
    Evidence: .sisyphus/evidence/task-10-layout.txt

  Scenario: CSS file served and valid
    Tool: Bash (curl)
    Preconditions: public/css/style.css exists
    Steps:
      1. `curl -I http://localhost:8787/css/style.css`
    Expected Result: HTTP 200, Content-Type: text/css
    Failure Indicators: 404, wrong content type
    Evidence: .sisyphus/evidence/task-10-css.txt

  Scenario: Responsive meta viewport present
    Tool: Bash (curl)
    Preconditions: Layout used in any SSR route
    Steps:
      1. `curl -s http://localhost:8787/ | grep 'viewport'`
    Expected Result: <meta name="viewport" content="width=device-width, initial-scale=1.0">
    Failure Indicators: Missing viewport meta tag
    Evidence: .sisyphus/evidence/task-10-responsive.txt
  ```

  **Commit**: YES
  - Message: `feat: add blog layout, SEO component, and minimalist CSS design`
  - Files: `src/views/layout.tsx, src/views/components/seo.tsx, public/css/style.css`

- [x] 11. Homepage SSR + Pagination

  **What to do**:
  - 创建 `src/views/home.tsx` — 首页 JSX 模板：
    - 文章列表：每篇显示 title（链接到 /posts/:slug）、excerpt、publishedAt、tags
    - 分页：上一页/下一页链接，当前页码显示
    - 空状态："暂无文章"提示
  - 创建 `src/routes/blog.ts` — 公开博客路由：
    - `GET /` — 首页：查询 published 文章，按 publishedAt DESC 排序，每页 10 篇
    - `GET /posts/:slug` — 占位（Task 12 实现）
    - `GET /tags/:slug` — 占位（Task 13 实现）
  - 分页逻辑：从查询参数 `?page=N` 获取页码，计算 offset, limit
  - 日期格式化：ISO 8601 → "YYYY年MM月DD日"

  **Must NOT do**:
  - 不加载全部文章（必须分页）
  - 不显示 draft 状态文章（只显示 published）
  - 不使用客户端 JavaScript 渲染（纯 SSR）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: SSR 模板 + 分页逻辑，中等复杂度
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 12, 13, 14)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 6, 10

  **References**:
  **Pattern References**:
  - `src/views/layout.tsx` (Task 10) — 布局组件
  - `src/db/queries.ts` (Task 6) — getPostsWithPagination 查询函数

  **API/Type References**:
  - `src/db/schema.ts` (Task 2) — posts, postTags, tags 表结构

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Homepage renders published posts list
    Tool: Bash (curl) + Playwright
    Preconditions: Published posts exist in DB
    Steps:
      1. `curl -s http://localhost:8787/`
      2. Verify HTML contains post titles, links to /posts/{slug}, dates, and tags
    Expected Result: Published posts listed with correct data, no draft posts visible
    Failure Indicators: Empty list, draft posts shown, missing links
    Evidence: .sisyphus/evidence/task-11-homepage.html

  Scenario: Pagination works correctly
    Tool: Bash (curl)
    Preconditions: >10 published posts exist
    Steps:
      1. `curl -s http://localhost:8787/?page=2`
      2. Check for "下一页" and "上一页" links
    Expected Result: Page 2 shows different posts from page 1, navigation links present
    Failure Indicators: Same posts as page 1, missing navigation
    Evidence: .sisyphus/evidence/task-11-pagination.txt

  Scenario: Empty state when no posts
    Tool: Bash (curl)
    Preconditions: No published posts in DB
    Steps:
      1. `curl -s http://localhost:8787/`
    Expected Result: "暂无文章" message displayed
    Failure Indicators: Error page, empty content
    Evidence: .sisyphus/evidence/task-11-empty.txt
  ```

  **Commit**: YES
  - Message: `feat: add homepage SSR with post list and pagination`
  - Files: `src/views/home.tsx, src/routes/blog.ts`

- [x] 12. Post Detail SSR + LaTeX Rendering + Comments Display

  **What to do**:
  - 创建 `src/views/post.tsx` — 文章详情 JSX 模板：
    - 文章标题、发布日期、标签
    - 文章内容渲染：HTML 直接输出（由编辑器生成）
    - LaTeX 公式渲染：引入 KaTeX CSS（`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">`），使用 `katex.renderToString` 在 SSR 时预渲染公式
    - 评论列表：只显示 approved 评论，按时间 ASC
    - 评论提交表单：authorName（必填）、authorEmail（选填）、content（必填）
    - 上一篇/下一篇文章导航
  - 更新 `src/routes/blog.ts`：
    - `GET /posts/:slug` — 查询文章（含标签），渲染 post.tsx
    - 404 处理：slug 不存在或未发布 → 404 页面
  - 创建 `src/views/404.tsx` — 简洁的 404 页面
  - HTML 内容安全：使用 `dangerouslySetInnerHTML` 渲染文章内容（由服务端可信编辑器生成）
  - 目录(TOC)：从 HTML headings 自动生成

  **Must NOT do**:
  - 不使用客户端 JavaScript 渲染公式（必须 SSR 预渲染 KaTeX）
  - 不显示未审核评论
  - 不允许评论表单提交 HTML（纯文本 + XSS 转义）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: LaTeX SSR 渲染 + TOC 生成 + 评论集成，功能复杂
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 13, 14)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 6, 8, 10

  **References**:
  **API/Type References**:
  - KaTeX `renderToString` API: https://katex.org/docs/api.html — SSR 公式渲染
  - `src/db/queries.ts` (Task 6) — getPostWithTags 查询
  - `src/db/schema.ts` (Task 2) — comments 表

  **External References**:
  - KaTeX 文档: https://katex.org/
  - KaTeX SSR 示例: https://katex.org/docs/api.html#rendering-options

  **WHY Each Reference Matters**:
  - KaTeX `renderToString` 可以在 Workers 服务端渲染 LaTeX 公式，无需客户端 JS
  - HTML heading 解析生成 TOC 需要简单的正则或 DOM 解析

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Post detail renders with all elements
    Tool: Bash (curl) + Playwright
    Preconditions: Published post with tags and approved comments exists
    Steps:
      1. `curl -s http://localhost:8787/posts/{slug}`
      2. Verify HTML contains: title, date, tags, content, approved comments, comment form
    Expected Result: Full post page rendered with all elements
    Failure Indicators: Missing tags, no comments, no comment form
    Evidence: .sisyphus/evidence/task-12-post-detail.html

  Scenario: LaTeX formulas rendered as HTML (not raw)
    Tool: Bash (curl)
    Preconditions: Post content contains LaTeX (e.g., $$E=mc^2$$)
    Steps:
      1. `curl -s http://localhost:8787/posts/{slug} | grep 'katex'`
    Expected Result: HTML contains .katex class elements, not raw $$ or \[ delimiters
    Failure Indicators: Raw LaTeX delimiters in output
    Evidence: .sisyphus/evidence/task-12-latex.txt

  Scenario: 404 for non-existent or draft post
    Tool: Bash (curl)
    Preconditions: Draft post exists with slug "draft-post"
    Steps:
      1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/posts/draft-post`
      2. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/posts/non-existent`
    Expected Result: Both return HTTP 404
    Failure Indicators: 200 for draft post, 500 error
    Evidence: .sisyphus/evidence/task-12-404.txt

  Scenario: Comment submission works
    Tool: Bash (curl)
    Preconditions: Post exists at /posts/{slug}
    Steps:
      1. `curl -s -X POST http://localhost:8787/api/posts/{postId}/comments -H "Content-Type: application/json" -d '{"authorName":"Test","content":"Nice!"}' -w "%{http_code}"`
    Expected Result: HTTP 201
    Failure Indicators: 500, 404
    Evidence: .sisyphus/evidence/task-12-comment-submit.txt
  ```

  **Commit**: YES
  - Message: `feat: add post detail SSR with LaTeX rendering and comments`
  - Files: `src/views/post.tsx, src/views/404.tsx, src/routes/blog.ts (update)`

- [x] 13. Tag Page SSR + RSS Feed

  **What to do**:
  - 创建 `src/views/tag.tsx` — 标签页模板：
    - 标签名称
    - 该标签下的文章列表（与首页相同的文章卡片样式）
    - 分页
    - 所有标签列表（侧边栏或顶部）
  - 更新 `src/routes/blog.ts`：
    - `GET /tags/:slug` — 查询标签及其文章（只 published），渲染 tag.tsx
  - 创建 `src/utils/rss.ts` — RSS 生成：
    - `generateRSS(posts: Post[], baseUrl: string): string` — 生成 RSS 2.0 XML
    - 包含：title, link, description, language, lastBuildDate
    - 每个 item：title, link, description(excerpt), pubDate, guid
  - 添加路由 `GET /feed.xml` — 返回 RSS XML，Content-Type: application/xml

  **Must NOT do**:
  - 不在 RSS 中包含 draft 文章
  - 不使用第三方 RSS 库（手写 XML 足够简单）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 两个独立功能（标签页 + RSS），中等复杂度
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12, 14)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 7, 10

  **References**:
  **Pattern References**:
  - `src/views/home.tsx` (Task 11) — 文章列表模板可复用
  - Rin `server/src/services/rss.ts` — RSS 生成参考

  **External References**:
  - RSS 2.0 规范: https://www.rssboard.org/rss-specification

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tag page shows associated posts
    Tool: Bash (curl)
    Preconditions: Tag with published posts exists
    Steps:
      1. `curl -s http://localhost:8787/tags/{tag-slug}`
    Expected Result: HTML with tag name and list of posts in that tag
    Failure Indicators: Empty list, tag not found, 404
    Evidence: .sisyphus/evidence/task-13-tag-page.txt

  Scenario: RSS feed is valid XML
    Tool: Bash (curl)
    Preconditions: Published posts exist
    Steps:
      1. `curl -s http://localhost:8787/feed.xml`
      2. Verify: starts with <?xml>, contains <rss>, <channel>, <item> elements
    Expected Result: Valid RSS 2.0 XML with posts as items
    Failure Indicators: Invalid XML, missing posts, draft posts in feed
    Evidence: .sisyphus/evidence/task-13-rss.xml

  Scenario: RSS feed excludes draft posts
    Tool: Bash (curl)
    Preconditions: Both draft and published posts exist
    Steps:
      1. `curl -s http://localhost:8787/feed.xml | grep -c '<item>'`
      2. Compare with total posts count
    Expected Result: Only published posts in feed
    Failure Indicators: Draft post titles appear in feed
    Evidence: .sisyphus/evidence/task-13-rss-no-drafts.txt
  ```

  **Commit**: YES
  - Message: `feat: add tag page SSR and RSS feed generation`
  - Files: `src/views/tag.tsx, src/utils/rss.ts, src/routes/blog.ts (update)`

- [x] 14. SEO Meta Tags + Open Graph

  **What to do**:
  - 更新 `src/views/components/seo.tsx` — 完善实现：
    - 接受 props：title, description, url, image, type (article/website)
    - 输出：`<title>`, `<meta name="description">`, `<link rel="canonical">`
    - Open Graph：`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`
    - Twitter Card：`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
  - 更新各 SSR 页面传入正确的 SEO 数据：
    - 首页：type=website, title=博客名, description=博客描述
    - 文章：type=article, title=文章标题, description=excerpt, image=coverImage
    - 标签页：type=website, title=标签名, description=标签描述
  - 在 `layout.tsx` 中引入 SEO 组件

  **Must NOT do**:
  - 不在 SSR 页面中添加结构化数据（JSON-LD）— 首版不需要
  - 不使用 sitemap.xml（首版不需要）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 主要是模板更新，逻辑简单
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12, 13)
  - **Blocks**: None
  - **Blocked By**: Tasks 11, 12, 13

  **References**:
  **Pattern References**:
  - `src/views/components/seo.tsx` (Task 10) — SEO 组件基础结构
  - `src/views/layout.tsx` (Task 10) — 布局组件

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Homepage has correct SEO meta tags
    Tool: Bash (curl)
    Preconditions: Homepage SSR route implemented
    Steps:
      1. `curl -s http://localhost:8787/ | grep -E 'og:|twitter:|<title>|<meta name="description"'`
    Expected Result: All required meta tags present with correct values
    Failure Indicators: Missing og:title, missing canonical, empty description
    Evidence: .sisyphus/evidence/task-14-homepage-seo.txt

  Scenario: Post page has article type Open Graph
    Tool: Bash (curl)
    Preconditions: Published post exists
    Steps:
      1. `curl -s http://localhost:8787/posts/{slug} | grep 'og:type'`
    Expected Result: <meta property="og:type" content="article">
    Failure Indicators: Missing or wrong og:type
    Evidence: .sisyphus/evidence/task-14-post-seo.txt
  ```

  **Commit**: YES
  - Message: `feat: add SEO meta tags and Open Graph for all public pages`
  - Files: `src/views/components/seo.tsx (update), src/views/layout.tsx (update), src/views/home.tsx (update), src/views/post.tsx (update), src/views/tag.tsx (update)`

### Wave 4 — Admin SPA Features

- [x] 15. Admin Layout + Auth Guard + Dashboard

  **What to do**:
  - 创建 `admin/src/components/Layout.tsx` — 管理后台布局：
    - 侧边栏导航：Dashboard, Posts, Comments（显示 pending 数量 badge）
    - 顶部栏：博客名称，用户名，登出按钮
    - 主内容区域：children 渲染
    - Tailwind 极简样式（白底，浅灰侧边栏）
  - 创建 `admin/src/components/AuthGuard.tsx` — 认证守卫：
    - 检查 `/api/auth/me` 返回状态
    - 未认证 → 重定向到 `/admin/login`
    - 已认证 → 渲染子组件
  - 创建 `admin/src/pages/Login.tsx` — 登录页：
    - 用户名 + 密码表单
    - 调用 `/api/auth/login`
    - 成功 → 跳转 `/admin/`
    - 失败 → 显示错误消息
  - 创建 `admin/src/pages/Dashboard.tsx` — 仪表盘：
    - 统计卡片：文章总数、已发布数、草稿数、待审核评论数
    - 最近 5 篇文章列表
    - 最近 5 条待审核评论
  - 更新 `admin/src/App.tsx` — 完善路由：
    - 公开路由：`/admin/login`
    - 受保护路由（AuthGuard 包裹）：`/admin/`, `/admin/posts`, `/admin/posts/new`, `/admin/posts/:id/edit`, `/admin/comments`

  **Must NOT do**:
  - 不在客户端存储 JWT token（使用 httpOnly cookie，自动发送）
  - 不使用 localStorage/sessionStorage 存储认证信息
  - 不添加复杂的图表库

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 管理后台 UI 布局和交互设计
  - **Skills**: [`/frontend-ui-ux`]
    - `/frontend-ui-ux`: 管理后台 UI 设计实现

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 16, 17, 18)
  - **Blocks**: Tasks 16, 17, 18
  - **Blocked By**: Tasks 4, 6, 8

  **References**:
  **Pattern References**:
  - `admin/src/lib/api.ts` (Task 4) — API 客户端（credentials: 'include'）
  - `admin/src/App.tsx` (Task 4) — 路由结构

  **API/Type References**:
  - `GET /api/auth/me` (Task 3) — 认证状态检查
  - `POST /api/auth/login` (Task 3) — 登录接口
  - `GET /api/posts` (Task 6) — 文章列表（统计数据用）
  - `GET /api/admin/comments?status=pending` (Task 8) — 待审核评论

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Login page renders and login works
    Tool: Playwright
    Preconditions: Worker dev server running, admin credentials set
    Steps:
      1. Navigate to http://localhost:5173/admin/login
      2. Fill username input with "admin"
      3. Fill password input with "test123"
      4. Click "Login" button
      5. Wait for redirect to /admin/
    Expected Result: Redirected to /admin/ dashboard, sidebar visible with navigation links
    Failure Indicators: Stays on login page, error message, redirect loop
    Evidence: .sisyphus/evidence/task-15-login.png

  Scenario: Dashboard shows statistics
    Tool: Playwright
    Preconditions: Logged in, posts and comments exist
    Steps:
      1. Navigate to http://localhost:5173/admin/
      2. Check statistics cards: total posts, published, drafts, pending comments
    Expected Result: Cards show correct counts, recent posts and comments listed
    Failure Indicators: All zeros, API error, cards not rendering
    Evidence: .sisyphus/evidence/task-15-dashboard.png

  Scenario: Unauthenticated access redirects to login
    Tool: Playwright
    Preconditions: Not logged in (clear cookies)
    Steps:
      1. Navigate to http://localhost:5173/admin/posts
    Expected Result: Redirected to /admin/login
    Failure Indicators: Shows posts page without auth, blank page
    Evidence: .sisyphus/evidence/task-15-auth-guard.png
  ```

  **Commit**: YES
  - Message: `feat: add admin layout, auth guard, login page, and dashboard`
  - Files: `admin/src/components/Layout.tsx, admin/src/components/AuthGuard.tsx, admin/src/pages/Login.tsx, admin/src/pages/Dashboard.tsx, admin/src/App.tsx (update)`

- [x] 16. Tiptap Editor + Post Create/Edit

  **What to do**:
  - 安装 Tiptap 依赖（在 admin/ 子项目中）：
    - `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`
    - `@tiptap/extension-image`, `@tiptap/extension-placeholder`
    - `@tiptap/extension-mathematics` (KaTeX), `katex`
    - `tiptap-markdown`（Markdown 序列化）
  - 创建 `admin/src/components/Editor.tsx` — Tiptap 编辑器组件：
    - 工具栏：标题(H1-H3), 粗体, 斜体, 代码, 链接, 图片, 公式块, 引用, 列表, 分割线
    - 图片插入：点击图片按钮 → 弹出上传对话框 → 上传到 R2 → 插入图片 URL
    - LaTeX 公式：`$$..$$` 语法或工具栏按钮插入公式块
    - 自动保存：30 秒 debounce 保存草稿到 localStorage
    - 内容模式：HTML 存储（Tiptap getHTML()）
  - 创建 `admin/src/pages/EditPost.tsx` — 文章编辑页面：
    - 标题输入（大字体，无 border，placeholder "文章标题"）
    - 标签输入（逗号分隔，或 tag 选择器）
    - Tiptap 编辑器（占满剩余空间）
    - 底部操作栏：保存草稿 / 发布 / 更新
    - Slug 自动生成（从标题，可手动修改）
    - 摘要输入（可自动从内容截取）
  - 创建 `admin/src/pages/NewPost.tsx` — 复用 EditPost 组件（新建模式）
  - 调用 API：`POST /api/posts`（创建）、`PUT /api/posts/:id`（更新）

  **Must NOT do**:
  - 不使用原生 ProseMirror API（必须通过 Tiptap）
  - 不在编辑器中加载外部资源（所有扩展本地安装）
  - 不实现实时协作编辑（首版不需要）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Tiptap 编辑器配置复杂，涉及多种扩展集成和图片上传交互
  - **Skills**: [`/frontend-ui-ux`]
    - `/frontend-ui-ux`: 编辑器 UI 和交互设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 17, 18)
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 4, 9, 15

  **References**:
  **Pattern References**:
  - Rin `client/src/components/markdown_editor/` — 编辑器组件参考
  - Rin `client/src/page/writing.tsx` — 文章编辑页面布局参考

  **API/Type References**:
  - Tiptap React API: https://tiptap.dev/docs/editor/getting-started/install/react
  - `@tiptap/extension-mathematics` — KaTeX 公式扩展
  - `tiptap-markdown` — Markdown 序列化
  - `POST /api/posts` (Task 6) — 创建文章 API
  - `POST /api/images` (Task 9) — 图片上传 API

  **External References**:
  - Tiptap 文档: https://tiptap.dev/docs/editor/getting-started/install/react
  - Tiptap Mathematics: https://tiptap.dev/docs/editor/extensions/functionality/mathematics
  - KaTeX 支持列表: https://katex.org/docs/supported

  **WHY Each Reference Matters**:
  - Tiptap 的 React 集成需要 useEditor hook + EditorContent 组件
  - Mathematics 扩展依赖 KaTeX，需要额外引入 CSS
  - 图片上传需要先调用 `/api/images` 获取 URL，再插入编辑器

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Create new post with editor
    Tool: Playwright
    Preconditions: Logged in to admin
    Steps:
      1. Navigate to /admin/posts/new
      2. Type "My First Post" in title input
      3. Type "This is my first blog post." in editor
      4. Click "Save Draft" button
    Expected Result: Redirect to /admin/posts, new post visible in list with status "draft"
    Failure Indicators: Save error, post not in list, title empty
    Evidence: .sisyphus/evidence/task-16-create-post.png

  Scenario: Editor supports rich text formatting
    Tool: Playwright
    Preconditions: Logged in to admin
    Steps:
      1. Navigate to /admin/posts/new
      2. Type text, select it, click Bold button
      3. Click Insert Link, enter URL
      4. Click Code Block button, type code
    Expected Result: Text appears bold, link clickable, code block formatted
    Failure Indicators: Formatting not applied, toolbar not working
    Evidence: .sisyphus/evidence/task-16-editor-format.png

  Scenario: LaTeX formula renders in editor
    Tool: Playwright
    Preconditions: Logged in to admin, mathematics extension installed
    Steps:
      1. Navigate to /admin/posts/new
      2. Insert a math block via toolbar or $$...$$ syntax
      3. Type "E = mc^2"
    Expected Result: Formula renders as formatted equation in editor
    Failure Indicators: Raw LaTeX visible, math block not rendered
    Evidence: .sisyphus/evidence/task-16-latex-editor.png

  Scenario: Image upload inserts into editor
    Tool: Playwright
    Preconditions: Logged in, R2 binding working
    Steps:
      1. Navigate to /admin/posts/new
      2. Click Image button in toolbar
      3. Upload a test image file
    Expected Result: Image appears in editor content
    Failure Indicators: Upload error, image not inserted, broken image
    Evidence: .sisyphus/evidence/task-16-image-upload.png
  ```

  **Commit**: YES
  - Message: `feat: add Tiptap editor with LaTeX support and post create/edit pages`
  - Files: `admin/src/components/Editor.tsx, admin/src/pages/EditPost.tsx, admin/src/pages/NewPost.tsx`

- [x] 17. Comment Moderation Page

  **What to do**:
  - 创建 `admin/src/pages/Comments.tsx` — 评论管理页面：
    - 筛选标签：全部 / 待审核(pending) / 已通过(approved) / 已拒绝(rejected)
    - 评论列表：每条显示 authorName, content(截断), 关联文章标题, 提交时间, 状态标签
    - 操作按钮：通过(approve) / 拒绝(reject) / 删除(delete)
    - 批量操作：全选 + 批量通过/拒绝
    - 空状态：各筛选条件下的空提示
  - 调用 API：
    - `GET /api/admin/comments?status=...&page=...` — 获取评论列表
    - `PUT /api/admin/comments/:id` — 审核评论
    - `DELETE /api/admin/comments/:id` — 删除评论

  **Must NOT do**:
  - 不允许编辑评论内容（只审核/删除）
  - 不显示评论者邮箱（隐私）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 标准 CRUD 列表页，中等复杂度
  - **Skills**: [`/frontend-ui-ux`]
    - `/frontend-ui-ux`: 列表 UI 和筛选交互

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 16, 18)
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 4, 8, 15

  **References**:
  **API/Type References**:
  - `GET /api/admin/comments` (Task 8) — 评论列表 API
  - `PUT /api/admin/comments/:id` (Task 8) — 审核评论 API
  - `DELETE /api/admin/comments/:id` (Task 8) — 删除评论 API

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: List pending comments with filter
    Tool: Playwright
    Preconditions: Logged in, pending comments exist
    Steps:
      1. Navigate to /admin/comments
      2. Click "Pending" filter tab
    Expected Result: Only comments with status "pending" shown, each with approve/reject buttons
    Failure Indicators: All comments shown regardless of status, no filter
    Evidence: .sisyphus/evidence/task-17-filter.png

  Scenario: Approve a pending comment
    Tool: Playwright
    Preconditions: Pending comment exists
    Steps:
      1. Navigate to /admin/comments
      2. Click "Approve" button on first pending comment
      3. Wait for UI update
    Expected Result: Comment status changes to "approved", moves out of pending list
    Failure Indicators: Comment stays pending, API error
    Evidence: .sisyphus/evidence/task-17-approve.png

  Scenario: Delete a comment
    Tool: Playwright
    Preconditions: Comments exist
    Steps:
      1. Navigate to /admin/comments
      2. Click "Delete" button on a comment
      3. Confirm deletion (if confirmation dialog)
    Expected Result: Comment removed from list
    Failure Indicators: Comment still visible, API error
    Evidence: .sisyphus/evidence/task-17-delete.png
  ```

  **Commit**: YES
  - Message: `feat: add comment moderation page with filter and batch actions`
  - Files: `admin/src/pages/Comments.tsx`

- [x] 18. Post List + Management Page

  **What to do**:
  - 创建 `admin/src/pages/Posts.tsx` — 文章管理列表：
    - 筛选：全部 / 已发布 / 草稿
    - 搜索：按标题搜索（前端过滤，数据量小）
    - 文章列表表格：标题, 状态(published/draft 标签), 标签, 发布日期, 操作
    - 操作：编辑（跳转 /admin/posts/:id/edit）, 删除（确认对话框）
    - 新建按钮：跳转 /admin/posts/new
    - 分页
  - 调用 API：
    - `GET /api/posts?status=...&page=...` — 文章列表
    - `DELETE /api/posts/:id` — 删除文章

  **Must NOT do**:
  - 不在内联编辑（跳转编辑页）
  - 不显示文章内容全文（只显示标题和元信息）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 标准 CRUD 列表页
  - **Skills**: [`/frontend-ui-ux`]
    - `/frontend-ui-ux`: 列表 UI 和交互

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 16, 17)
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 4, 6, 15

  **References**:
  **API/Type References**:
  - `GET /api/posts` (Task 6) — 文章列表 API
  - `DELETE /api/posts/:id` (Task 6) — 删除文章 API

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Post list with status filter
    Tool: Playwright
    Preconditions: Logged in, posts exist
    Steps:
      1. Navigate to /admin/posts
      2. Click "Draft" filter
    Expected Result: Only draft posts shown, each with edit and delete buttons
    Failure Indicators: All posts shown, no filter, missing buttons
    Evidence: .sisyphus/evidence/task-18-post-list.png

  Scenario: Delete a post with confirmation
    Tool: Playwright
    Preconditions: Posts exist
    Steps:
      1. Navigate to /admin/posts
      2. Click "Delete" on a post
      3. Confirm in dialog
    Expected Result: Post removed from list
    Failure Indicators: Post still visible, no confirmation, API error
    Evidence: .sisyphus/evidence/task-18-delete-post.png

  Scenario: New post button navigates correctly
    Tool: Playwright
    Preconditions: Logged in
    Steps:
      1. Navigate to /admin/posts
      2. Click "New Post" button
    Expected Result: URL changes to /admin/posts/new, editor loads
    Failure Indicators: Wrong URL, editor not loading
    Evidence: .sisyphus/evidence/task-18-new-post.png
  ```

  **Commit**: YES
  - Message: `feat: add post list management page with filter and actions`
  - Files: `admin/src/pages/Posts.tsx`

### Wave 5 — Deploy + Tests

- [x] 19. Build Pipeline + Deploy + Custom Domain

  **What to do**:
  - 创建 `scripts/build.sh` — 完整构建脚本：
    ```bash
    #!/bin/bash
    set -e
    echo "Building admin SPA..."
    cd admin && npm run build && cd ..
    echo "Build complete. Deploying..."
    source .env
    CF_API_TOKEN=$CF_API_TOKEN npx wrangler deploy
    ```
  - 配置根 `package.json` scripts：
    - `"dev"`: `wrangler dev`（启动 Worker 本地开发）
    - `"dev:admin"`: `cd admin && npm run dev`（启动 Admin SPA 开发）
    - `"build"`: `cd admin && npm run build`
    - `"build:deploy"`: `bash scripts/build.sh`
    - `"deploy"`: `bash scripts/build.sh`
    - `"db:generate"`: `drizzle-kit generate`
    - `"db:migrate:local"`: `wrangler d1 migrations apply blog-db --local`
    - `"db:migrate:prod"`: `wrangler d1 migrations apply blog-db --remote`
    - `"d1:create"`: `wrangler d1 create blog-db`
    - `"r2:create"`: `wrangler r2 bucket create blog-images`
    - `"secret:set"`: `wrangler secret put`
  - 更新 `wrangler.toml`：
    - 确认 database_id 已填入（从 `wrangler d1 create` 输出获取）
    - 确认 routes 配置 mrwuliu.top
  - 创建部署文档脚本：设置 Workers Secrets（ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET）
  - 验证 mrwuliu.top 域名在 Cloudflare 中已添加为站点
  - 执行完整部署流程

  **Must NOT do**:
  - 不在 CI/CD 中硬编码 secrets
  - 不使用 `wrangler whoami` 登录（用 CF_API_TOKEN 环境变量）
  - 不跳过 admin SPA 构建直接部署

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及多个系统（构建、D1 创建、R2 创建、域名配置、secrets 设置）
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on all prior tasks)
  - **Blocks**: Task 20, Final
  - **Blocked By**: All prior tasks (1-18)

  **References**:
  **Pattern References**:
  - Rin `cli/src/tasks/deploy-cf.ts` — 一键部署脚本参考

  **External References**:
  - Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
  - Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
  - Workers Secrets: https://developers.cloudflare.com/workers/configuration/secrets/

  **WHY Each Reference Matters**:
  - CF_API_TOKEN 环境变量认证（非交互式登录）
  - Custom domain 自动配置 DNS + SSL
  - Secrets 加密存储敏感配置

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full build pipeline succeeds
    Tool: Bash
    Preconditions: All source code in place
    Steps:
      1. Run `npm run build`
      2. Check `public/admin/index.html` exists
      3. Check `public/admin/assets/` contains JS/CSS
    Expected Result: Admin SPA built successfully, static assets in public/
    Failure Indicators: Build error, missing output files
    Evidence: .sisyphus/evidence/task-19-build.txt

  Scenario: Wrangler deploy succeeds
    Tool: Bash
    Preconditions: CF_API_TOKEN in .env, D1 and R2 resources created
    Steps:
      1. Run `npm run deploy`
      2. Wait for "Published" message
    Expected Result: Worker deployed successfully, URL printed
    Failure Indicators: Auth error, binding error, deployment failed
    Evidence: .sisyphus/evidence/task-19-deploy.txt

  Scenario: Blog accessible at deployed URL
    Tool: Bash (curl)
    Preconditions: Deployment successful
    Steps:
      1. `curl -s https://mrwuliu.top/ -o /dev/null -w "%{http_code}"`
    Expected Result: HTTP 200
    Failure Indicators: 5xx error, DNS not resolving, SSL error
    Evidence: .sisyphus/evidence/task-19-live.txt

  Scenario: Admin SPA accessible at /admin
    Tool: Bash (curl)
    Preconditions: Deployment successful
    Steps:
      1. `curl -s https://mrwuliu.top/admin/ -o /dev/null -w "%{http_code}"`
    Expected Result: HTTP 200, HTML contains React root div
    Failure Indicators: 404, assets not served
    Evidence: .sisyphus/evidence/task-19-admin-live.txt
  ```

  **Commit**: YES
  - Message: `feat: add build pipeline, deploy scripts, and custom domain config`
  - Files: `scripts/build.sh, package.json (update scripts), wrangler.toml (update database_id)`

- [ ] 20. Integration Tests

  **What to do**:
  - 配置 `vitest` 测试框架：
    - 创建 `vitest.config.ts` — 配置 Workers 环境模拟
    - 安装：`vitest`, `@cloudflare/vitest-pool-workers`
  - 创建测试文件：
    - `tests/api/posts.test.ts` — 文章 CRUD API 测试（创建、读取、更新、删除、分页）
    - `tests/api/auth.test.ts` — 认证测试（登录成功/失败、JWT 验证、过期）
    - `tests/api/comments.test.ts` — 评论测试（提交、审核、拒绝、XSS 防护）
    - `tests/api/tags.test.ts` — 标签测试（CRUD、关联文章）
    - `tests/api/images.test.ts` — 图片测试（上传、服务、删除、类型验证）
  - 每个测试文件：3-5 个核心用例，覆盖正常流程和边界情况
  - 添加 `npm test` script

  **Must NOT do**:
  - 不写 UI 组件单元测试（成本高收益低）
  - 不 mock 整个数据库（使用 vitest-pool-workers 真实 D1 本地实例）
  - 不追求 100% 覆盖率（核心 API 路径覆盖即可）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 测试编写需要理解所有 API 接口和 Workers 测试模式
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final integration)
  - **Blocks**: Final
  - **Blocked By**: Task 19

  **References**:
  **Pattern References**:
  - SonicJS `tests/e2e/` — E2E 测试参考
  - `@cloudflare/vitest-pool-workers` — Workers 测试池

  **External References**:
  - Vitest Pool Workers: https://developers.cloudflare.com/workers/testing/vitest-integration/
  - Vitest 配置: https://vitest.dev/config/

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All integration tests pass
    Tool: Bash
    Preconditions: Test files created, vitest configured
    Steps:
      1. Run `npx vitest run`
    Expected Result: All tests pass, 0 failures
    Failure Indicators: Any test failure, configuration error
    Evidence: .sisyphus/evidence/task-20-tests.txt
  ```

  **Commit**: YES
  - Message: `test: add integration tests for all API endpoints`
  - Files: `vitest.config.ts, tests/**/*.test.ts`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message | Key Files |
|------|---------------|-----------|
| 1 | `feat: init project scaffolding and foundation` | package.json, wrangler.toml, src/index.ts, drizzle.config.ts |
| 1 | `feat: add D1 schema and Drizzle ORM setup` | src/db/schema.ts, migrations/0001_init.sql |
| 1 | `feat: add JWT auth system with bcryptjs` | src/middleware/auth.ts, src/routes/auth.ts |
| 1 | `feat: scaffold admin SPA with Vite+React+Tailwind` | admin/*, vite.config.ts |
| 1 | `feat: add R2 image storage service` | src/services/image.ts |
| 2 | `feat: add blog post CRUD API` | src/routes/posts.ts, src/db/queries.ts |
| 2 | `feat: add tag system API` | src/routes/tags.ts |
| 2 | `feat: add comment system with moderation` | src/routes/comments.ts |
| 2 | `feat: add image upload/serve API` | src/routes/images.ts |
| 3 | `feat: add SSR blog layout and minimalist CSS` | src/views/layout.tsx |
| 3 | `feat: add homepage SSR with pagination` | src/views/home.tsx, src/routes/blog.ts |
| 3 | `feat: add post detail SSR with LaTeX and comments` | src/views/post.tsx |
| 3 | `feat: add tag page and RSS feed` | src/views/tag.tsx, src/utils/rss.ts |
| 3 | `feat: add SEO meta tags and Open Graph` | src/views/components/seo.tsx |
| 4 | `feat: add admin layout, auth guard, dashboard` | admin/src/components/Layout.tsx |
| 4 | `feat: add Tiptap editor with LaTeX support` | admin/src/components/Editor.tsx |
| 4 | `feat: add comment moderation page` | admin/src/pages/Comments.tsx |
| 4 | `feat: add post list and management page` | admin/src/pages/Posts.tsx |
| 5 | `feat: add build pipeline and deploy config` | scripts/build.sh, wrangler.toml updates |
| 5 | `test: add integration tests` | tests/* |

---

## Success Criteria

### Verification Commands
```bash
wrangler dev                                    # Expected: local dev server starts on :8787
curl http://localhost:8787/                     # Expected: HTML blog homepage
curl http://localhost:8787/feed.xml             # Expected: valid RSS XML
curl http://localhost:8787/api/posts            # Expected: JSON array of posts
npx vitest run                                  # Expected: all tests pass
wrangler deploy                                 # Expected: deployed to mrwuliu.top
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Blog accessible at mrwuliu.top
- [ ] Admin panel accessible at mrwuliu.top/admin
- [ ] Can create, edit, delete posts
- [ ] LaTeX formulas render correctly
- [ ] Images upload and display correctly
- [ ] Comments require admin approval
- [ ] RSS feed valid
- [ ] Tags work with filtering
