import { Hono } from 'hono'
import { createDb } from '../db'
import { posts, postStats, postViewEvents } from '../db/schema'
import { eq, sql, gte, desc, and } from 'drizzle-orm'
import { getClientIp, getVisitorFingerprint } from '../utils/analytics'

function wordCount(html: string | null): number {
  if (!html) return 0
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  if (!text) return 0
  const cjk = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0
  return text.split(/\s+/).filter(Boolean).length + cjk
}

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  API_KEY: string
  DISABLE_API_AUTH?: string
  JWT_SECRET: string
}

const analyticsRoutes = new Hono<{ Bindings: Bindings }>()

// ── Scroll tracking: client sends scroll depth ──
analyticsRoutes.post('/scroll', async (c) => {
  const body = await c.req.json<{ postId?: string; scrollDepth?: number }>().catch(() => ({ postId: undefined, scrollDepth: undefined }))
  const postId = body.postId
  const scrollDepth = body.scrollDepth
  if (!postId || typeof scrollDepth !== 'number' || scrollDepth < 0) {
    return c.json({ ok: false }, 400)
  }
  const depth = Math.min(Math.round(scrollDepth), 100)
  const ip = getClientIp(c.req.raw.headers)
  const userAgent = c.req.header('user-agent') || 'unknown'
  const { ipHash, userAgentHash } = await getVisitorFingerprint(ip, userAgent, c.env.JWT_SECRET)
  const db = createDb(c.env.DB)

  // Find the latest event for this visitor + post today
  const [latest] = await db
    .select({ id: postViewEvents.id })
    .from(postViewEvents)
    .where(
      and(
        eq(postViewEvents.postId, postId),
        eq(postViewEvents.ipHash, ipHash),
        eq(postViewEvents.userAgentHash, userAgentHash),
        sql`${postViewEvents.viewDate} = date('now')`,
      ),
    )
    .orderBy(desc(postViewEvents.createdAt))
    .limit(1)

  if (!latest) return c.json({ ok: true })

  await db
    .update(postViewEvents)
    .set({
      scrollDepth: sql`case when coalesce(${postViewEvents.scrollDepth}, 0) > ${depth} then ${postViewEvents.scrollDepth} else ${depth} end`,
    })
    .where(eq(postViewEvents.id, latest.id))

  return c.json({ ok: true })
})

// ── Overview: aggregate site trends (kept for compatibility) ──
analyticsRoutes.get('/trends', async (c) => {
  const days = Math.min(Math.max(Number(c.req.query('days')) || 30, 1), 365)
  const db = createDb(c.env.DB)

  const rows = await db
    .select({
      date: postViewEvents.viewDate,
      views: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`count(distinct ${postViewEvents.ipHash})`,
    })
    .from(postViewEvents)
    .where(
      and(
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
        eq(postViewEvents.isBot, false),
      ),
    )
    .groupBy(postViewEvents.viewDate)
    .orderBy(postViewEvents.viewDate)

  return c.json({ trends: rows })
})

