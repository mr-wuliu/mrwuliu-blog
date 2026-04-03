import { eq, desc, and, sql, asc, inArray } from 'drizzle-orm'
import { posts, postTags, tags, siteConfig, projects, postStats } from './schema'
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
    .select({
      post: posts,
      viewCount: sql<number>`coalesce(${postStats.viewCount}, 0)`,
      uniqueViewCount: sql<number>`coalesce(${postStats.uniqueViewCount}, 0)`,
    })
    .from(posts)
    .leftJoin(postStats, eq(postStats.postId, posts.id))
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

  return {
    posts: result.map(({ post, viewCount, uniqueViewCount }) => ({
      ...post,
      viewCount,
      uniqueViewCount,
    })),
    total,
    page,
    limit,
  }
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
    .where(and(eq(posts.status, 'published'), eq(posts.hidden, false)))
    .orderBy(desc(posts.pinned), desc(posts.publishedAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.hidden, false)))

  const total = countResult[0]?.count ?? 0
  return { posts: result, total, page, limit }
}

// Site config queries
export async function getSiteConfig(db: Database, key: string) {
  const [config] = await db.select().from(siteConfig).where(eq(siteConfig.key, key))
  return config ?? undefined
}

export async function upsertSiteConfig(db: Database, data: { key: string; value: string }) {
  await db
    .insert(siteConfig)
    .values({ key: data.key, value: data.value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: siteConfig.key,
      set: { value: data.value, updatedAt: new Date().toISOString() },
    })
  const [config] = await db.select().from(siteConfig).where(eq(siteConfig.key, data.key))
  return config
}

// Project queries
export async function getPublishedProjects(db: Database) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.status, 'published'))
    .orderBy(asc(projects.sortOrder))
}

export async function getAllProjects(db: Database) {
  return db.select().from(projects).orderBy(asc(projects.sortOrder))
}

export async function getProjectById(db: Database, id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id))
  return project ?? undefined
}

export async function createProject(
  db: Database,
  data: {
    title: string
    description?: string
    url?: string
    coverImageKey?: string
    techStack?: string
    sortOrder?: number
    status?: 'draft' | 'published'
  }
) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.insert(projects).values({
    id,
    title: data.title,
    description: data.description ?? '',
    url: data.url,
    coverImageKey: data.coverImageKey,
    techStack: data.techStack ?? '',
    sortOrder: data.sortOrder ?? 0,
    status: data.status ?? 'draft',
    createdAt: now,
    updatedAt: now,
  })
  const [project] = await db.select().from(projects).where(eq(projects.id, id))
  return project
}

export async function updateProject(
  db: Database,
  id: string,
  data: {
    title?: string
    description?: string
    url?: string
    coverImageKey?: string
    techStack?: string
    sortOrder?: number
    status?: 'draft' | 'published'
  }
) {
  await db
    .update(projects)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, id))
  const [project] = await db.select().from(projects).where(eq(projects.id, id))
  return project
}

export async function deleteProject(db: Database, id: string) {
  await db.delete(projects).where(eq(projects.id, id))
}

export async function getAuthorProfile(db: Database) {
  const keys = ['author_avatar', 'author_bio', 'author_github', 'author_email']
  const results = await db.select().from(siteConfig).where(inArray(siteConfig.key, keys))
  const map: Record<string, string> = {}
  for (const r of results) {
    map[r.key] = r.value
  }
  return {
    avatar: map['author_avatar'] || '',
    bio: map['author_bio'] || '',
    github: map['author_github'] || '',
    email: map['author_email'] || '',
  }
}
