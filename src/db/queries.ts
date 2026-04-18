import { eq, desc, and, sql, asc, inArray } from 'drizzle-orm'
import { posts, postTags, tags, siteConfig, projects, postStats, collections, collectionPosts } from './schema'
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

export async function getAllCollections(db: Database) {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      nameEn: collections.nameEn,
      slug: collections.slug,
      description: collections.description,
      descriptionEn: collections.descriptionEn,
      coverImageKey: collections.coverImageKey,
      sortOrder: collections.sortOrder,
      status: collections.status,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      postCount: sql<number>`count(${collectionPosts.postId})`,
    })
    .from(collections)
    .leftJoin(collectionPosts, eq(collections.id, collectionPosts.collectionId))
    .groupBy(collections.id)
    .orderBy(asc(collections.sortOrder))
}

export async function getPublishedCollections(db: Database) {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      nameEn: collections.nameEn,
      slug: collections.slug,
      description: collections.description,
      descriptionEn: collections.descriptionEn,
      coverImageKey: collections.coverImageKey,
      sortOrder: collections.sortOrder,
      status: collections.status,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      postCount: sql<number>`count(${collectionPosts.postId})`,
    })
    .from(collections)
    .leftJoin(collectionPosts, eq(collections.id, collectionPosts.collectionId))
    .where(eq(collections.status, 'published'))
    .groupBy(collections.id)
    .orderBy(asc(collections.sortOrder))
}

export async function getCollectionById(db: Database, id: string) {
  const result = await db.select().from(collections).where(eq(collections.id, id))
  return result[0] || null
}

export async function getCollectionBySlug(db: Database, slug: string) {
  const result = await db.select().from(collections).where(eq(collections.slug, slug))
  return result[0] || null
}

export async function getCollectionWithPosts(db: Database, id: string) {
  const collection = await getCollectionById(db, id)
  if (!collection) return null

  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      status: posts.status,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(collectionPosts)
    .innerJoin(posts, eq(collectionPosts.postId, posts.id))
    .where(eq(collectionPosts.collectionId, id))
    .orderBy(asc(collectionPosts.sortOrder))

  return { ...collection, posts: result }
}

export async function getPublishedCollectionWithPosts(db: Database, slug: string) {
  const collection = await getCollectionBySlug(db, slug)
  if (!collection || collection.status !== 'published') return null

  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      status: posts.status,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(collectionPosts)
    .innerJoin(posts, eq(collectionPosts.postId, posts.id))
    .where(eq(collectionPosts.collectionId, collection.id))
    .orderBy(asc(collectionPosts.sortOrder))

  return { ...collection, posts: result }
}

export async function createCollection(db: Database, data: { name: string; nameEn?: string; slug: string; description?: string; descriptionEn?: string; coverImageKey?: string; sortOrder?: number; status?: string }) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.insert(collections).values({
    id,
    name: data.name,
    nameEn: data.nameEn || null,
    slug: data.slug,
    description: data.description || '',
    descriptionEn: data.descriptionEn || null,
    coverImageKey: data.coverImageKey || null,
    sortOrder: data.sortOrder ?? 0,
    status: (data.status as 'draft' | 'published') || 'draft',
    createdAt: now,
    updatedAt: now,
  })
  return getCollectionById(db, id)
}

export async function updateCollection(db: Database, id: string, data: Partial<{ name: string; nameEn: string; slug: string; description: string; descriptionEn: string; coverImageKey: string; sortOrder: number; status: 'draft' | 'published'; postIds: string[] }>) {
  const { postIds, ...updateData } = data
  const now = new Date().toISOString()

  if (Object.keys(updateData).length > 0) {
    await db.update(collections).set({ ...updateData, updatedAt: now }).where(eq(collections.id, id))
  }

  if (postIds) {
    await db.delete(collectionPosts).where(eq(collectionPosts.collectionId, id))
    if (postIds.length > 0) {
      await db.insert(collectionPosts).values(
        postIds.map((postId, index) => ({
          collectionId: id,
          postId,
          sortOrder: index,
        }))
      )
    }
  }

  return getCollectionById(db, id)
}

export async function deleteCollection(db: Database, id: string) {
  await db.delete(collections).where(eq(collections.id, id))
}

export async function getPostCollections(db: Database, postId: string) {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      nameEn: collections.nameEn,
      slug: collections.slug,
    })
    .from(collectionPosts)
    .innerJoin(collections, eq(collectionPosts.collectionId, collections.id))
    .where(eq(collectionPosts.postId, postId))
}
