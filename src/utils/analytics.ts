import { and, eq, sql } from 'drizzle-orm'
import { postStats, postViewEvents } from '../db/schema'
import type { Database } from '../db'

type VisitorFingerprint = {
  ipHash: string
  ipMasked: string
  userAgentHash: string
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function getClientIp(headers: Headers): string {
  return headers.get('cf-connecting-ip')
    || headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

export function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'

  if (ip.includes(':')) {
    const segments = ip.split(':').filter(Boolean)
    if (segments.length >= 2) return `${segments[0]}:${segments[1]}:*:*`
    return `${ip}:*`
  }

  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`
  return ip
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return toHex(digest)
}

export async function getVisitorFingerprint(ip: string, userAgent: string, salt: string): Promise<VisitorFingerprint> {
  const ipHash = await sha256(`${ip}|${salt}`)
  const userAgentHash = await sha256(`${userAgent}|${salt}`)
  return {
    ipHash,
    ipMasked: maskIp(ip),
    userAgentHash,
  }
}

type TrackPostViewOptions = {
  postId: string
  ip: string
  userAgent: string
  country?: string
  referrerHost?: string
  salt: string
}

export async function trackPostView(db: Database, options: TrackPostViewOptions): Promise<void> {
  const { postId, ip, userAgent, country, referrerHost, salt } = options
  const { ipHash, userAgentHash } = await getVisitorFingerprint(ip, userAgent, salt)
  const now = new Date().toISOString()

  async function incrementStats(uniqueIncrement: 0 | 1) {
    await db.insert(postStats).values({
      postId,
      viewCount: 1,
      uniqueViewCount: uniqueIncrement,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: postStats.postId,
      set: {
        viewCount: sql`${postStats.viewCount} + 1`,
        uniqueViewCount: uniqueIncrement === 1
          ? sql`${postStats.uniqueViewCount} + 1`
          : sql`${postStats.uniqueViewCount}`,
        updatedAt: now,
      },
    })
  }

  const [existsToday] = await db
    .select({ id: postViewEvents.id })
    .from(postViewEvents)
    .where(and(
      eq(postViewEvents.postId, postId),
      eq(postViewEvents.ipHash, ipHash),
      eq(postViewEvents.userAgentHash, userAgentHash),
      sql`${postViewEvents.viewDate} = date('now')`,
    ))
    .limit(1)

  if (existsToday) {
    await incrementStats(0)
    return
  }

  const [seenBeforeByIp] = await db
    .select({ id: postViewEvents.id })
    .from(postViewEvents)
    .where(and(
      eq(postViewEvents.postId, postId),
      eq(postViewEvents.ipHash, ipHash),
    ))
    .limit(1)

  try {
    await db.insert(postViewEvents).values({
      id: crypto.randomUUID(),
      postId,
      ipHash,
      userAgentHash,
      country,
      referrerHost,
    })
  } catch {
    return
  }

  await incrementStats(seenBeforeByIp ? 0 : 1)
}
