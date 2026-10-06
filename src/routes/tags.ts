import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { pagination } from '../utils/validation'
import { postSummaryFields } from '../db/queries'
import { Hono } from 'hono'
import { eq, sql, desc, and } from 'drizzle-orm'
import { createDb } from '../db'
import { tags, postTags, posts } from '../db/schema'
import { tagSlug } from '../utils/slugify'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const tagRoutes = new Hono<{ Bindings: Bindings }>()

tagRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)

  const tagsWithCount = await db.select({ id: tags.id, name: tags.name, slug: tags.slug, createdAt: tags.createdAt,
    postCount: sql<number>`count(${posts.id})`,
  }).from(tags).leftJoin(postTags, eq(postTags.tagId, tags.id))
    .leftJoin(posts, and(eq(posts.id, postTags.postId), eq(posts.status, 'published'), eq(posts.hidden, false)))
    .groupBy(tags.id)

  return c.json(tagsWithCount)
})

tagRoutes.get('/:slug', async (c) => {
  const db = createDb(c.env.DB)
  const slug = c.req.param('slug')

  const [tag] = await db.select().from(tags).where(eq(tags.slug, slug))
  if (!tag) return c.json({ error: 'Tag not found' }, 404)

  const { page, limit } = pagination(c.req.query('page'), c.req.query('limit'), 10)
  const offset = (page - 1) * limit

  const tagPosts = await db
    .select({ post: postSummaryFields })
    .from(postTags)
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published'), eq(posts.hidden, false)))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(postTags)
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published'), eq(posts.hidden, false)))

  return c.json({
    tag,
    posts: tagPosts.map((r) => r.post),
    total: countResult[0]?.count ?? 0,
    page,
    limit,
  })
})

tagRoutes.post('/', zValidator('json', z.object({ name: z.string().trim().min(1).max(50) })), async (c) => {
  const db = createDb(c.env.DB)
  const { name } = c.req.valid('json')

  if (!name) return c.json({ error: 'Tag name is required' }, 400)

  const slug = tagSlug(name)
  const id = crypto.randomUUID()

  try {
    await db.insert(tags).values({ id, name, slug })
  } catch (e: unknown) {
    if (String(e).includes('UNIQUE')) {
      return c.json({ error: 'Tag already exists' }, 409)
    }
    throw e
  }

  const [tag] = await db.select().from(tags).where(eq(tags.id, id))
  return c.json(tag, 201)
})

tagRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const [existing] = await db.select().from(tags).where(eq(tags.id, id))
  if (!existing) return c.json({ error: 'Tag not found' }, 404)

  await db.delete(tags).where(eq(tags.id, id))
  return c.json({ success: true })
})

export default tagRoutes
