import { sql } from 'drizzle-orm'
import { rateLimits } from '../db/schema'

type DB = ReturnType<typeof import('../db').createDb>

export async function checkRateLimit(
  db: DB,
  ip: string,
  action: string,
  limit = 5,
  windowSeconds = 60,
): Promise<boolean> {
  const windowStart = `-${windowSeconds} seconds`

  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(rateLimits)
    .where(sql`${rateLimits.ip} = ${ip} AND ${rateLimits.action} = ${action} AND ${rateLimits.createdAt} > datetime('now', ${windowStart})`)

  const count = rows[0]?.count ?? 0
  if (count >= limit) return false

  await db.insert(rateLimits).values({ ip, action })
  return true
}
