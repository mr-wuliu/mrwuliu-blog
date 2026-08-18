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

  // Rate-limit rows are never deleted otherwise — prune old ones opportunistically.
  if (Math.random() < 0.1) {
    try {
      await db.run(sql`DELETE FROM rate_limits WHERE created_at < datetime('now', '-1 hour')`)
    } catch (err) {
      console.error('[rate-limit] prune failed:', err)
    }
  }

  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(rateLimits)
    .where(sql`${rateLimits.ip} = ${ip} AND ${rateLimits.action} = ${action} AND ${rateLimits.createdAt} > datetime('now', ${windowStart})`)

  const count = rows[0]?.count ?? 0
  if (count >= limit) return false

  await db.insert(rateLimits).values({ ip, action })
  return true
}
