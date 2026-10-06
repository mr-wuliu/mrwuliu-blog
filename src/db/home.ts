import { sql } from 'drizzle-orm'
import type { Database } from './index'

type HomeBlock = { postId: string; collectionId: string | null; name: string | null; nameEn: string | null; slug: string | null }

export async function getHomeBlocks(db: Database, requestedPage: number, limit = 10) {
  // Pick one series per post, then one representative post per rendered block.
  // Pagination happens in SQLite; no whole-site ID list is bound to an IN query.
  const blocks = sql`WITH membership AS (
    SELECT cp.post_id, c.id, c.name, c.name_en, c.slug,
      row_number() OVER (PARTITION BY cp.post_id ORDER BY cp.sort_order, c.id) AS choice
    FROM collection_posts cp JOIN collections c ON c.id = cp.collection_id WHERE c.status = 'published'
  ), ranked AS (
    SELECT p.id AS postId, m.id AS collectionId, m.name, m.name_en AS nameEn, m.slug,
      p.pinned, p.created_at,
      row_number() OVER (PARTITION BY coalesce('c:' || m.id, 'p:' || p.id)
        ORDER BY p.pinned DESC, p.created_at DESC, p.id) AS position
    FROM posts p LEFT JOIN membership m ON m.post_id = p.id AND m.choice = 1
    WHERE p.status = 'published' AND p.hidden = 0
  )`
  const [count] = await db.all<{ total: number }>(sql`${blocks} SELECT count(*) AS total FROM ranked WHERE position = 1`)
  const total = count?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const page = Math.min(requestedPage, totalPages)
  const rows = await db.all<HomeBlock>(sql`${blocks} SELECT postId, collectionId, name, nameEn, slug FROM ranked
    WHERE position = 1 ORDER BY pinned DESC, created_at DESC, postId LIMIT ${limit} OFFSET ${(page - 1) * limit}`)
  return { rows, total, totalPages, page }
}
