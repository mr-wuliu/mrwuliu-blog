import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { createDb } from '../db'
import { posts, postTags, tags, postLikes } from '../db/schema'
import { getPostsWithPagination, getPostWithTags } from '../db/queries'
import { slugify, generateUniqueSlug } from '../utils/slugify'
import { checkRateLimit } from '../utils/rate-limit'
import { getClientIp } from '../utils/analytics'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const postRoutes = new Hono<{ Bindings: Bindings }>()

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(0).max(100000),
  status: z.enum(['draft', 'published']).default('draft'),
  excerpt: z.string().max(500).default(''),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
  hidden: z.boolean().default(false),
  pinned: z.boolean().default(false),
  titleEn: z.string().optional(),
  contentEn: z.string().optional(),
  excerptEn: z.string().optional(),
})

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(100000).optional(),
  status: z.enum(['draft', 'published']).optional(),
  excerpt: z.string().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  hidden: z.boolean().optional(),
  pinned: z.boolean().optional(),
  titleEn: z.string().optional(),
  contentEn: z.string().optional(),
  excerptEn: z.string().optional(),
})

postRoutes.post('/', zValidator('json', createPostSchema), async (c) => {
  const data = c.req.valid('json')
  const db = createDb(c.env.DB)
  const id = crypto.randomUUID()
  const slug = generateUniqueSlug(data.title)
  const now = new Date().toISOString()
  const publishedAt = data.status === 'published' ? now : null

  await db.insert(posts).values({
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
  })

  if (data.tags.length > 0) {
    for (const tagName of data.tags) {
      const tagSlug = slugify(tagName) || generateUniqueSlug(tagName)
      const tagId = crypto.randomUUID()
      await db.insert(tags).values({ id: tagId, name: tagName, slug: tagSlug })
        .onConflictDoNothing()

      const [existingTag] = await db.select().from(tags).where(eq(tags.slug, tagSlug))
      const actualTagId = existingTag?.id ?? tagId

      await db.insert(postTags).values({ postId: id, tagId: actualTagId })
        .onConflictDoNothing()
    }
  }

  const result = await getPostWithTags(db, id)
  return c.json(result, 201)
})

postRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)
  const rawPage = Number(c.req.query('page'))
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const rawLimit = Number(c.req.query('limit'))
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20
  const status = c.req.query('status') as 'draft' | 'published' | undefined

  const result = await getPostsWithPagination(db, { page, limit, status })
  return c.json(result)
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

  await db.update(posts).set({
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
  }).where(eq(posts.id, id))

  if (data.tags !== undefined) {
    await db.delete(postTags).where(eq(postTags.postId, id))

    for (const tagName of data.tags) {
      const tagSlug = slugify(tagName) || generateUniqueSlug(tagName)
      const tagId = crypto.randomUUID()
      await db.insert(tags).values({ id: tagId, name: tagName, slug: tagSlug })
        .onConflictDoNothing()

      const [existingTag] = await db.select().from(tags).where(eq(tags.slug, tagSlug))
      const actualTagId = existingTag?.id ?? tagId

      await db.insert(postTags).values({ postId: id, tagId: actualTagId })
        .onConflictDoNothing()
    }
  }

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
  const fingerprint = body.fingerprint || c.req.header('x-fingerprint') || ''
  if (!fingerprint || fingerprint.length > 100) {
    return c.json({ error: 'Invalid fingerprint' }, 400)
  }

  const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id))
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
