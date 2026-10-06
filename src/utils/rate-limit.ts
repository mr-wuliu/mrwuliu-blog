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
      await db.run(sql`DELETE FROM rate_limits WHERE datetime(created_at) < datetime('now', '-1 hour')`)
    } catch (err) {
      console.error('[rate-limit] prune failed:', err)
    }
  }

  // A single SQLite write serializes the decision and insertion across requests.
  const result = await db.run(sql`
    INSERT INTO rate_limits (ip, action)
    SELECT ${ip}, ${action}
    WHERE (SELECT count(*) FROM rate_limits
      WHERE ip = ${ip} AND action = ${action}
      AND datetime(created_at) > datetime('now', ${windowStart})) < ${limit}
  `)
  return result.meta.changes === 1
}
