# 前端性能全面优化

## TL;DR

> **Quick Summary**: 系统性优化博客前端性能，解决 Tailwind CDN 运行时阻塞、数据库 N+1 查询、无 HTTP 缓存等核心问题，预计 FCP 改善 500ms-2s。
> 
> **Deliverables**:
> - 生产级 Tailwind CSS 构建流程（替换 CDN）
> - 修复所有 N+1 数据库查询（首页、标签页、Tags API）
> - HTTP 缓存中间件（Cache-Control 头）
> - 文章详情页查询并行化 + 去冗余
> - 图片懒加载 + CLS 防护
> - 共享组件提取 + 代码去重
> - 数据库复合索引
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves + 1 final verification wave
> **Critical Path**: T1(Tailwind build) → T7(Replace CDN) → T14(KaTeX条件加载) → Final

---

## Context

### Original Request
用户反映博客前端所有页面浏览存在卡顿，需要做性能优化。

### Interview Summary
**Key Discussions**:
- 卡顿场景: 所有页面都慢
- 优化策略: 全面优化（构建时 Tailwind + 数据库 + 缓存 + 图片 + 组件去重）
- 构建步骤: 可以接受添加
- 测试策略: 仅 Agent QA 验证

**Research Findings**:
- **Tailwind CDN**: `cdn.tailwindcss.com` 每次加载 ~330KB JS + 浏览器端 CSS JIT 编译，严重阻塞渲染
- **N+1 查询**: 首页 22 次 DB 查询、标签页相同模式、Tags API 同样问题
- **无缓存**: 所有 SSR 页面无 Cache-Control 头，未利用 Cloudflare 边缘缓存
- **冗余查询**: 文章详情页同一文章查两次、5 个串行查询可并行
- **SELECT ***: 首页/列表页加载完整 content 字段但从不使用
- **图片**: 无 lazy loading、无尺寸属性（CLS）
- **组件**: PostCard、Pagination、formatDate 在多文件中重复定义

### Metis Review
**Identified Gaps** (addressed):
- RSS feed 仅用 title/slug/excerpt/publishedAt，不需要 content → 新查询函数可安全复用到 RSS
- 管理后台的 admin/ 下依赖独立的 Tailwind 构建流程 → 不要干扰 admin 的 Tailwind 配置
- getPostWithTags 查询在 admin API 中也被使用 → 保留原函数，新增函数不破坏现有 API
- 必须区分「列表页查询（不含 content）」和「详情页查询（含 content）」→ 创建两个独立查询函数
- D1 数据库在 Workers 中冷启动可能有延迟 → 缓存策略更关键

---

## Work Objectives

### Core Objective
消除博客前端所有已知性能瓶颈，将页面加载体验从「明显卡顿」提升到「流畅」。

### Concrete Deliverables
- `tailwind.config.js` + `postcss.config.js` + 构建脚本（博客前端）
- `public/css/tailwind.css` — 生产级 Tailwind CSS（~10-30KB）
- `src/views/layout.tsx` — 移除 CDN script，改用静态 CSS link
- `src/db/queries.ts` — 新增 `getPublishedPostSummaries()` + `getPostsWithTagsBatch()`
- `migrations/xxxx_*.sql` — 复合索引 migration
- `src/middleware/cache.ts` — Cache-Control 中间件
- `src/views/components/post-card.tsx` — 提取共享 PostCard 组件
- `src/views/components/pagination.tsx` — 提取共享 Pagination 组件
- `src/views/components/format-date.tsx` — 提取共享 formatDate 工具
- 所有 `<img>` 添加 `loading="lazy"` + `width`/`height`/`decoding="async"`

### Definition of Done
- [ ] 所有页面不再加载 `cdn.tailwindcss.com`
- [ ] 首页 DB 查询数 ≤ 3（当前 22）
- [ ] 所有 SSR 页面有 Cache-Control 头
- [ ] `bun run typecheck` 通过
- [ ] 所有页面渲染正确（Playwright 验证）

### Must Have
- 替换 Tailwind CDN 为构建时 CSS
- 修复所有 N+1 查询
- 添加 HTTP 缓存头
- 文章详情页查询并行化
- 图片添加 lazy loading + 尺寸属性
- 提取共享组件消除重复
- 添加数据库复合索引
- 列表页不查询 content 字段
- listImages 使用 COUNT(*) 替代 SELECT *
- writings 页面使用摘要查询

### Must NOT Have (Guardrails)
- 不修改管理后台代码（admin/ 目录）
- 不添加客户端 JS 框架（React/Vue 等）
- 不修改 admin 的 Tailwind 构建配置
- 不删除现有 getPostWithTags 等函数（admin API 依赖）
- 不修改 drizzle schema 定义（只加索引 migration）
- 不添加新功能（语法高亮等属于新功能，不在本次范围）
- 不改变现有 URL 路由结构
- 不在构建流程中使用 esbuild/webpack 打包博客前端 SSR 代码

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: None for this task (performance optimization, not feature dev)
- **Framework**: N/A

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate to pages, verify DOM elements, check no console errors
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields + response headers
- **Build**: Use Bash — Run build commands, verify file existence and sizes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 6 tasks, ALL parallel, no deps):
├── T1:  Tailwind 构建流水线搭建 [quick]
├── T2:  数据库复合索引 migration [quick]
├── T3:  提取共享组件 (PostCard, Pagination, formatDate) [quick]
├── T4:  新增高效查询函数 [deep]
├── T5:  Cache-Control 缓存中间件 [quick]
└── T6:  修复 listImages 计数查询 [quick]

Wave 2 (Core Optimization — 6 tasks, after Wave 1):
├── T7:  替换 Tailwind CDN 为构建产物 → T1 [quick]
├── T8:  重构首页渲染 (N+1 修复) → T3, T4 [deep]
├── T9:  重构标签页渲染 (N+1 修复) → T3, T4 [deep]
├── T10: 优化文章详情页 (并行查询 + 去冗余) → T4 [deep]
├── T11: 修复 Tags API N+1 查询 → T4 [quick]
└── T12: 优化 writings 页面查询 → T4 [quick]