// ── Overview v2: post table with zh/en split, MoM, scroll metrics ──
analyticsRoutes.get('/posts-table', async (c) => {
  const days = Math.min(Math.max(Number(c.req.query('days')) || 30, 1), 365)
  const db = createDb(c.env.DB)

  // All published posts with their stats
  const allPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      content: posts.content,
      contentEn: posts.contentEn,
      publishedAt: posts.publishedAt,
      totalViews: sql<number>`coalesce(${postStats.viewCount}, 0)`,
      totalUniqueViews: sql<number>`coalesce(${postStats.uniqueViewCount}, 0)`,
    })
    .from(posts)
    .leftJoin(postStats, eq(posts.id, postStats.postId))
    .where(eq(posts.status, 'published'))
    .orderBy(desc(sql`coalesce(${postStats.viewCount}, 0)`))

  // Current period views per post (non-bot), split by lang
  const periodViews = await db
    .select({
      postId: postViewEvents.postId,
      lang: postViewEvents.lang,
      views: sql<number>`count(*)`,
    })
    .from(postViewEvents)
    .where(
      and(
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
        eq(postViewEvents.isBot, false),
      ),
    )
    .groupBy(postViewEvents.postId, postViewEvents.lang)

  // Previous period views for MoM
  const prevPeriodViews = await db
    .select({
      postId: postViewEvents.postId,
      views: sql<number>`count(*)`,
    })
    .from(postViewEvents)
    .where(
      and(
        sql`${postViewEvents.viewDate} >= date('now', '-' || ${days * 2} || ' day')`,
        sql`${postViewEvents.viewDate} < date('now', '-' || ${days} || ' day')`,
        eq(postViewEvents.isBot, false),
      ),
    )
    .groupBy(postViewEvents.postId)

  // Scroll stats per post
  const scrollStats = await db
    .select({
      postId: postViewEvents.postId,
      avgDepth: sql<number>`round(avg(coalesce(${postViewEvents.scrollDepth}, 0)), 1)`,
      completedCount: sql<number>`sum(case when coalesce(${postViewEvents.scrollDepth}, 0) >= 90 then 1 else 0 end)`,
      totalCount: sql<number>`count(*)`,
    })
    .from(postViewEvents)
    .where(
      and(
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
        eq(postViewEvents.isBot, false),
      ),
    )
    .groupBy(postViewEvents.postId)

  // Assemble maps
  const periodMap = new Map<string, Record<string, number>>()
  for (const r of periodViews) {
    if (!periodMap.has(r.postId)) periodMap.set(r.postId, {})
    const m = periodMap.get(r.postId)!
    m[r.lang ?? 'unknown'] = (m[r.lang ?? 'unknown'] ?? 0) + r.views
  }

  const prevMap = new Map<string, number>()
  for (const r of prevPeriodViews) prevMap.set(r.postId, r.views)

  const scrollMap = new Map<string, { avgDepth: number; completionRate: number }>()
  for (const r of scrollStats) {
    scrollMap.set(r.postId, {
      avgDepth: r.avgDepth,
      completionRate: r.totalCount > 0 ? Math.round((r.completedCount / r.totalCount) * 100) : 0,
    })
  }

  const result = allPosts.map((p) => {
    const langSplit = periodMap.get(p.id) ?? {}
    const currentPeriodTotal = Object.values(langSplit).reduce((a, b) => a + b, 0)
    const prevTotal = prevMap.get(p.id) ?? 0
    const mom = prevTotal > 0 ? Math.round(((currentPeriodTotal - prevTotal) / prevTotal) * 100) : (currentPeriodTotal > 0 ? 100 : 0)
    const scroll = scrollMap.get(p.id) ?? { avgDepth: 0, completionRate: 0 }

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      publishedAt: p.publishedAt,
      wordCount: wordCount(p.content) + wordCount(p.contentEn),
      totalViews: p.totalViews,
      totalUniqueViews: p.totalUniqueViews,
      zhViews: langSplit['zh'] ?? 0,
      enViews: langSplit['en'] ?? 0,
      periodViews: currentPeriodTotal,
      mom,
      avgReadPercent: scroll.avgDepth,
      completionRate: scroll.completionRate,
    }
  })

  return c.json({ posts: result, days })
})

