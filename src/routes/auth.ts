import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { users } from '../db/schema'
import { generateOtp, verifyOtp, issueTokens, rotateRefreshToken, revokeRefreshTokenByHash, getSessionUser } from '../services/auth'
import { sendOtpEmail } from '../services/otp-email'
import { checkRateLimit } from '../utils/rate-limit'
import { getClientIp } from '../utils/analytics'
import { avatarUrlFor } from '../utils/avatar'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  RESEND_API_KEY: string
  MAIL_DOMAIN: string
  IMAGES: R2Bucket
}

const authRoutes = new Hono<{ Bindings: Bindings }>()

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  path: '/',
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

authRoutes.post('/auth/otp/send', async (c) => {
  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email || !isValidEmail(email)) {
    return c.json({ error: 'invalid_email' }, 400)
  }

  const db = createDb(c.env.DB)
  const ip = getClientIp(c.req.raw.headers)

  const allowed = await checkRateLimit(db, ip, 'otp_send', 3, 300)
  if (!allowed) {
    return c.json({ error: 'rate_limited' }, 429)
  }

  const lang = typeof body.lang === 'string' && body.lang === 'en' ? 'en' : 'zh'
  const env = {
    JWT_SECRET: c.env.JWT_SECRET,
    RESEND_API_KEY: c.env.RESEND_API_KEY,
    MAIL_DOMAIN: c.env.MAIL_DOMAIN,
  }

  const { code } = await generateOtp(db, env, email)
  const from = `noreply@${c.env.MAIL_DOMAIN}`

  const sent = await sendOtpEmail({
    apiKey: c.env.RESEND_API_KEY,
    from,
    to: email,
    code,
    lang,
    siteName: 'mrwuliu.top',
  })

  if (!sent) {
    return c.json({ error: 'email_send_failed' }, 500)
  }

  return c.json({ ok: true })
})

authRoutes.post('/auth/otp/verify', async (c) => {
  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''

  if (!email || !isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return c.json({ error: 'invalid_input' }, 400)
  }

  const db = createDb(c.env.DB)
  const ip = getClientIp(c.req.raw.headers)

  const allowed = await checkRateLimit(db, ip, 'otp_verify', 10, 300)
  if (!allowed) {
    return c.json({ error: 'rate_limited' }, 429)
  }

  const result = await verifyOtp(db, email, code)
  if (!result.valid || !result.userId) {
    return c.json({ error: 'invalid_code' }, 401)
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, result.userId))

  if (!user) {
    return c.json({ error: 'user_not_found' }, 404)
  }

  const env = {
    JWT_SECRET: c.env.JWT_SECRET,
    RESEND_API_KEY: c.env.RESEND_API_KEY,
    MAIL_DOMAIN: c.env.MAIL_DOMAIN,
  }

  const tokens = await issueTokens(db, env, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    avatarSeed: user.avatarSeed,
    avatarType: user.avatarType,
    avatarR2Key: user.avatarR2Key,
    notifyOnReply: user.notifyOnReply,
  }, {
    userAgent: c.req.header('User-Agent'),
    ipHash: ip,
  })

  setCookie(c, 'access_token', tokens.accessToken, {
    ...COOKIE_OPTS,
    maxAge: tokens.expiresIn,
  })
  setCookie(c, 'refresh_token', tokens.refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 30 * 24 * 60 * 60,
  })

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    isNewUser: result.isNewUser,
  })
})

authRoutes.post('/auth/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')
  if (!refreshToken) {
    return c.json({ error: 'no_refresh_token' }, 401)
  }

  const db = createDb(c.env.DB)
  const env = {
    JWT_SECRET: c.env.JWT_SECRET,
    RESEND_API_KEY: c.env.RESEND_API_KEY,
    MAIL_DOMAIN: c.env.MAIL_DOMAIN,
  }

  const tokens = await rotateRefreshToken(db, env, refreshToken, {
    userAgent: c.req.header('User-Agent'),
    ipHash: getClientIp(c.req.raw.headers),
  })

  if (!tokens) {
    deleteCookie(c, 'access_token', { path: '/' })
    deleteCookie(c, 'refresh_token', { path: '/' })
    return c.json({ error: 'invalid_refresh_token' }, 401)
  }

  setCookie(c, 'access_token', tokens.accessToken, {
    ...COOKIE_OPTS,
    maxAge: tokens.expiresIn,
  })
  setCookie(c, 'refresh_token', tokens.refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 30 * 24 * 60 * 60,
  })

  return c.json({ ok: true })
})

authRoutes.post('/auth/logout', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')
  if (refreshToken) {
    const db = createDb(c.env.DB)
    await revokeRefreshTokenByHash(db, refreshToken)
  }

  deleteCookie(c, 'access_token', { path: '/' })
  deleteCookie(c, 'refresh_token', { path: '/' })

  return c.json({ ok: true })
})

