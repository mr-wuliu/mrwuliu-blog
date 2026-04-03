import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { createDb } from '../db'
import { comments, posts } from '../db/schema'
import { checkRateLimit } from '../utils/rate-limit'
import { getClientIp, getVisitorFingerprint } from '../utils/analytics'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
}

const commentRoutes = new Hono<{ Bindings: Bindings }>()

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

commentRoutes.post('/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId')
  const db = createDb(c.env.DB)
  const ip = getClientIp(c.req.raw.headers)

  const allowed = await checkRateLimit(db, ip, 'comment', 5, 60)
  if (!allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  const body = await c.req.json<{ authorName: string; authorEmail?: string; visitorId?: string; content: string }>()

  if (!body.authorName || body.authorName.length < 1 || body.authorName.length > 50) {
    return c.json({ error: 'Author name must be 1-50 characters' }, 400)
  }
  if (!body.content || body.content.length < 1 || body.content.length > 1000) {
    return c.json({ error: 'Content must be 1-1000 characters' }, 400)
  }
  if (body.authorEmail && !isValidEmail(body.authorEmail)) {
    return c.json({ error: 'Invalid email format' }, 400)
  }

  const [post] = await db.select().from(posts).where(eq(posts.id, postId))
  if (!post) return c.json({ error: 'Post not found' }, 404)

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const id = crypto.randomUUID()
  const escapedName = escapeHtml(body.authorName)
  const escapedContent = escapeHtml(body.content)
  const escapedEmail = body.authorEmail ? escapeHtml(body.authorEmail) : null
  const escapedVisitorId = body.visitorId ? escapeHtml(body.visitorId) : null
  const userAgent = c.req.header('user-agent') || 'unknown'
  const { ipHash, ipMasked } = await getVisitorFingerprint(ip, userAgent, c.env.JWT_SECRET)
  const cf = c.req.raw as Request & { cf?: { country?: string } }

  await db.insert(comments).values({
    id,
    postId,
    authorName: escapedName,
    authorEmail: escapedEmail,
    visitorId: escapedVisitorId,
    ipHash,
    ipMasked,
    country: cf.cf?.country,
    userAgent: userAgent.slice(0, 500),
    content: escapedContent,
    status: 'pending',
  })

  return c.json({ id, status: 'pending', authorName: escapedName, content: escapedContent }, 201)
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
      ipHash: comments.ipHash,
      ipMasked: comments.ipMasked,
      country: comments.country,
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