Wave 3 (Polish — 2 tasks, after Wave 2):
├── T13: 图片性能优化 (lazy + dimensions) → T3, T7 [quick]
└── T14: KaTeX CSS 条件加载 → T7, T10 [quick]

Wave FINAL (Verification — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: T1 → T7 → T14 → Final
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Wave 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1   | — | T7 | 1 |
| T2   | — | — | 1 |
| T3   | — | T8, T9, T13 | 1 |
| T4   | — | T8, T9, T10, T11, T12 | 1 |
| T5   | — | — | 1 |
| T6   | — | — | 1 |
| T7   | T1 | T13, T14 | 2 |
| T8   | T3, T4 | — | 2 |
| T9   | T3, T4 | — | 2 |
| T10  | T4 | T14 | 2 |
| T11  | T4 | — | 2 |
| T12  | T4 | — | 2 |
| T13  | T3, T7 | — | 3 |
| T14  | T7, T10 | — | 3 |
| F1-F4| All above | — | Final |

### Agent Dispatch Summary

- **Wave 1**: **6** — T1→`quick`, T2→`quick`, T3→`quick`, T4→`deep`, T5→`quick`, T6→`quick`
- **Wave 2**: **6** — T7→`quick`, T8→`deep`, T9→`deep`, T10→`deep`, T11→`quick`, T12→`quick`
- **Wave 3**: **2** — T13→`quick`, T14→`quick`
- **FINAL**: **4** — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. Tailwind 构建流水线搭建

  **What to do**:
  - 在项目根目录（非 admin/）创建 `tailwind.config.js`，content 扫描 `src/views/**/*.tsx`
  - 在项目根目录创建 `postcss.config.js`（如已有则更新）
  - 在项目根目录安装 devDependencies：`tailwindcss`、`postcss`、`autoprefixer`
  - 创建 `src/styles/input.css`，写入 `@tailwind base; @tailwind components; @tailwind utilities;` 以及当前 `public/css/style.css` 的全部内容
  - 更新 `scripts/build.sh`，在部署前添加 Tailwind CSS 构建步骤：`npx tailwindcss -i src/styles/input.css -o public/css/tailwind.css --minify`
  - 确认构建产物输出到 `public/css/tailwind.css`
  - 确保 `public/css/style.css` 的内容被合并进新构建产物中（后续可删除 style.css）

  **Must NOT do**:
  - 不修改 admin/ 目录下的任何 Tailwind/PostCSS 配置
  - 不使用 admin/ 的 tailwind.config.js（两个项目独立配置）
  - 不引入 webpack/esbuild 打包工具

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准化的配置文件创建，步骤明确
  - **Skills**: [`/git-master`]
    - `/git-master`: 可能需要查看现有 build.sh 和 admin 的配置作为参考

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4, T5, T6)
  - **Blocks**: T7 (替换 Tailwind CDN)
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `admin/tailwind.config.js` — 管理后台的 Tailwind 配置（参考格式，但 content 路径不同）
  - `admin/postcss.config.js` — 管理后台的 PostCSS 配置（参考格式）
  - `scripts/build.sh` — 现有构建脚本（需要在此追加 Tailwind 构建步骤）

  **API/Type References**:
  - `public/css/style.css` — 现有自定义 CSS（需合并到 Tailwind input.css）

  **External References**:
  - Tailwind CLI docs: `https://tailwindcss.com/docs/installation` — 使用 Tailwind CLI 构建

  **WHY Each Reference Matters**:
  - `admin/tailwind.config.js`: 复制配置格式但 content 路径改为 `src/views/**/*.tsx`
  - `scripts/build.sh`: 在现有构建流程中追加 CSS 构建步骤
  - `public/css/style.css`: 内容需合并到新 input.css 避免丢失自定义样式

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tailwind 构建成功生成 CSS 文件
    Tool: Bash
    Preconditions: devDependencies 已安装
    Steps:
      1. 运行 `npx tailwindcss -i src/styles/input.css -o public/css/tailwind.css --minify`
      2. 检查 `public/css/tailwind.css` 文件是否存在
      3. 检查文件大小 < 50KB（生产级 Tailwind CSS 应远小于此）
      4. 检查文件中包含 `flex`、`grid`、`p-`、`text-` 等 Tailwind 工具类
      5. 检查文件中包含原 style.css 的自定义样式（如 `.post-content`）
    Expected Result: CSS 文件存在，大小 < 50KB，包含所需工具类和自定义样式
    Failure Indicators: 文件不存在、文件 > 100KB（未 purge）、缺少自定义样式
    Evidence: .sisyphus/evidence/task-1-tailwind-build.txt

  Scenario: 构建脚本集成
    Tool: Bash
    Preconditions: scripts/build.sh 已更新
    Steps:
      1. 读取 `scripts/build.sh` 内容
      2. 验证包含 `tailwindcss` 命令
      3. 验证输出路径为 `public/css/tailwind.css`
    Expected Result: build.sh 包含 Tailwind CSS 构建步骤
    Failure Indicators: build.sh 中无 tailwindcss 相关命令
    Evidence: .sisyphus/evidence/task-1-build-script.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `perf(build): add Tailwind CSS build pipeline for production`
  - Files: `tailwind.config.js`, `postcss.config.js`, `src/styles/input.css`, `scripts/build.sh`, `package.json`
  - Pre-commit: `npx tailwindcss -i src/styles/input.css -o public/css/tailwind.css --minify`

