import { eq, and, isNull, lt, sql } from 'drizzle-orm'
import type { Database } from '../db'
import { users, emailOtps, refreshTokens } from '../db/schema'
import { signJwt, verifyJwt, generateJti, type JwtClaims } from '../utils/jwt'

const ACCESS_TOKEN_TTL = 15 * 60
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60
const OTP_TTL = 10 * 60
const OTP_MAX_ATTEMPTS = 5

export interface AuthEnv {
  JWT_SECRET: string
  RESEND_API_KEY: string
  MAIL_DOMAIN: string
}

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  status: 'active' | 'banned'
  avatarSeed: string
  avatarType: 'identicon' | 'gravatar' | 'uploaded'
  avatarR2Key: string
  notifyOnReply: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

function generateOtpCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => (b % 10).toString()).join('')
}

export async function generateOtp(
  db: Database,
  env: AuthEnv,
  email: string,
): Promise<{ code: string; expiresAt: string }> {
  const code = generateOtpCode()
  const codeHash = await hashString(code)
  const expiresAt = new Date(Date.now() + OTP_TTL * 1000).toISOString()
  const id = crypto.randomUUID()

  await db.insert(emailOtps).values({
    id,
    email: email.toLowerCase(),
    codeHash,
    expiresAt,
    attempts: 0,
  })

  console.log(`[auth] otp generated email=${email} id=${id} expires=${expiresAt}`)
  return { code, expiresAt }
}

export async function verifyOtp(
  db: Database,
  email: string,
  code: string,
): Promise<{ valid: boolean; userId?: string; isNewUser?: boolean }> {
  email = email.toLowerCase()
  const now = new Date().toISOString()

  const [otp] = await db
    .select()
    .from(emailOtps)
    .where(
      and(
        eq(emailOtps.email, email),
        isNull(emailOtps.consumedAt),
      ),
    )
    .orderBy(sql`${emailOtps.createdAt} DESC`)
    .limit(1)

  if (!otp) {
    console.warn(`[auth] otp verify no-record email=${email}`)
    return { valid: false }
  }
  if (otp.expiresAt < now) {
    console.warn(`[auth] otp verify expired email=${email} id=${otp.id} expires=${otp.expiresAt} now=${now}`)
    return { valid: false }
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    console.warn(`[auth] otp verify max-attempts email=${email} id=${otp.id} attempts=${otp.attempts}`)
    return { valid: false }
  }

  const codeHash = await hashString(code)
  if (codeHash !== otp.codeHash) {
    await db
      .update(emailOtps)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(emailOtps.id, otp.id))
    console.warn(`[auth] otp verify hash-mismatch email=${email} id=${otp.id} input=${codeHash.slice(0, 8)} stored=${otp.codeHash.slice(0, 8)}`)
    return { valid: false }
  }

  await db
    .update(emailOtps)
    .set({ consumedAt: now })
    .where(eq(emailOtps.id, otp.id))
  console.log(`[auth] otp consumed email=${email} id=${otp.id}`)

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
  console.log(`[auth] user lookup email=${email} exists=${!!existingUser}`)

  let userId: string
  let isNewUser = false

  if (existingUser) {
    if (existingUser.status === 'banned') {
      console.warn(`[auth] user banned email=${email} id=${existingUser.id}`)
      return { valid: false }
    }
    userId = existingUser.id
    await db
      .update(users)
      .set({
        lastLoginAt: now,
        emailVerifiedAt: existingUser.emailVerifiedAt ?? now,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
    console.log(`[auth] user login userId=${userId}`)
  } else {
    userId = crypto.randomUUID()
    isNewUser = true
    const nameFromEmail = email.split('@')[0] || 'user'
    await db.insert(users).values({
      id: userId,
      email,
      name: nameFromEmail,
      emailVerifiedAt: now,
      lastLoginAt: now,
    })
    console.log(`[auth] user created userId=${userId} email=${email}`)
  }

  return { valid: true, userId, isNewUser }
}

export async function issueTokens(
  db: Database,
  env: AuthEnv,
  user: SessionUser,
  metadata: { userAgent?: string; ipHash?: string },
): Promise<AuthTokens> {
  const now = Math.floor(Date.now() / 1000)
  const jti = generateJti()
  console.log(`[auth] issuing tokens userId=${user.id} hasJwtSecret=${!!env.JWT_SECRET} hasResendKey=${!!env.RESEND_API_KEY} mailDomain=${env.MAIL_DOMAIN || '(unset)'}`)

  const accessToken = await signJwt(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'access',
      exp: now + ACCESS_TOKEN_TTL,
    },
    env.JWT_SECRET,
  )

  const refreshToken = await signJwt(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'refresh',
      jti,
      exp: now + REFRESH_TOKEN_TTL,
    },
    env.JWT_SECRET,
  )

  const tokenHash = await hashString(refreshToken)
  const expiresAt = new Date((now + REFRESH_TOKEN_TTL) * 1000).toISOString()

  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash,
    expiresAt,
    userAgent: metadata.userAgent,
    ipHash: metadata.ipHash,
  })
  console.log(`[auth] tokens issued userId=${user.id} jti=${jti}`)

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL,
  }
}

