import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { users } from '../db/schema'
import { generateOtp, verifyOtp, issueTokens, rotateRefreshToken, revokeRefreshTokenByHash, getSessionUser } from '../services/auth'
import { sendOtpEmail } from '../services/otp-email'
import { checkRateLimit } from '../utils/rate-limit'
import { getClientIp } from '../utils/analytics'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  RESEND_API_KEY: string
  MAIL_DOMAIN: string
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
    },
  })
})

export default authRoutes