- [x] 2. 数据库复合索引 Migration

  **What to do**:
  - 运行 `bun run db:generate` 或手动创建新的 migration 文件
  - 添加以下复合索引：
    - `CREATE INDEX posts_status_published_at_idx ON posts(status, published_at);` — 首页最频繁查询
    - `CREATE INDEX comments_post_id_status_idx ON comments(post_id, status);` — 文章详情页评论查询
    - `CREATE INDEX post_tags_tag_id_post_id_idx ON post_tags(tag_id, post_id);` — 标签页 JOIN 查询
  - 本地运行 `bun run db:migrate:local` 验证 migration 成功

  **Must NOT do**:
  - 不修改 `src/db/schema.ts`（Drizzle schema 定义不变）
  - 不修改现有索引
  - 不在生产环境运行 migration（仅生成本地验证）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单纯的 SQL migration 文件创建
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4, T5, T6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `migrations/0000_rich_loa.sql` — 初始 migration（参考格式和现有索引定义）
  - `migrations/0001_keen_ultron.sql` — 第二个 migration（参考格式）

  **API/Type References**:
  - `src/db/schema.ts` — 表结构定义（确认列名与索引匹配）

  **WHY Each Reference Matters**:
  - `migrations/0000_rich_loa.sql`: 复制 SQL 格式，确认现有索引名称避免冲突
  - `src/db/schema.ts`: 确认列名精确匹配（如 `publishedAt` → `published_at`）

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Migration 文件创建正确
    Tool: Bash
    Preconditions: 无
    Steps:
      1. 读取最新生成的 migration SQL 文件
      2. 验证包含 `posts_status_published_at_idx` 索引
      3. 验证包含 `comments_post_id_status_idx` 索引
      4. 验证包含 `post_tags_tag_id_post_id_idx` 索引
      5. 验证 SQL 语法正确（CREATE INDEX 语句）
    Expected Result: Migration 文件包含 3 个复合索引定义
    Failure Indicators: 缺少索引、列名错误、SQL 语法错误
    Evidence: .sisyphus/evidence/task-2-migration.txt

  Scenario: Migration 本地执行成功
    Tool: Bash
    Preconditions: 本地 D1 环境
    Steps:
      1. 运行 `bun run db:migrate:local`
      2. 检查输出无错误
    Expected Result: Migration 成功应用，无错误输出
    Failure Indicators: SQL 错误、索引已存在、列名不匹配
    Evidence: .sisyphus/evidence/task-2-migrate-local.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `perf(db): add composite indexes for frequent queries`
  - Files: `migrations/xxxx_*.sql`

- [x] 3. Extract shared components (PostCard, Pagination, formatDate)

  **What to do**:
  - 创建 `src/views/components/post-card.tsx`，从 `src/views/home.tsx` 提取 `PostCard` 组件
  - 创建 `src/views/components/pagination.tsx`，从 `src/views/home.tsx` 提取 `Pagination` 组件
  - 创建 `src/views/components/format-date.tsx`，提取 `formatDate` 工具函数
  - 更新 `src/views/home.tsx`：移除内联的 PostCard/Pagination/formatDate 定义，改为 import
  - 更新 `src/views/tag.tsx`：移除内联的 PostCard/Pagination/formatDate 定义，改为 import
  - 更新 `src/views/post.tsx`：移除内联 formatDate 定义，改为 import
  - 更新 `src/views/writings.tsx`：移除内联 formatDate 定义，改为 import
  - 更新 `src/views/project-detail.tsx`：移除内联 formatDate 定义，改为 import
  - 确保提取的组件接口与原来完全一致（相同的 props、相同的渲染输出）

  **Must NOT do**:
  - 不修改组件的渲染逻辑或样式（纯重构，行为不变）
  - 不合并两个 PostCard 的细微差异（如果存在，以 home.tsx 版本为准）
  - 不修改管理后台代码

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准组件提取重构，无逻辑变更
  - **Skills**: [`/git-master`]
    - `/git-master`: 需要精确对比两个 PostCard 的差异

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4, T5, T6)
  - **Blocks**: T8, T9, T13
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/views/home.tsx:45-70` — PostCard 组件定义（主版本）
  - `src/views/home.tsx:72-100` — Pagination 组件定义
  - `src/views/tag.tsx:47-72` — PostCard 组件定义（可能略有不同）
  - `src/views/tag.tsx:74-102` — Pagination 组件定义

  **API/Type References**:
  - `src/views/post.tsx` — formatDate 函数（提取对比）
  - `src/views/writings.tsx` — formatDate 函数（提取对比）
  - `src/views/project-detail.tsx` — formatDate 函数（提取对比）

  **WHY Each Reference Matters**:
  - 需要对比 home.tsx 和 tag.tsx 中 PostCard/Pagination 的差异，提取时取并集
  - formatDate 在多个文件中可能有细微格式差异，需统一

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 组件提取后页面渲染不变
    Tool: Bash (curl)
    Preconditions: dev server 运行
    Steps:
      1. 运行 `bun run dev`
      2. curl -s http://localhost:8787/ | grep -o '<article' | wc -l  # 首页文章数
      3. curl -s http://localhost:8787/ | grep -o 'class="pagination' | wc -l  # 分页存在
      4. curl -s http://localhost:8787/tags/test | grep -o '<article' | wc -l  # 标签页文章数
    Expected Result: 首页和标签页渲染结果与提取前相同
    Failure Indicators: 页面报错、缺少组件、样式丢失
    Evidence: .sisyphus/evidence/task-3-component-extract.txt

  Scenario: TypeScript 编译通过
    Tool: Bash
    Preconditions: 组件已提取
    Steps:
      1. 运行 `bun run typecheck`
    Expected Result: 无类型错误
    Failure Indicators: import 路径错误、props 类型不匹配
    Evidence: .sisyphus/evidence/task-3-typecheck.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `refactor(views): extract shared components (PostCard, Pagination, formatDate)`
  - Files: `src/views/components/post-card.tsx`, `src/views/components/pagination.tsx`, `src/views/components/format-date.tsx`, `src/views/home.tsx`, `src/views/tag.tsx`, `src/views/post.tsx`, `src/views/writings.tsx`, `src/views/project-detail.tsx`

- [x] 4. 新增高效查询函数

  **What to do**:
  - 在 `src/db/queries.ts` 中新增以下查询函数：

    **`getPublishedPostSummaries(db, { page, limit })`**
    - 仅查询 `id, title, slug, excerpt, publishedAt, createdAt, status`（排除 content）
    - WHERE status='published'，ORDER BY publishedAt DESC
    - 同时返回 total count（单次 COUNT 查询）
    - 用于：首页、writings 页、RSS feed

    **`getPostsWithTagsBatch(db, postIds: string[])`**
    - 输入一组 post ID，输出 Map<postId, Tag[]>
    - 使用单次 JOIN 查询：`SELECT pt.post_id, t.* FROM post_tags pt INNER JOIN tags t ON pt.tag_id = t.id WHERE pt.post_id IN (...)`
    - 在 JS 中按 post_id 分组
    - 替代循环中逐个调用 getPostWithTags

    **`getAdjacentPosts(db, postId, publishedAt)`**
    - 单次查询同时获取 prev 和 next：使用 UNION ALL 或两条并行查询
    - 返回 `{ prev: PostSummary | null, next: PostSummary | null }`
    - 仅查 slug + title

    **`getPublishedPostCountByTag(db)`**
    - 使用 GROUP BY 单次查询所有标签的文章计数
    - 返回 `Map<tagId, count>`
    - 用于 Tags API 替代 N+1 计数

  - 保留所有现有查询函数不变（admin API 依赖它们）

  **Must NOT do**:
  - 不删除或修改 `getPublishedPosts`、`getPostWithTags` 等现有函数
  - 不修改 `src/db/schema.ts`
  - 不改变 admin API 的查询行为

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要深入理解 Drizzle ORM API 和 D1 查询模式，设计高效查询
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3, T5, T6)
  - **Blocks**: T8, T9, T10, T11, T12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/db/queries.ts:getPublishedPosts` — 现有查询函数（参考 WHERE/ORDER/LIMIT 模式）
  - `src/db/queries.ts:getPostWithTags` — 现有标签查询（参考 JOIN 模式，新函数需替换其循环调用）
  - `src/db/queries.ts:getAdjacentPost` — 现有上下篇查询（参考模式，新函数合并两次调用）

  **API/Type References**:
  - `src/db/schema.ts` — 表结构定义（tags, posts, postTags 的列名和关系）
  - `src/routes/blog.tsx:34-44` — 首页 N+1 模式（理解调用上下文）
  - `src/routes/blog.tsx:95-103` — 标签页 N+1 模式
  - `src/routes/blog.tsx:123-158` — 文章详情页查询模式
  - `src/routes/tags.ts:18-33` — Tags API N+1 模式

  **External References**:
  - Drizzle ORM relational queries: `https://orm.drizzle.team/docs/rqb` — JOIN 查询语法
  - Drizzle ORM with D1: `https://orm.drizzle.team/docs/get-started-sqlite` — D1 特有 API

  **WHY Each Reference Matters**:
  - `queries.ts` 现有函数：新函数必须与现有查询的 WHERE 条件和排序逻辑一致
  - `schema.ts`：确认 postTags 表的列名（postId, tagId）用于 JOIN
  - `blog.tsx` 路由：理解新函数的调用上下文，确保返回值格式匹配

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 新查询函数返回正确数据
    Tool: Bash (wrangler dev + curl)
    Preconditions: 本地 D1 有测试数据，dev server 运行
    Steps:
      1. 启动 `bun run dev`
      2. 验证 `getPublishedPostSummaries` 返回的 post 不含 content 字段：
         curl -s http://localhost:8787/ 确认首页正常渲染
      3. 验证 `getPostsWithTagsBatch` 返回的标签与原 getPostWithTags 一致
      4. 验证 `getPublishedPostCountByTag` 计数正确
    Expected Result: 所有新函数返回与原函数等价的结果（摘要查询排除 content）
    Failure Indicators: 数据缺失、标签为空、计数不匹配
    Evidence: .sisyphus/evidence/task-4-query-functions.txt

  Scenario: TypeScript 编译通过
    Tool: Bash
    Steps:
      1. 运行 `bun run typecheck`
    Expected Result: 无类型错误（新函数类型正确，现有函数未受影响）
    Evidence: .sisyphus/evidence/task-4-typecheck.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `perf(db): add optimized query functions for batch and summary queries`
  - Files: `src/db/queries.ts`