export async function rotateRefreshToken(
  db: Database,
  env: AuthEnv,
  oldRefreshToken: string,
  metadata: { userAgent?: string; ipHash?: string },
): Promise<AuthTokens | null> {
  const claims = await verifyJwt(oldRefreshToken, env.JWT_SECRET)
  if (!claims || claims.type !== 'refresh') return null

  const tokenHash = await hashString(oldRefreshToken)
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))

  if (!stored || stored.revokedAt !== null) return null
  if (stored.expiresAt < new Date().toISOString()) return null

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, claims.sub))

  if (!user || user.status === 'banned') return null

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(refreshTokens.id, stored.id))

  return issueTokens(db, env, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    avatarSeed: user.avatarSeed,
    avatarType: user.avatarType,
    avatarR2Key: user.avatarR2Key,
    notifyOnReply: user.notifyOnReply,
  }, metadata)
}

export async function revokeAllUserTokens(db: Database, userId: string): Promise<void> {
  const now = new Date().toISOString()
  await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
}

export async function revokeRefreshTokenByHash(
  db: Database,
  refreshToken: string,
): Promise<void> {
  const tokenHash = await hashString(refreshToken)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(refreshTokens.tokenHash, tokenHash))
}

export async function getSessionUser(
  db: Database,
  env: AuthEnv,
  accessToken: string | undefined,
  refreshToken: string | undefined,
): Promise<{ user: SessionUser; newTokens?: AuthTokens } | null> {
  if (!accessToken) return null

  const claims = await verifyJwt(accessToken, env.JWT_SECRET)
  if (!claims || claims.type !== 'access') {
    if (!refreshToken) return null
    const newTokens = await rotateRefreshToken(db, env, refreshToken, {})
    if (!newTokens) return null
    const newClaims = await verifyJwt(newTokens.accessToken, env.JWT_SECRET)
    if (!newClaims) return null
    const [user] = await db.select().from(users).where(eq(users.id, newClaims.sub))
    if (!user || user.status === 'banned') return null
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        avatarSeed: user.avatarSeed,
        avatarType: user.avatarType,
        avatarR2Key: user.avatarR2Key,
        notifyOnReply: user.notifyOnReply,
      },
      newTokens,
    }
  }

  const [user] = await db.select().from(users).where(eq(users.id, claims.sub))
  if (!user || user.status === 'banned') return null

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      avatarSeed: user.avatarSeed,
      avatarType: user.avatarType,
      avatarR2Key: user.avatarR2Key,
      notifyOnReply: user.notifyOnReply,
    },
  }
}

export { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL }
