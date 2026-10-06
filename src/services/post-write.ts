import { countWords } from '../utils/word-count'
import { batchStatements } from '../db/batch'
import { eq } from 'drizzle-orm'
import type { Database } from '../db'
import { posts } from '../db/schema'
import { tagSlug } from '../utils/slugify'

type PostValues = typeof posts.$inferInsert

export async function writePost(db: Database, id: string, values: Partial<PostValues>, tagNames: string[] | undefined, create = false): Promise<void> {
  if (values.content !== undefined) values.wordCount = countWords(values.content.replace(/<[^>]*>/g, ' '))
  if (values.contentEn !== undefined) values.wordCountEn = countWords((values.contentEn ?? '').replace(/<[^>]*>/g, ' '))
  const postWrite = create ? db.insert(posts).values({ ...values, id, title: values.title! , slug: values.slug! })
    : db.update(posts).set(values).where(eq(posts.id, id))
  const statements = [postWrite.toSQL()]
  if (tagNames !== undefined) {
    if (!create) statements.push({ sql: 'DELETE FROM post_tags WHERE post_id = ?', params: [id] })
    for (const name of new Set(tagNames)) {
      statements.push({
        sql: 'INSERT INTO tags (id, name, slug) VALUES (?, ?, ?) ON CONFLICT(name) DO NOTHING',
        params: [crypto.randomUUID(), name, tagSlug(name)],
      }, {
        sql: 'INSERT INTO post_tags (post_id, tag_id) SELECT ?, id FROM tags WHERE name = ? ON CONFLICT DO NOTHING',
        params: [id, name],
      })
    }
  }
  // Drizzle batch executes all statements in one D1 transaction. Each query
  // keeps its parameter count below 100, regardless of the number of tags.
  await batchStatements(db, statements)
}
