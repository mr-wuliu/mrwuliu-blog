import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

// Hash a password using bcryptjs with salt rounds 10
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify a password against a bcrypt hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generate a JWT with 7-day expiration
export async function generateToken(payload: { sub: string }, secret: string): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret))
}

// Verify and decode a JWT
export async function verifyToken(token: string, secret: string) {
  return jwtVerify(token, new TextEncoder().encode(secret))
}

// Hono auth middleware — reads admin_token cookie, verifies JWT, sets c.set('user', payload)
export const authMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: { user: { sub: string } }
}>(async (c, next) => {
  const token = getCookie(c, 'admin_token')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const { payload } = await verifyToken(token, c.env.JWT_SECRET)
    c.set('user', { sub: payload.sub as string })
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})