- [x] 5. Cache-Control 缓存中间件

  **What to do**:
  - 创建 `src/middleware/cache.ts`（或在合适位置创建缓存中间件）
  - 实现 Hono middleware，为 SSR 博客页面添加 `Cache-Control` 头：
    - 首页、列表页：`public, s-maxage=300, stale-while-revalidate=3600`（5 分钟缓存，1 小时 stale）
    - 文章详情页：`public, s-maxage=600, stale-while-revalidate=86400`（10 分钟缓存）
    - RSS feed：`public, s-maxage=1800`（30 分钟缓存）
    - 404 页面：`no-cache`
  - 在 `src/routes/blog.tsx` 中为每个路由应用缓存头
  - 确保 API 路由（`/api/*`）不受影响（保持无缓存或不设置 s-maxage）

  **Must NOT do**:
  - 不修改 API 路由的缓存行为
  - 不修改图片服务的缓存（已有 `max-age=31536000`）
  - 不使用 Cloudflare Cache API（仅用 Cache-Control 头）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准 Hono middleware，模式明确
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3, T4, T6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/index.ts` — Hono app 结构，理解 middleware 挂载方式
  - `src/routes/blog.tsx` — 博客路由定义（确定哪些路由需要缓存头）

  **API/Type References**:
  - `src/services/image.ts:89` — 已有的 Cache-Control 设置（参考格式）

  **WHY Each Reference Matters**:
  - `src/index.ts`: 确认中间件挂载位置（全局 vs 路由级别）
  - `image.ts`: 复制 Cache-Control 头格式

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: SSR 页面有 Cache-Control 头
    Tool: Bash (curl)
    Preconditions: dev server 运行
    Steps:
      1. curl -sI http://localhost:8787/ | grep -i cache-control
      2. curl -sI http://localhost:8787/tags-cloud | grep -i cache-control
      3. curl -sI http://localhost:8787/writings | grep -i cache-control
    Expected Result: 每个响应包含 Cache-Control 头，含 s-maxage 和 stale-while-revalidate
    Failure Indicators: 缺少 Cache-Control 头、s-maxage 值不正确
    Evidence: .sisyphus/evidence/task-5-cache-headers.txt

  Scenario: API 路由不受影响
    Tool: Bash (curl)
    Steps:
      1. curl -sI http://localhost:8787/api/health | grep -i cache-control
    Expected Result: API 响应的 Cache-Control 不含 s-maxage（或有适当的 no-cache/private）
    Evidence: .sisyphus/evidence/task-5-api-cache.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `perf(cache): add Cache-Control middleware for SSR pages`
  - Files: `src/middleware/cache.ts`, `src/routes/blog.tsx`

- [x] 6. 修复 listImages 计数查询

  **What to do**:
  - 在 `src/services/image.ts` 的 `listImages` 函数中：
    - 将 `const allRecords = await db.select().from(images)` 替换为 `const [{ count }] = await db.select({ count: sql<number>\`count(*)\` }).from(images)`
    - 导入 `sql` from `drizzle-orm`（如未导入）
  - 确保 `total` 返回值不变（仍然是数字）

  **Must NOT do**:
  - 不修改 listImages 的分页逻辑
  - 不修改其他 image service 函数

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单行查询替换
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3, T4, T5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/services/image.ts:117-134` — listImages 函数（当前使用 SELECT * 计数）
  - `src/db/queries.ts` — 其他使用 `sql\`count(*)\`` 的查询（参考 count 查询模式）

  **WHY Each Reference Matters**:
  - `image.ts:117-134`: 精确定位需要修改的代码行
  - `queries.ts`: 确认项目中 count 查询的标准写法

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: listImages 计数正确
    Tool: Bash
    Preconditions: 本地 D1 有图片数据
    Steps:
      1. 检查 image.ts 中 listImages 函数不再有 `db.select().from(images)` 用于计数
      2. 确认使用了 `count(*)` 聚合查询
    Expected Result: 计数使用 COUNT(*) 而非 SELECT * + .length
    Failure Indicators: 仍使用全表扫描
    Evidence: .sisyphus/evidence/task-6-listimages.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `perf(db): use COUNT(*) in listImages instead of SELECT *`
  - Files: `src/services/image.ts`

- [x] 7. 替换 Tailwind CDN 为构建产物

  **What to do**:
  - 在 `src/views/layout.tsx` 中：
    - 移除 `<script src="https://cdn.tailwindcss.com"></script>`（约第 18 行）
    - 移除 `<link rel="stylesheet" href="/css/style.css">`（已合并到 tailwind.css）
    - 添加 `<link rel="stylesheet" href="/css/tailwind.css">`
  - 确认所有页面仍然正确渲染（布局、颜色、间距等）
  - 验证不再加载 `cdn.tailwindcss.com`

  **Must NOT do**:
  - 不修改 HTML 结构或组件逻辑
  - 不移除 KaTeX CSS 的条件加载逻辑（那是 T14 的工作）
  - 不修改 RSS link 或 SEO meta 标签

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 精确的 3 行代码替换
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with T8, T9, T10, T11, T12)
  - **Blocks**: T13, T14
  - **Blocked By**: T1 (Tailwind 构建流水线)

  **References**:

  **Pattern References**:
  - `src/views/layout.tsx:16-28` — 完整的 head 区域（script/link 标签位置）

  **WHY Each Reference Matters**:
  - `layout.tsx:16-28`: 精确定位需要替换的 CDN script 和 style.css link

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: CDN script 已移除，静态 CSS 已替换
    Tool: Bash (curl + grep)
    Preconditions: dev server 运行，tailwind.css 已构建
    Steps:
      1. curl -s http://localhost:8787/ | grep "cdn.tailwindcss.com"  # 应无输出
      2. curl -s http://localhost:8787/ | grep "tailwind.css"  # 应有输出
      3. curl -s http://localhost:8787/ | grep "style.css"  # 应无输出（已合并）
    Expected Result: 无 CDN 引用，有静态 CSS 引用
    Failure Indicators: CDN script 仍存在、静态 CSS link 缺失
    Evidence: .sisyphus/evidence/task-7-replace-cdn.txt

  Scenario: 页面样式保持正确
    Tool: Bash (curl)
    Steps:
      1. curl -s http://localhost:8787/ | grep -c 'class="'  # Tailwind 类仍被使用
      2. curl -s http://localhost:8787/ | grep -o 'max-w-4xl\|mx-auto\|prose'  # 关键样式类存在
    Expected Result: HTML 中 Tailwind 类名保持不变，CSS 文件提供对应样式
    Evidence: .sisyphus/evidence/task-7-styles-correct.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `perf(css): replace Tailwind CDN with production build`
  - Files: `src/views/layout.tsx`

- [x] 8. 重构首页渲染 (N+1 修复)

  **What to do**:
  - 重构 `src/routes/blog.tsx` 中 `GET /` 路由（约 34-60 行）：
    1. 用 `getPublishedPostSummaries(db, { page, limit })` 替换 `getPublishedPosts(db, { page, limit })`
    2. 用 `getPostsWithTagsBatch(db, postIds)` 替换 `Promise.all(posts.map(post => getPostWithTags(...)))`
    3. 在 JS 中将 summaries 与 tags 合并
    4. 使用提取的共享组件 `PostCard` 和 `Pagination`
  - 查询数从 22 → 3（摘要查询 + count + 批量标签查询）

  **Must NOT do**:
  - 不修改页面渲染逻辑和 HTML 结构（仅优化数据获取）
  - 不改变分页参数或 URL 结构

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解现有查询模式并正确替换为新查询函数
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with T7, T9, T10, T11, T12)
  - **Blocks**: None
  - **Blocked By**: T3 (共享组件), T4 (新查询函数)

  **References**:

  **Pattern References**:
  - `src/routes/blog.tsx:34-60` — 当前首页路由完整代码（N+1 模式）
  - `src/views/home.tsx` — 首页视图（确认数据接口）

  **API/Type References**:
  - `src/db/queries.ts:getPublishedPostSummaries` — T4 新建的查询函数
  - `src/db/queries.ts:getPostsWithTagsBatch` — T4 新建的批量标签查询
  - `src/views/components/post-card.tsx` — T3 提取的 PostCard 组件
  - `src/views/components/pagination.tsx` — T3 提取的 Pagination 组件

  **WHY Each Reference Matters**:
  - `blog.tsx:34-60`: 精确理解当前查询逻辑，确保替换后数据流等价
  - 新查询函数：理解其返回类型和调用方式
  - 共享组件：确认 import 路径和 props 接口

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 首页渲染正确且查询数减少
    Tool: Bash (curl)
    Preconditions: dev server 运行，数据库有测试数据
    Steps:
      1. curl -s http://localhost:8787/ | grep -o '<article' | wc -l  # 文章数量正确
      2. curl -s http://localhost:8787/ | grep -o 'class="tag'  # 标签存在
      3. curl -s http://localhost:8787/ | grep -o 'class="pagination'  # 分页存在
      4. 检查 blog.tsx 中首页路由代码不再有 posts.map(async (post) => getPostWithTags...)
    Expected Result: 首页渲染与优化前完全相同，代码中无 N+1 模式
    Failure Indicators: 文章缺少标签、分页丢失、页面报错
    Evidence: .sisyphus/evidence/task-8-homepage.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `perf(homepage): fix N+1 queries with batch tag fetching`
  - Files: `src/routes/blog.tsx`, `src/views/home.tsx`

- [x] 9. 重构标签页渲染 (N+1 修复)

  **What to do**:
  - 重构 `src/routes/blog.tsx` 中 `GET /tags/:slug` 路由（约 85-120 行）：
    1. 用 `getPublishedPostSummaries` 替换当前的 `getPublishedPosts`（或新建带 tag 过滤的变体）
    2. 用 `getPostsWithTagsBatch` 替换循环中的 `getPostWithTags`
    3. 使用提取的共享组件 `PostCard` 和 `Pagination`
  - 保留标签名称查询和 allTags 查询（这些是必要的）

  **Must NOT do**:
  - 不修改标签 URL 结构
  - 不改变标签页的 SEO 行为

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 与 T8 类似的重构，需要正确理解标签过滤逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with T7, T8, T10, T11, T12)
  - **Blocks**: None
  - **Blocked By**: T3 (共享组件), T4 (新查询函数)

  **References**:

  **Pattern References**:
  - `src/routes/blog.tsx:85-120` — 当前标签页路由代码

  **API/Type References**:
  - `src/db/queries.ts` — T4 的新查询函数
  - `src/views/components/post-card.tsx` — T3 提取的 PostCard
  - `src/views/tag.tsx` — 标签页视图

  **WHY Each Reference Matters**:
  - `blog.tsx:85-120`: 理解标签页的完整数据获取流程（标签查询 + 文章查询 + 标签计数）

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 标签页渲染正确
    Tool: Bash (curl)
    Preconditions: dev server 运行，有标签数据
    Steps:
      1. curl -s http://localhost:8787/tags-cloud  # 获取标签列表
      2. 从响应中提取一个标签 slug
      3. curl -s http://localhost:8787/tags/{slug} | grep -o '<article'  # 文章存在
      4. curl -s http://localhost:8787/tags/{slug} | grep -o 'class="tag'  # 标签信息
    Expected Result: 标签页正确显示该标签下的文章和标签信息
    Failure Indicators: 文章列表为空、标签名称丢失、分页异常
    Evidence: .sisyphus/evidence/task-9-tag-page.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `perf(tags): fix N+1 queries on tag page`
  - Files: `src/routes/blog.tsx`, `src/views/tag.tsx`

