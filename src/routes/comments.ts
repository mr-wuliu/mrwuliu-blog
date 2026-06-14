import { Hono } from 'hono'
import { eq, and, desc, sql, isNull } from 'drizzle-orm'
import { getCookie } from 'hono/cookie'
import { createDb } from '../db'
import { comments, posts, users } from '../db/schema'
import { getSiteConfig } from '../db/queries'
import { checkRateLimit } from '../utils/rate-limit'
import { getClientIp, getVisitorFingerprint } from '../utils/analytics'
import { sendReplyNotification } from '../services/email'
import { getSessionUser, revokeAllUserTokens } from '../services/auth'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  RESEND_API_KEY: string
  MAIL_DOMAIN: string
}

const commentRoutes = new Hono<{ Bindings: Bindings }>()

commentRoutes.post('/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId')
  const db = createDb(c.env.DB)
  const ip = getClientIp(c.req.raw.headers)

  const allowed = await checkRateLimit(db, ip, 'comment', 5, 60)
  if (!allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  const body = await c.req.json<{ authorName?: string; authorEmail?: string; visitorId?: string; content: string; parentId?: string; notifyOnReply?: boolean }>()

  if (!body.content || body.content.length < 1 || body.content.length > 1000) {
    return c.json({ error: 'Content must be 1-1000 characters' }, 400)
  }

  const [post] = await db.select().from(posts).where(eq(posts.id, postId))
  if (!post) return c.json({ error: 'Post not found' }, 404)

  if (body.parentId) {
    const [parentComment] = await db.select().from(comments).where(eq(comments.id, body.parentId))
    if (!parentComment || parentComment.postId !== postId) {
      return c.json({ error: 'Parent comment not found or does not belong to this post' }, 400)
    }
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const id = crypto.randomUUID()
  const escapedContent = escapeHtml(body.content)
  const escapedVisitorId = body.visitorId ? escapeHtml(body.visitorId) : null
  const escapedParentId = body.parentId ? escapeHtml(body.parentId) : null
  const userAgent = c.req.header('user-agent') || 'unknown'
  const { ipHash, ipMasked } = await getVisitorFingerprint(ip, userAgent, c.env.JWT_SECRET)
  const cf = c.req.raw as Request & { cf?: { country?: string } }

  const accessCookie = getCookie(c, 'access_token')
  const refreshCookie = getCookie(c, 'refresh_token')
  const session = await getSessionUser(db, c.env, accessCookie, refreshCookie)
  if (!session?.user) {
    return c.json({ error: 'login_required' }, 401)
  }
  const sessionUser = session.user

  const regAutoApprove = await getSiteConfig(db, 'comment_registered_auto_approve')
  const commentStatus: 'pending' | 'approved' = regAutoApprove?.value === 'false' ? 'pending' : 'approved'

  await db.insert(comments).values({
    id,
    postId,
    parentId: escapedParentId,
    authorName: sessionUser.name,
    authorEmail: sessionUser.email,
    userId: sessionUser.id,
    visitorId: escapedVisitorId,
    ipHash,
    ipMasked,
    country: cf.cf?.country,
    userAgent: userAgent.slice(0, 500),
    content: escapedContent,
    status: commentStatus,
    notifyOnReply: sessionUser.notifyOnReply,
  })

  return c.json({ id, status: commentStatus, authorName: sessionUser.name, content: escapedContent }, 201)
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
      parentId: comments.parentId,
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

  // Purge article page cache so new comment appears immediately
  const [post] = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, existing.postId))
  if (post) {
    const origin = new URL(c.req.url).origin
    const cache = (caches as unknown as { default: Cache }).default
    await Promise.all([
      cache.delete(new Request(`${origin}/posts/${post.slug}`)),
      cache.delete(new Request(`${origin}/en/posts/${post.slug}`)),
    ])
  }

  // If a reply was approved, notify the parent comment author (if they opted in)
  if (status === 'approved' && existing.parentId) {
    const origin = new URL(c.req.url).origin
    c.executionCtx.waitUntil(
      sendReplyNotification({
        db,
        env: {
          RESEND_API_KEY: c.env.RESEND_API_KEY,
          MAIL_DOMAIN: c.env.MAIL_DOMAIN,
          JWT_SECRET: c.env.JWT_SECRET,
        },
        replyComment: {
          id: existing.id,
          parentId: existing.parentId,
          authorName: existing.authorName,
          content: existing.content,
          postId: existing.postId,
        },
        origin,
        lang: 'zh',
      }).catch((err) => console.error('[email] sendReplyNotification failed:', err)),
    )
  }

  const [updated] = await db.select().from(comments).where(eq(comments.id, id))
  return c.json(updated)
})

commentRoutes.delete('/admin/comments/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)

  const [existing] = await db.select().from(comments).where(eq(comments.id, id))
  if (!existing) return c.json({ error: 'Comment not found' }, 404)

  const [post] = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, existing.postId))

  await db.delete(comments).where(eq(comments.id, id))

  // Purge article page cache (comment removed from rendered page)
  if (post) {
    const origin = new URL(c.req.url).origin
    const cache = (caches as unknown as { default: Cache }).default
    await Promise.all([
      cache.delete(new Request(`${origin}/posts/${post.slug}`)),
      cache.delete(new Request(`${origin}/en/posts/${post.slug}`)),
    ])
  }

  return c.json({ success: true })
})

// --- Admin user management ---

commentRoutes.get('/admin/users', async (c) => {
  const db = createDb(c.env.DB)
  const page = Number(c.req.query('page') ?? 1)
  const limit = Number(c.req.query('limit') ?? 20)
  const offset = (page - 1) * limit
  const search = c.req.query('search')?.trim()
  const statusFilter = c.req.query('status')

  const conditions: ReturnType<typeof eq>[] = []
  if (search) {
    conditions.push(sql`${users.email} LIKE ${'%' + search + '%'} OR ${users.name} LIKE ${'%' + search + '%'}`)
  }
  if (statusFilter && ['active', 'banned'].includes(statusFilter)) {
    conditions.push(eq(users.status, statusFilter as 'active' | 'banned'))
  }

  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)

  return c.json({ users: result, total: countResult[0]?.count ?? 0, page, limit })
})

commentRoutes.patch('/admin/users/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status?: 'active' | 'banned' }>()

  if (!body.status || !['active', 'banned'].includes(body.status)) {
    return c.json({ error: 'Status must be active or banned' }, 400)
  }

  const db = createDb(c.env.DB)
  const [existing] = await db.select().from(users).where(eq(users.id, id))
  if (!existing) return c.json({ error: 'User not found' }, 404)

  await db.update(users).set({ status: body.status, updatedAt: new Date().toISOString() }).where(eq(users.id, id))

  const [updated] = await db.select().from(users).where(eq(users.id, id))
  return c.json(updated)
})

export default commentRoutes
