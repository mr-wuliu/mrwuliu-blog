import { writePost } from '../services/post-write'
import { slugSchema, pagination } from '../utils/validation'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { createDb } from '../db'
import { posts, postLikes, postStats } from '../db/schema'
import { getPostsWithPagination, getPostWithTags } from '../db/queries'
import { generateUniqueSlug } from '../utils/slugify'
import { checkRateLimit } from '../utils/rate-limit'
import { getClientIp } from '../utils/analytics'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const postRoutes = new Hono<{ Bindings: Bindings }>()
postRoutes.onError((error, c) => {
  if (String(error.cause ?? error).includes('UNIQUE')) return c.json({ error: 'Slug already exists' }, 409)
  throw error
})

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: slugSchema.optional(),
  content: z.string().min(0).max(100000),
  status: z.enum(['draft', 'published']).default('draft'),
  excerpt: z.string().max(500).default(''),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
  hidden: z.boolean().default(false),
  pinned: z.boolean().default(false),
  titleEn: z.string().max(200).optional(),
  contentEn: z.string().max(100000).optional(),
  excerptEn: z.string().max(500).optional(),
})

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  slug: slugSchema.optional(),
  content: z.string().max(100000).optional(),
  status: z.enum(['draft', 'published']).optional(),
  excerpt: z.string().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  hidden: z.boolean().optional(),
  pinned: z.boolean().optional(),
  titleEn: z.string().max(200).optional(),
  contentEn: z.string().max(100000).optional(),
  excerptEn: z.string().max(500).optional(),
})

postRoutes.post('/', zValidator('json', createPostSchema), async (c) => {
  const data = c.req.valid('json')
  const db = createDb(c.env.DB)
  const id = crypto.randomUUID()
  const slug = data.slug ?? generateUniqueSlug(data.title)
  const now = new Date().toISOString()
  const publishedAt = data.status === 'published' ? now : null

  await writePost(db, id, {
    id,
    title: data.title,
    slug,
    content: data.content,
    excerpt: data.excerpt,
    titleEn: data.titleEn ?? null,
    contentEn: data.contentEn ?? '',
    excerptEn: data.excerptEn ?? '',
    status: data.status,
    hidden: data.hidden,
    pinned: data.pinned,
    publishedAt,
  }, data.tags, true)

  const result = await getPostWithTags(db, id)
  return c.json(result, 201)
})

postRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)
  const { page, limit } = pagination(c.req.query('page'), c.req.query('limit'))
  const status = c.req.query('status') as 'draft' | 'published' | undefined

  const result = await getPostsWithPagination(db, { page, limit, status, search: c.req.query('search')?.trim().slice(0, 100) })
  return c.json(result)
})

postRoutes.get('/summary', async (c) => {
  const db = createDb(c.env.DB)
  const [summary] = await db.select({
    totalPosts: sql<number>`count(*)`,
    published: sql<number>`coalesce(sum(case when ${posts.status} = 'published' then 1 else 0 end), 0)`,
    drafts: sql<number>`coalesce(sum(case when ${posts.status} = 'draft' then 1 else 0 end), 0)`,
    totalViews: sql<number>`coalesce(sum(${postStats.viewCount}), 0)`,
    totalUniqueViews: sql<number>`coalesce(sum(${postStats.uniqueViewCount}), 0)`,
  }).from(posts).leftJoin(postStats, eq(postStats.postId, posts.id))
  return c.json(summary)
})

postRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const result = await getPostWithTags(db, c.req.param('id'))
  if (!result) return c.json({ error: 'Post not found' }, 404)
  return c.json(result)
})

postRoutes.put('/:id', zValidator('json', updatePostSchema), async (c) => {
  const data = c.req.valid('json')
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const [existing] = await db.select().from(posts).where(eq(posts.id, id))
  if (!existing) return c.json({ error: 'Post not found' }, 404)

  const now = new Date().toISOString()
  const status = data.status ?? existing.status
  const publishedAt = status === 'published' ? (existing.publishedAt ?? now) : null

  await writePost(db, id, {
    ...(data.slug !== undefined && { slug: data.slug }),
    ...(data.title !== undefined && { title: data.title }),
    ...(data.content !== undefined && { content: data.content }),
    ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
    ...(data.hidden !== undefined && { hidden: data.hidden }),
    ...(data.pinned !== undefined && { pinned: data.pinned }),
    ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
    ...(data.contentEn !== undefined && { contentEn: data.contentEn }),
    ...(data.excerptEn !== undefined && { excerptEn: data.excerptEn }),
    status,
    publishedAt,
    updatedAt: now,
  }, data.tags)

  const result = await getPostWithTags(db, id)
  return c.json(result)
})

postRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const [existing] = await db.select().from(posts).where(eq(posts.id, id))
  if (!existing) return c.json({ error: 'Post not found' }, 404)

  await db.delete(posts).where(eq(posts.id, id))
  return c.json({ success: true })
})

postRoutes.post('/:id/like', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)
  const ip = getClientIp(c.req.raw.headers)

  const allowed = await checkRateLimit(db, ip, 'like', 30, 60)
  if (!allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  const body = await c.req.json<{ fingerprint: string }>().catch(() => ({ fingerprint: '' }))
  const fingerprint = (typeof body?.fingerprint === 'string' ? body.fingerprint : '') || c.req.header('x-fingerprint') || ''
  if (!fingerprint || fingerprint.length > 100) {
    return c.json({ error: 'Invalid fingerprint' }, 400)
  }

  const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, id), eq(posts.status, 'published'), eq(posts.hidden, false)))
  if (!post) return c.json({ error: 'Post not found' }, 404)

  const inserted = await db
    .insert(postLikes)
    .values({
      id: crypto.randomUUID(),
      postId: id,
      fingerprint,
    })
    .onConflictDoNothing()
    .returning({ id: postLikes.id })

  const liked = inserted.length > 0

  if (!liked) {
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, id), eq(postLikes.fingerprint, fingerprint)))
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(postLikes)
    .where(eq(postLikes.postId, id))

  return c.json({ liked, likeCount: countRow?.count ?? 0 })
})

export default postRoutes