- [x] 10. 优化文章详情页 (并行查询 + 去冗余)

  **What to do**:
  - 重构 `src/routes/blog.tsx` 中 `GET /posts/:slug` 路由（约 123-200 行）：
    1. 移除冗余的第二次文章查询：slug 查询已有完整 post，不再调用 `getPostWithTags`
    2. 用 `getPostsWithTagsBatch(db, [post.id])` 获取当前文章标签（复用批量查询）
    3. 用 `getAdjacentPosts(db, post.id, post.publishedAt)` 替换两次 `getAdjacentPost` 调用
    4. 将评论查询、上下篇查询用 `Promise.all` 并行化
    5. 保留 `renderLatex()` 和 `generateToc()` 调用位置不变
  - 查询数从 7 → 3-4（post查询 + 标签 + Promise.all[评论, 上下篇]）

  **Must NOT do**:
  - 不修改文章内容渲染逻辑（dangerouslySetInnerHTML 保持不变）
  - 不修改 TOC、评论、上下篇的 HTML 结构
  - 不修改 renderLatex 和 generateToc 的实现

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及多个查询的并行化重组，需要仔细保持数据流等价
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with T7, T8, T9, T11, T12)
  - **Blocks**: T14
  - **Blocked By**: T4 (新查询函数)

  **References**:

  **Pattern References**:
  - `src/routes/blog.tsx:123-200` — 当前文章详情路由完整代码

  **API/Type References**:
  - `src/db/queries.ts:getPostsWithTagsBatch` — 批量标签查询（传单个 id 的数组）
  - `src/db/queries.ts:getAdjacentPosts` — 合并的上下篇查询
  - `src/utils/latex.ts:renderLatex` — LaTeX 渲染函数（了解其输入输出）
  - `src/utils/latex.ts:generateToc` — TOC 生成函数

  **WHY Each Reference Matters**:
  - `blog.tsx:123-200`: 理解完整的查询序列和变量依赖关系
  - 新查询函数：理解替代函数的签名和返回类型

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 文章详情页渲染正确
    Tool: Bash (curl)
    Preconditions: dev server 运行，有已发布文章
    Steps:
      1. curl -s http://localhost:8787/ | grep -oP 'href="/posts/[^"]*"' | head -1  # 获取文章链接
      2. curl -s http://localhost:8787/posts/{slug} | grep -o 'class="post-content'  # 内容存在
      3. curl -s http://localhost:8787/posts/{slug} | grep -o 'class="toc'  # TOC 存在
      4. curl -s http://localhost:8787/posts/{slug} | grep -o 'class="post-nav'  # 上下篇导航存在
    Expected Result: 文章详情页内容、TOC、导航、标签全部正确渲染
    Failure Indicators: 内容缺失、TOC 为空、导航丢失
    Evidence: .sisyphus/evidence/task-10-post-detail.txt

  Scenario: 查询并行化正确
    Tool: Bash
    Steps:
      1. 检查 blog.tsx 文章详情路由代码
      2. 验证评论和上下篇查询使用 Promise.all
      3. 验证不再有冗余的 getPostWithTags 调用
    Expected Result: 无冗余查询，独立查询已并行化
    Evidence: .sisyphus/evidence/task-10-parallel.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `perf(post): parallelize queries and remove redundant fetch`
  - Files: `src/routes/blog.tsx`

