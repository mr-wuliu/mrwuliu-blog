import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { generateToken, authMiddleware } from '../middleware/auth'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

const auth = new Hono<{ Bindings: Bindings }>()

// POST /api/auth/login
auth.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()

  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400)
  }

  if (username !== c.env.ADMIN_USERNAME || password !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const token = await generateToken({ sub: username }, c.env.JWT_SECRET)

  setCookie(c, 'admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return c.json({ success: true, username })
})

// POST /api/auth/logout
auth.post('/logout', (c) => {
  deleteCookie(c, 'admin_token', { path: '/' })
  return c.json({ success: true })
})

// GET /api/auth/me (protected)
auth.get('/me', authMiddleware, (c) => {
  const user = c.get('user')
  return c.json({ authenticated: true, username: user.sub })
})

export default auth
