import { and, eq, sql } from 'drizzle-orm'
import { postStats, postViewEvents, siteAnalytics, siteVisitorEvents } from '../db/schema'
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
  lang?: string
  salt: string
}

const BOT_PATTERNS = /bot|crawl|spider|slurp|mediapartners|preview|fetch|curl|wget|python-requests|httpclient|go-http|java\/|node-fetch|axios|lighthouse|headless|puppeteer|playwright|selenium|phantomjs/i

export function isBotAgent(userAgent: string): boolean {
  return BOT_PATTERNS.test(userAgent)
}

export async function trackPostView(db: Database, options: TrackPostViewOptions): Promise<void> {
  const { postId, ip, userAgent, country, referrerHost, lang, salt } = options
  const { ipHash, userAgentHash } = await getVisitorFingerprint(ip, userAgent, salt)
  const now = new Date().toISOString()
  const bot = isBotAgent(userAgent)

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
      lang,
      isBot: bot,
    })
  } catch {
    return
  }

  await incrementStats(seenBeforeByIp ? 0 : 1)
}

type TrackSiteViewOptions = {
  lang: string
  ip: string
  userAgent: string
  salt: string
}

export async function trackSiteView(db: Database, options: TrackSiteViewOptions): Promise<void> {
  const { lang, ip, userAgent, salt } = options
  const { ipHash } = await getVisitorFingerprint(ip, userAgent, salt)
  const today = new Date().toISOString().split('T')[0]

  // Try to register this visitor as unique
  let isUnique = false
  try {
    await db.insert(siteVisitorEvents).values({
      date: today,
      lang,
      ipHash,
    })
    isUnique = true
  } catch {
    // duplicate visitor — not unique
  }

  // Single atomic upsert: always increment PV, conditionally increment UV
  await db.insert(siteAnalytics).values({
    date: today,
    lang,
    pageViews: 1,
    uniqueVisitors: isUnique ? 1 : 0,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: [siteAnalytics.date, siteAnalytics.lang],
    set: {
      pageViews: sql`${siteAnalytics.pageViews} + 1`,
      uniqueVisitors: isUnique
        ? sql`${siteAnalytics.uniqueVisitors} + 1`
        : sql`${siteAnalytics.uniqueVisitors}`,
      updatedAt: new Date().toISOString(),
    },
  })
}
