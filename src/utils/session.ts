import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { createDb } from '../db'
import { getSessionUser, REFRESH_TOKEN_TTL, type AuthEnv, type AuthTokens } from '../services/auth'

const sessions = new WeakMap<object, ReturnType<typeof getSessionUser>>()

export function setSessionCookies(c: Context, tokens: AuthTokens): void {
  const options = { httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Lax' as const, path: '/' }
  setCookie(c, 'access_token', tokens.accessToken, { ...options, maxAge: tokens.expiresIn })
  setCookie(c, 'refresh_token', tokens.refreshToken, { ...options, maxAge: REFRESH_TOKEN_TTL })
}

export async function resolveSession<E extends { Bindings: AuthEnv & { DB: D1Database } }>(c: Context<E>, allowRefresh = true) {
  let pending = sessions.get(c)
  if (!pending) {
    pending = getSessionUser(createDb(c.env.DB), c.env, getCookie(c, 'access_token'), allowRefresh ? getCookie(c, 'refresh_token') : undefined)
      .then(session => {
        if (session?.newTokens) setSessionCookies(c, session.newTokens)
        return session
      })
    sessions.set(c, pending)
  }
  return pending
}