- [x] 11. 修复 Tags API N+1 查询

  **What to do**:
  - 重构 `src/routes/tags.ts` 中 `GET /` 路由（约 18-33 行）：
    - 用 `getPublishedPostCountByTag(db)` 替换当前的 `allTags.map(async tag => count query)` N+1 模式
    - 在 JS 中将标签信息与计数合并
  - 参考 `src/routes/blog.tsx` 中 tags-cloud 页面的高效 GROUP BY 查询模式

  **Must NOT do**:
  - 不修改 Tags API 的响应格式（保持向后兼容）
  - 不修改 POST/PUT/DELETE 等其他 Tags API 端点

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单个路由函数的查询替换，模式参考已存在
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with T7, T8, T9, T10, T12)
  - **Blocks**: None
  - **Blocked By**: T4 (新查询函数 getPublishedPostCountByTag)

  **References**:

  **Pattern References**:
  - `src/routes/tags.ts:18-33` — 当前 N+1 查询代码
  - `src/routes/blog.tsx:230-243` — tags-cloud 页面的 GROUP BY 查询（正确模式参考）

  **API/Type References**:
  - `src/db/queries.ts:getPublishedPostCountByTag` — T4 新建的计数查询函数

  **WHY Each Reference Matters**:
  - `tags.ts:18-33`: 理解当前 N+1 模式和响应格式
  - `blog.tsx:230-243`: 已验证的高效模式，直接参考

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tags API 返回正确计数
    Tool: Bash (curl)
    Preconditions: dev server 运行
    Steps:
      1. curl -s http://localhost:8787/api/tags | python3 -m json.tool
      2. 验证每个标签对象包含 id, name, slug, postCount 字段
      3. 验证 postCount > 0 的标签确实有已发布文章
    Expected Result: Tags API 响应格式与优化前一致，计数正确
    Failure Indicators: postCount 全为 0、字段缺失、响应格式变化
    Evidence: .sisyphus/evidence/task-11-tags-api.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `perf(api): fix N+1 query in tags API with GROUP BY`
  - Files: `src/routes/tags.ts`

- [x] 12. 优化 writings 页面查询

  **What to do**:
  - 重构 `src/routes/blog.tsx` 中 `GET /writings` 路由（约 217 行）：
    - 将 `getPublishedPosts(db, { page: 1, limit: 1000 })` 替换为 `getPublishedPostSummaries(db, { page: 1, limit: 1000 })`
    - 排除 content 字段（writings 页面只显示标题和日期，不需要内容）
  - 使用提取的 `formatDate` 共享组件

  **Must NOT do**:
  - 不修改 writings 页面的渲染逻辑和 HTML 结构
  - 不修改分页参数（limit: 1000 保持不变，后续可考虑改为真分页）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单个查询函数替换
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with T7, T8, T9, T10, T11)
  - **Blocks**: None
  - **Blocked By**: T4 (新查询函数)

  **References**:

  **Pattern References**:
  - `src/routes/blog.tsx:217` — 当前 writings 查询（加载全部 content）

  **API/Type References**:
  - `src/db/queries.ts:getPublishedPostSummaries` — T4 新建的摘要查询
  - `src/views/writings.tsx` — writings 页面视图（确认只需 title/date/slug）
  - `src/views/components/format-date.tsx` — T3 提取的 formatDate

  **WHY Each Reference Matters**:
  - `blog.tsx:217`: 精确定位需要替换的查询调用
  - `writings.tsx`: 确认视图只使用哪些字段

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: writings 页面渲染正确
    Tool: Bash (curl)
    Preconditions: dev server 运行
    Steps:
      1. curl -s http://localhost:8787/writings | grep -o '<article' | wc -l  # 文章数量
      2. curl -s http://localhost:8787/writings | grep -oP 'href="/posts/[^"]*"' | wc -l  # 链接数
    Expected Result: writings 页面文章列表完整渲染
    Failure Indicators: 列表为空、链接缺失
    Evidence: .sisyphus/evidence/task-12-writings.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `perf(writings): use summary query without content field`
  - Files: `src/routes/blog.tsx`, `src/views/writings.tsx`

- [x] 13. 图片性能优化 (lazy + dimensions)

  **What to do**:
  - 在所有 `<img>` 标签中添加性能属性：
    - `loading="lazy"` — 延迟加载视口外图片
    - `decoding="async"` — 异步解码
    - `width` 和 `height` 属性 — 防止 CLS（布局偏移）
  - 涉及文件：
    - `src/views/projects.tsx` — 项目列表图片
    - `src/views/project-detail.tsx` — 项目详情图片
    - `src/views/components/post-card.tsx` — 如果 PostCard 有图片（检查确认）
  - width/height 可以使用合理的默认值（如项目缩略图尺寸），或者从 R2 图片元数据获取
  - 在 CSS 中添加 `img { aspect-ratio: auto; }` 确保尺寸正确

  **Must NOT do**:
  - 不改变图片来源或 URL
  - 不添加 srcset/sizes（R2 图片暂不支持多尺寸）
  - 不修改文章内容中的图片（dangerouslySetInnerHTML 渲染的）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯属性添加，无逻辑变更
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 3)
  - **Parallel Group**: Wave 3 (with T14)
  - **Blocks**: None
  - **Blocked By**: T3 (共享组件确认), T7 (layout 更新后操作)

  **References**:

  **Pattern References**:
  - `src/views/projects.tsx:26-29` — 项目列表 img 标签
  - `src/views/project-detail.tsx:58-62` — 项目详情 img 标签

  **WHY Each Reference Matters**:
  - 精确定位需要添加属性的 img 标签位置

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 图片有 lazy loading 和尺寸属性
    Tool: Bash (grep)
    Steps:
      1. grep -n '<img' src/views/projects.tsx src/views/project-detail.tsx
      2. 验证每个 img 标签包含 loading="lazy"
      3. 验证每个 img 标签包含 width 和 height 属性
      4. 验证每个 img 标签包含 decoding="async"
    Expected Result: 所有 img 标签包含 lazy、width、height、decoding 属性
    Failure Indicators: 缺少属性
    Evidence: .sisyphus/evidence/task-13-image-attrs.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `perf(images): add lazy loading and dimensions to prevent CLS`
  - Files: `src/views/projects.tsx`, `src/views/project-detail.tsx`, possibly `src/views/components/post-card.tsx`

