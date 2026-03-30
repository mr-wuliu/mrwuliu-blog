import { Hono } from 'hono'
import { eq, sql, desc, and } from 'drizzle-orm'
import { createDb } from '../db'
import { tags, postTags, posts } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { slugify } from '../utils/slugify'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

const tagRoutes = new Hono<{ Bindings: Bindings }>()

// GET /api/tags — List all tags with post count
tagRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)

  const allTags = await db.select().from(tags)

  const tagsWithCount = await Promise.all(
    allTags.map(async (tag) => {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(postTags)
        .innerJoin(posts, eq(postTags.postId, posts.id))
        .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published')))

      return { ...tag, postCount: result[0]?.count ?? 0 }
    })
  )

  return c.json(tagsWithCount)
})

// GET /api/tags/:slug — Get tag with associated published posts
tagRoutes.get('/:slug', async (c) => {
  const db = createDb(c.env.DB)
  const slug = c.req.param('slug')

  const [tag] = await db.select().from(tags).where(eq(tags.slug, slug))
  if (!tag) return c.json({ error: 'Tag not found' }, 404)

  const page = Number(c.req.query('page') ?? 1)
  const limit = Number(c.req.query('limit') ?? 10)
  const offset = (page - 1) * limit

  const tagPosts = await db
    .select({ post: posts })
    .from(postTags)
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published')))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(postTags)
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published')))

  return c.json({
    tag,
    posts: tagPosts.map((r) => r.post),
    total: countResult[0]?.count ?? 0,
    page,
    limit,
  })
})

// POST /api/tags — Create tag (protected)
tagRoutes.post('/', authMiddleware, async (c) => {
  const db = createDb(c.env.DB)
  const { name } = await c.req.json<{ name: string }>()

  if (!name) return c.json({ error: 'Tag name is required' }, 400)

  const slug = slugify(name)
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

// DELETE /api/tags/:id — Delete tag (protected, CASCADE deletes associations)
tagRoutes.delete('/:id', authMiddleware, async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const [existing] = await db.select().from(tags).where(eq(tags.id, id))
  if (!existing) return c.json({ error: 'Tag not found' }, 404)

  await db.delete(tags).where(eq(tags.id, id))
  return c.json({ success: true })
})

export default tagRoutes
