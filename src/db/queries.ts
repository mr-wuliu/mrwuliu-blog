import { eq, desc, and, sql } from 'drizzle-orm'
import { posts, postTags, tags } from './schema'
import type { Database } from './index'

// Get posts with pagination (admin - all statuses)
export async function getPostsWithPagination(
  db: Database,
  options: { page?: number; limit?: number; status?: 'draft' | 'published' }
) {
  const page = options.page ?? 1
  const limit = options.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = options.status ? [eq(posts.status, options.status)] : []

  const result = await db
    .select()
    .from(posts)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset)

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(conditions.length ? and(...conditions) : undefined)

  const total = countResult[0]?.count ?? 0

  return { posts: result, total, page, limit }
}

// Get post by slug (for public pages)
export async function getPostBySlug(db: Database, slug: string) {
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug))
  return post ?? null
}

// Get post with its tags
export async function getPostWithTags(db: Database, postId: string) {
  const post = await db.select().from(posts).where(eq(posts.id, postId))
  if (!post.length) return null

  const postTagsResult = await db
    .select({ tag: tags })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, postId))

  return { ...post[0], tags: postTagsResult.map(r => r.tag) }
}

// Get published posts with pagination (for public pages)
export async function getPublishedPosts(
  db: Database,
  options: { page?: number; limit?: number }
) {
  const page = options.page ?? 1
  const limit = options.limit ?? 10
  const offset = (page - 1) * limit

  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(eq(posts.status, 'published'))

  const total = countResult[0]?.count ?? 0
  return { posts: result, total, page, limit }
}
