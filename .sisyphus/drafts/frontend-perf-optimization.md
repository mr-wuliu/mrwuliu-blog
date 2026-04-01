# Draft: 前端性能优化

## 项目概况
- **技术栈**: Hono SSR + Cloudflare Workers + D1 + R2
- **前端**: Hono JSX SSR 渲染，无客户端 JS 框架（纯静态 HTML）
- **管理后台**: React SPA (Vite + TipTap)，独立于博客前端
- **CSS**: Tailwind CSS（通过 CDN 运行时）+ 自定义 style.css (4KB)
- **数学渲染**: KaTeX 服务端渲染

## 发现的性能问题（按严重度排序）

### 🔴 CRITICAL
1. **Tailwind CSS CDN 运行时** — `src/views/layout.tsx:18`
   - `<script src="https://cdn.tailwindcss.com"></script>`
   - 每次页面加载下载 ~330KB JS，在浏览器中运行 CSS JIT 编译器
   - 阻塞渲染（无 async/defer）
   - Tailwind 官方明确说"仅供开发使用"
   - 预计增加 500ms-2s 的 FCP/LCP

2. **N+1 查询: 首页** — `src/routes/blog.tsx:34-44`
   - 首页加载触发 22 次数据库查询（10 篇文章 × 2 次 + 2 次基础查询）
   - `getPostWithTags` 在循环中为每篇文章单独查询标签

3. **N+1 查询: 标签页** — `src/routes/blog.tsx:95-103`
   - 与首页相同的 N+1 模式

### 🟠 HIGH
4. **无 HTTP 缓存** — `src/index.ts` + `src/routes/blog.tsx`
   - 所有 SSR 页面无 Cache-Control 头
   - 每次请求都触发 Worker + D1 查询 + 渲染
   - 未使用 Cloudflare Cache API

5. **文章详情页冗余查询** — `src/routes/blog.tsx:123-158`
   - 同一篇文章查询两次（先按 slug，再按 id）
   - 5 个顺序查询未并行化（评论、上下篇可并行）
   - renderLatex + generateToc 每次请求都重新计算

6. **SELECT * 问题** — 所有查询
   - 首页/列表页加载完整 content 字段但从不使用
   - writings 页面加载最多 1000 篇文章的完整内容
   - listImages 用 SELECT * 来获取计数

### 🟡 MEDIUM
7. **缺少复合索引**
   - `posts(status, publishedAt)` — 首页最常用查询
   - `comments(postId, status)` — 文章详情页查询
   - `postTags(tagId, postId)` — 标签页查询

8. **图片无优化** — `projects.tsx`, `project-detail.tsx`
   - 无 loading="lazy"
   - 无 width/height（导致 CLS）
   - 无 srcset/sizes

9. **组件重复定义**
   - PostCard 在 home.tsx 和 tag.tsx 中重复
   - Pagination 重复
   - formatDate 在多个文件中重复

10. **KaTeX CSS 无条件加载** — 所有 article 类型页面都加载，即使无数学公式

## 范围边界
- INCLUDE: 公共博客前端性能优化
- EXCLUDE: 管理后台性能（独立的 SPA）
- EXCLUDE: 新功能开发（如语法高亮）

## 用户确认
1. 卡顿场景: **所有页面都慢**
2. 优化策略: **全面优化**
3. 构建步骤: **可以接受**

## 优化范围（确认）
- **IN**: Tailwind 构建时生成、N+1 查询修复、HTTP 缓存、图片优化、查询并行化、复合索引、组件去重、KaTeX 条件加载
- **OUT**: 管理后台、新功能开发
