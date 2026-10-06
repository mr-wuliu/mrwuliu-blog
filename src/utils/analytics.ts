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

  const eventWrite = db.insert(postViewEvents).values({
    id: crypto.randomUUID(), postId, ipHash, userAgentHash, country, referrerHost, lang: lang || 'zh', isBot: bot, viewCount: 1,
  }).onConflictDoUpdate({
    target: [postViewEvents.postId, postViewEvents.ipHash, postViewEvents.userAgentHash, postViewEvents.viewDate, postViewEvents.lang],
    set: { viewCount: sql`${postViewEvents.viewCount} + 1` },
  })
  if (bot) {
    await eventWrite
    return
  }
  // Check first-seen and update counters inside the same transaction as the
  // event write. Concurrent visits cannot lose PV or double-count a new IP.
  const uniqueIncrement = sql<number>`CASE WHEN EXISTS (SELECT 1 FROM post_view_events
    WHERE post_id = ${postId} AND ip_hash = ${ipHash} AND is_bot = 0) THEN 0 ELSE 1 END`
  await db.batch([
    db.insert(postStats).values({ postId, viewCount: 1, uniqueViewCount: uniqueIncrement, updatedAt: now })
      .onConflictDoUpdate({ target: postStats.postId, set: {
        viewCount: sql`${postStats.viewCount} + 1`, uniqueViewCount: sql`${postStats.uniqueViewCount} + ${uniqueIncrement}`, updatedAt: now,
      } }),
    eventWrite,
  ])
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

  const uniqueIncrement = sql<number>`CASE WHEN EXISTS (SELECT 1 FROM site_visitor_events
    WHERE date = ${today} AND lang = ${lang} AND ip_hash = ${ipHash}) THEN 0 ELSE 1 END`
  await db.batch([
    db.insert(siteAnalytics).values({ date: today, lang, pageViews: 1, uniqueVisitors: uniqueIncrement, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: [siteAnalytics.date, siteAnalytics.lang], set: {
        pageViews: sql`${siteAnalytics.pageViews} + 1`, uniqueVisitors: sql`${siteAnalytics.uniqueVisitors} + ${uniqueIncrement}`,
        updatedAt: new Date().toISOString(),
      } }),
    db.insert(siteVisitorEvents).values({ date: today, lang, ipHash }).onConflictDoNothing(),
  ])
}