// ── Post detail report ──
analyticsRoutes.get('/post/:postId/report', async (c) => {
  const postId = c.req.param('postId')
  const days = Math.min(Math.max(Number(c.req.query('days')) || 30, 1), 365)
  const db = createDb(c.env.DB)

  // Post info
  const [post] = await db.select({
    id: posts.id,
    title: posts.title,
    titleEn: posts.titleEn,
    slug: posts.slug,
    content: posts.content,
    contentEn: posts.contentEn,
    publishedAt: posts.publishedAt,
    totalViews: sql<number>`coalesce(${postStats.viewCount}, 0)`,
    totalUniqueViews: sql<number>`coalesce(${postStats.uniqueViewCount}, 0)`,
  }).from(posts)
    .leftJoin(postStats, eq(posts.id, postStats.postId))
    .where(eq(posts.id, postId))
    .limit(1)

  if (!post) return c.json({ error: 'Post not found' }, 404)

  // Daily trends (non-bot)
  const trends = await db
    .select({
      date: postViewEvents.viewDate,
      views: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`count(distinct ${postViewEvents.ipHash})`,
    })
    .from(postViewEvents)
    .where(
      and(
        eq(postViewEvents.postId, postId),
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
        eq(postViewEvents.isBot, false),
      ),
    )
    .groupBy(postViewEvents.viewDate)
    .orderBy(postViewEvents.viewDate)

  // Referrer breakdown
  const referrers = await db
    .select({
      host: sql<string>`coalesce(${postViewEvents.referrerHost}, 'direct')`,
      count: sql<number>`count(*)`,
    })
    .from(postViewEvents)
    .where(
      and(
        eq(postViewEvents.postId, postId),
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
      ),
    )
    .groupBy(postViewEvents.referrerHost)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

  // Geographic distribution
  const geo = await db
    .select({
      country: sql<string>`coalesce(${postViewEvents.country}, 'unknown')`,
      count: sql<number>`count(*)`,
    })
    .from(postViewEvents)
    .where(
      and(
        eq(postViewEvents.postId, postId),
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
      ),
    )
    .groupBy(postViewEvents.country)
    .orderBy(desc(sql`count(*)`))
    .limit(20)

  // Bot vs human
  const botStats = await db
    .select({
      isBot: postViewEvents.isBot,
      count: sql<number>`count(*)`,
    })
    .from(postViewEvents)
    .where(
      and(
        eq(postViewEvents.postId, postId),
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
      ),
    )
    .groupBy(postViewEvents.isBot)

  // Lang split
  const langStats = await db
    .select({
      lang: sql<string>`coalesce(${postViewEvents.lang}, 'unknown')`,
      count: sql<number>`count(*)`,
    })
    .from(postViewEvents)
    .where(
      and(
        eq(postViewEvents.postId, postId),
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
        eq(postViewEvents.isBot, false),
      ),
    )
    .groupBy(postViewEvents.lang)

  // Scroll stats
  const scrollAgg = await db
    .select({
      avgDepth: sql<number>`round(avg(coalesce(${postViewEvents.scrollDepth}, 0)), 1)`,
      completedCount: sql<number>`sum(case when coalesce(${postViewEvents.scrollDepth}, 0) >= 90 then 1 else 0 end)`,
      hasDataCount: sql<number>`sum(case when ${postViewEvents.scrollDepth} is not null then 1 else 0 end)`,
      totalCount: sql<number>`count(*)`,
    })
    .from(postViewEvents)
    .where(
      and(
        eq(postViewEvents.postId, postId),
        gte(postViewEvents.viewDate, sql`date('now', '-' || ${days} || ' day')`),
        eq(postViewEvents.isBot, false),
      ),
    )

  const scroll = scrollAgg[0] ?? { avgDepth: 0, completedCount: 0, hasDataCount: 0, totalCount: 0 }

  return c.json({
    post: {
      id: post.id,
      title: post.title,
      titleEn: post.titleEn,
      slug: post.slug,
      publishedAt: post.publishedAt,
      wordCount: wordCount(post.content) + wordCount(post.contentEn),
      totalViews: post.totalViews,
      totalUniqueViews: post.totalUniqueViews,
    },
    trends,
    referrers,
    geo,
    botStats: {
      human: botStats.find((b) => !b.isBot)?.count ?? 0,
      bot: botStats.find((b) => b.isBot)?.count ?? 0,
    },
    langStats,
    scroll: {
      avgReadPercent: scroll.avgDepth,
      completionRate: scroll.hasDataCount > 0
        ? Math.round((scroll.completedCount / scroll.hasDataCount) * 100)
        : 0,
      hasData: scroll.hasDataCount,
    },
    days,
  })
})

export default analyticsRoutes