- [x] 14. KaTeX CSS 条件加载

  **What to do**:
  - 在 `src/views/layout.tsx` 中优化 KaTeX CSS 加载逻辑：
    - 当前：`type === 'article'` 时加载 KaTeX CSS（所有文章页都加载）
    - 优化后：只在文章内容实际包含 LaTeX 公式时加载
  - 实现方式：在 `src/routes/blog.tsx` 文章详情路由中，检测 `renderLatex` 的输出是否包含 `katex` 类名
  - 将检测结果传递给 layout（如 `hasLatex: boolean` prop）
  - 当 `hasLatex === true` 时才加载 KaTeX CSS
  - 同时添加 `<link rel="preconnect" href="https://cdn.jsdelivr.net">` 当需要 KaTeX CSS 时

  **Must NOT do**:
  - 不修改 KaTeX 服务端渲染逻辑（`renderLatex` 函数不变）
  - 不在客户端执行任何 JS 来检测或加载 KaTeX

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 条件判断 + CSS 加载优化
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 3)
  - **Parallel Group**: Wave 3 (with T13)
  - **Blocks**: None
  - **Blocked By**: T7 (layout 更新), T10 (文章详情路由重构)

  **References**:

  **Pattern References**:
  - `src/views/layout.tsx:21-27` — 当前 KaTeX CSS 条件加载逻辑
  - `src/routes/blog.tsx` — 文章详情路由（传递 hasLatex 参数）
  - `src/utils/latex.ts:renderLatex` — 了解渲染后的 HTML 是否包含 `.katex` 类

  **WHY Each Reference Matters**:
  - `layout.tsx:21-27`: 理解当前条件加载机制
  - `latex.ts`: 确认 KaTeX 渲染后的 HTML 标记模式，用于检测

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 无 LaTeX 文章不加载 KaTeX CSS
    Tool: Bash (curl)
    Preconditions: dev server 运行，有不含数学公式的文章
    Steps:
      1. 找到一篇不含 LaTeX 的文章
      2. curl -s http://localhost:8787/posts/{slug} | grep "katex.min.css"
    Expected Result: 无 KaTeX CSS 加载
    Failure Indicators: 无 LaTeX 文章仍加载 KaTeX CSS
    Evidence: .sisyphus/evidence/task-14-katex-skip.txt

  Scenario: 有 LaTeX 文章正确加载 KaTeX CSS
    Tool: Bash (curl)
    Preconditions: 有含数学公式的文章
    Steps:
      1. 找到一篇含 LaTeX 的文章
      2. curl -s http://localhost:8787/posts/{slug} | grep "katex.min.css"
    Expected Result: KaTeX CSS 正确加载
    Failure Indicators: 有 LaTeX 文章未加载 CSS 导致公式样式丢失
    Evidence: .sisyphus/evidence/task-14-katex-load.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `perf(katex): conditionally load KaTeX CSS only when math is present`
  - Files: `src/views/layout.tsx`, `src/routes/blog.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `bun run typecheck`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify Tailwind CDN script is completely removed from all views.
  Output: `Build [PASS/FAIL] | TypeCheck [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (`bun run dev`). Visit EVERY public page: home, post detail, tag page, tags cloud, writings, about, projects, project detail, RSS feed. For each: verify renders correctly, check no console errors, verify Cache-Control headers present. Compare rendering to pre-optimization (screenshots). Save to `.sisyphus/evidence/final-qa/`.
  Output: `Pages [N/N pass] | Console Errors [0] | Cache Headers [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance: no admin/ changes, no new JS framework, no getPostWithTags deletion. Detect unaccounted changes.
  Output: `Tasks [N/N compliant] | Guardrails [CLEAN/N violations] | VERDICT`

---

## Commit Strategy

- **Wave 1 batch**: `perf(wave1): add build pipeline, indexes, shared components, queries, cache middleware` — all Wave 1 files
- **Wave 2 batch**: `perf(wave2): fix N+1 queries, replace Tailwind CDN, optimize detail page` — all Wave 2 files
- **Wave 3 batch**: `perf(wave3): image optimization, conditional KaTeX loading` — all Wave 3 files

---

## Success Criteria

### Verification Commands
```bash
# Tailwind CDN 已移除
grep -r "cdn.tailwindcss.com" src/views/  # Expected: no output

# 生产 CSS 文件存在
ls -la public/css/tailwind.css  # Expected: file exists, < 50KB

# TypeScript 编译通过
bun run typecheck  # Expected: no errors

# 首页有缓存头
curl -sI http://localhost:8787/ | grep -i cache-control  # Expected: present

# 文章页有缓存头
curl -sI http://localhost:8787/posts/any-slug | grep -i cache-control  # Expected: present
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `cdn.tailwindcss.com` 零引用
- [ ] 首页查询数 ≤ 3
- [ ] 所有 SSR 页面有 Cache-Control
- [ ] 所有图片有 lazy + dimensions
- [ ] TypeScript 编译无错误
