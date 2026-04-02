import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { createDb } from '../db'
import { comments, posts } from '../db/schema'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const commentRoutes = new Hono<{ Bindings: Bindings }>()

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

commentRoutes.post('/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId')
  const body = await c.req.json<{ authorName: string; authorEmail?: string; content: string }>()

  if (!body.authorName || body.authorName.length < 1 || body.authorName.length > 50) {
    return c.json({ error: 'Author name must be 1-50 characters' }, 400)
  }
  if (!body.content || body.content.length < 1 || body.content.length > 1000) {
    return c.json({ error: 'Content must be 1-1000 characters' }, 400)
  }
  if (body.authorEmail && !isValidEmail(body.authorEmail)) {
    return c.json({ error: 'Invalid email format' }, 400)
  }

  const db = createDb(c.env.DB)

  const [post] = await db.select().from(posts).where(eq(posts.id, postId))
  if (!post) return c.json({ error: 'Post not found' }, 404)

  const id = crypto.randomUUID()

  await db.insert(comments).values({
    id,
    postId,
    authorName: body.authorName,
    authorEmail: body.authorEmail || null,
    content: body.content,
    status: 'pending',
  })

  return c.json({ id, status: 'pending', authorName: body.authorName, content: body.content }, 201)
})

commentRoutes.get('/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId')
  const db = createDb(c.env.DB)

  const result = await db
    .select()
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.status, 'approved')))
    .orderBy(desc(comments.createdAt))

  return c.json(result)
})

commentRoutes.get('/admin/comments', async (c) => {
  const db = createDb(c.env.DB)
  const status = c.req.query('status') as 'pending' | 'approved' | 'rejected' | undefined
  const page = Number(c.req.query('page') ?? 1)
  const limit = Number(c.req.query('limit') ?? 20)
  const offset = (page - 1) * limit

  const conditions = status ? [eq(comments.status, status)] : []

  const result = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      authorName: comments.authorName,
      authorEmail: comments.authorEmail,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      postSlug: posts.slug,
      postTitle: posts.title,
    })
    .from(comments)
    .leftJoin(posts, eq(comments.postId, posts.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(conditions.length ? and(...conditions) : undefined)

  return c.json({ comments: result, total: countResult[0]?.count ?? 0, page, limit })
})

commentRoutes.put('/admin/comments/:id', async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json<{ status: 'approved' | 'rejected' }>()

  if (!status || !['approved', 'rejected'].includes(status)) {
    return c.json({ error: 'Status must be approved or rejected' }, 400)
  }

  const db = createDb(c.env.DB)
  const [existing] = await db.select().from(comments).where(eq(comments.id, id))
  if (!existing) return c.json({ error: 'Comment not found' }, 404)

  await db.update(comments).set({ status }).where(eq(comments.id, id))

  const [updated] = await db.select().from(comments).where(eq(comments.id, id))
  return c.json(updated)
})

commentRoutes.delete('/admin/comments/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)

  const [existing] = await db.select().from(comments).where(eq(comments.id, id))
  if (!existing) return c.json({ error: 'Comment not found' }, 404)

  await db.delete(comments).where(eq(comments.id, id))
  return c.json({ success: true })
})

export default commentRoutes