authRoutes.get('/auth/me', async (c) => {
  const accessToken = getCookie(c, 'access_token')
  const refreshToken = getCookie(c, 'refresh_token')

  const db = createDb(c.env.DB)
  const env = {
    JWT_SECRET: c.env.JWT_SECRET,
    RESEND_API_KEY: c.env.RESEND_API_KEY,
    MAIL_DOMAIN: c.env.MAIL_DOMAIN,
  }

  const session = await getSessionUser(db, env, accessToken, refreshToken)

  if (!session) {
    return c.json({ user: null })
  }

  if (session.newTokens) {
    setCookie(c, 'access_token', session.newTokens.accessToken, {
      ...COOKIE_OPTS,
      maxAge: session.newTokens.expiresIn,
    })
    setCookie(c, 'refresh_token', session.newTokens.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 30 * 24 * 60 * 60,
    })
  }

  return c.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      avatarSeed: session.user.avatarSeed,
      avatarType: session.user.avatarType,
      avatarR2Key: session.user.avatarR2Key,
      avatarUrl: avatarUrlFor({
        avatarType: session.user.avatarType,
        avatarR2Key: session.user.avatarR2Key,
        email: session.user.email,
        avatarSeed: session.user.avatarSeed,
        id: session.user.id,
      }),
      notifyOnReply: session.user.notifyOnReply,
    },
  })
})

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatarSeed: u.avatarSeed,
    avatarType: u.avatarType,
    avatarR2Key: u.avatarR2Key,
    avatarUrl: avatarUrlFor({
      avatarType: u.avatarType,
      avatarR2Key: u.avatarR2Key,
      email: u.email,
      avatarSeed: u.avatarSeed,
      id: u.id,
    }),
    notifyOnReply: u.notifyOnReply,
  }
}

const AVATAR_TYPES = ['identicon', 'gravatar', 'uploaded'] as const
const AVATAR_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const AVATAR_MAX_SIZE = 2 * 1024 * 1024 // 2MB

authRoutes.put('/auth/settings', async (c) => {
  const accessToken = getCookie(c, 'access_token')
  const refreshToken = getCookie(c, 'refresh_token')

  const db = createDb(c.env.DB)
  const env = {
    JWT_SECRET: c.env.JWT_SECRET,
    RESEND_API_KEY: c.env.RESEND_API_KEY,
    MAIL_DOMAIN: c.env.MAIL_DOMAIN,
  }

  const session = await getSessionUser(db, env, accessToken, refreshToken)
  if (!session) return c.json({ error: 'unauthorized' }, 401)

  const body = await c.req.json().catch(() => ({})) as {
    name?: unknown
    avatarSeed?: unknown
    avatarType?: unknown
    notifyOnReply?: unknown
  }

  const updates: {
    name?: string
    avatarSeed?: string
    avatarType?: 'identicon' | 'gravatar' | 'uploaded'
    notifyOnReply?: boolean
    updatedAt: string
  } = { updatedAt: new Date().toISOString() }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string') return c.json({ error: 'invalid_name' }, 400)
    const name = body.name.trim()
    if (name.length === 0 || name.length > 32) return c.json({ error: 'invalid_name' }, 400)
    updates.name = name
  }
  if (body.avatarType !== undefined) {
    if (typeof body.avatarType !== 'string' || !AVATAR_TYPES.includes(body.avatarType as typeof AVATAR_TYPES[number])) {
      return c.json({ error: 'invalid_avatar_type' }, 400)
    }
    updates.avatarType = body.avatarType as 'identicon' | 'gravatar' | 'uploaded'
  }
  if (body.avatarSeed !== undefined) {
    if (typeof body.avatarSeed !== 'string' || body.avatarSeed.length === 0 || body.avatarSeed.length > 64) {
      return c.json({ error: 'invalid_avatar_seed' }, 400)
    }
    updates.avatarSeed = body.avatarSeed
  }
  if (body.notifyOnReply !== undefined) {
    if (typeof body.notifyOnReply !== 'boolean') {
      return c.json({ error: 'invalid_notify_on_reply' }, 400)
    }
    updates.notifyOnReply = body.notifyOnReply
  }
  if (updates.name === undefined && updates.avatarType === undefined && updates.avatarSeed === undefined && updates.notifyOnReply === undefined) {
    return c.json({ error: 'no_fields' }, 400)
  }

  await db.update(users).set(updates).where(eq(users.id, session.user.id))

  const [updated] = await db.select().from(users).where(eq(users.id, session.user.id))
  return c.json({ user: publicUser(updated) })
})

authRoutes.post('/auth/avatar', async (c) => {
  const accessToken = getCookie(c, 'access_token')
  const refreshToken = getCookie(c, 'refresh_token')

  const db = createDb(c.env.DB)
  const env = {
    JWT_SECRET: c.env.JWT_SECRET,
    RESEND_API_KEY: c.env.RESEND_API_KEY,
    MAIL_DOMAIN: c.env.MAIL_DOMAIN,
  }

  const session = await getSessionUser(db, env, accessToken, refreshToken)
  if (!session) return c.json({ error: 'unauthorized' }, 401)

  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'no_file' }, 400)
  }
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: 'invalid_file_type' }, 400)
  }
  if (file.size > AVATAR_MAX_SIZE) {
    return c.json({ error: 'file_too_large' }, 400)
  }

  const ext = file.type.split('/')[1] || 'png'
  const userId = session.user.id
  const r2Key = `uavatars/${userId}.${ext}`

  if (session.user.avatarR2Key && session.user.avatarR2Key !== r2Key) {
    await c.env.IMAGES.delete(session.user.avatarR2Key)
  }

  const arrayBuffer = await file.arrayBuffer()
  await c.env.IMAGES.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  })

  await db.update(users).set({
    avatarType: 'uploaded',
    avatarR2Key: r2Key,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, userId))

  const [updated] = await db.select().from(users).where(eq(users.id, userId))
  return c.json({ user: publicUser(updated) })
})

export default authRoutes
