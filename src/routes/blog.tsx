import { Hono } from 'hono'
import { eq, desc, asc, and, sql } from 'drizzle-orm'
import { createDb } from '../db'
import { posts, tags, postTags, comments } from '../db/schema'
import { getPublishedPosts, getPostWithTags, getSiteConfig, getPublishedProjects, getProjectById } from '../db/queries'
import { renderLatex, generateToc } from '../utils/latex'
import Home from '../views/home'
import TagPage from '../views/tag'
import PostPage from '../views/post'
import NotFoundPage from '../views/404'
import AboutPage from '../views/about'
import WritingsPage from '../views/writings'
import TagsCloudPage from '../views/tags-cloud'
import ProjectsPage from '../views/projects'
import ProjectDetailPage from '../views/project-detail'
import { generateRSS } from '../utils/rss'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

const blogRoutes = new Hono<{ Bindings: Bindings }>()

blogRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)
  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const limit = 10

  const result = await getPublishedPosts(db, { page, limit })

  const postsWithTags = await Promise.all(
    result.posts.map(async (post) => {
      const postWithTags = await getPostWithTags(db, post.id)
      return {
        ...post,
        tags: postWithTags?.tags ?? [],
      }
    })
  )

  const totalPages = Math.ceil(result.total / limit)

  return c.html(
    <Home
      posts={postsWithTags}
      pagination={{
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
      }}
    />
  )
})

blogRoutes.get('/tags', (c) => {
  return c.redirect('/')
})

// GET /tags/:slug — Tag page with published posts
blogRoutes.get('/tags/:slug', async (c) => {
  const db = createDb(c.env.DB)
  const slug = c.req.param('slug')

  const [tag] = await db.select().from(tags).where(eq(tags.slug, slug))
  if (!tag) return c.notFound()

  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const limit = 10
  const offset = (page - 1) * limit

  const tagPosts = await db
    .select({ post: posts })
    .from(postTags)
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published')))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(postTags)
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published')))

  const total = countResult[0]?.count ?? 0
  const totalPages = Math.ceil(total / limit)

  const postsWithTags = await Promise.all(
    tagPosts.map(async ({ post }) => {
      const postWithTags = await getPostWithTags(db, post.id)
      return {
        ...post,
        tags: postWithTags?.tags ?? [],
      }
    })
  )

  const allTags = await db.select().from(tags)

  return c.html(
    <TagPage
      tag={tag}
      posts={postsWithTags}
      allTags={allTags}
      pagination={{
        page,
        limit,
        total,
        totalPages,
      }}
    />
  )
})

// GET /posts/:slug — Post detail page
blogRoutes.get('/posts/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = createDb(c.env.DB)

  const [post] = await db.select().from(posts).where(eq(posts.slug, slug))
  if (!post || post.status !== 'published') {
    return c.html(<NotFoundPage />, 404)
  }

  const postWithTags = await getPostWithTags(db, post.id)
  if (!postWithTags) {
    return c.html(<NotFoundPage />, 404)
  }

  const approvedComments = await db
    .select()
    .from(comments)
    .where(and(eq(comments.postId, post.id), eq(comments.status, 'approved')))
    .orderBy(asc(comments.createdAt))

  let renderedContent = renderLatex(postWithTags.content)
  const { html: tocHtml, headings } = generateToc(renderedContent)

  const prevPost = await getAdjacentPost(db, postWithTags.publishedAt, 'prev')
  const nextPost = await getAdjacentPost(db, postWithTags.publishedAt, 'next')

  return c.html(
    <PostPage
      post={postWithTags}
      content={tocHtml}
      headings={headings}
      comments={approvedComments}
      prev={prevPost}
      next={nextPost}
    />
  )
})

blogRoutes.post('/posts/:slug/comments', async (c) => {
  const slug = c.req.param('slug')
  const db = createDb(c.env.DB)
  const contentType = c.req.header('Content-Type') ?? ''

  let authorName: string
  let authorEmail: string | undefined
  let content: string

  if (contentType.includes('application/json')) {
    const body = await c.req.json<{ authorName: string; authorEmail?: string; content: string }>()
    authorName = body.authorName
    authorEmail = body.authorEmail
    content = body.content
  } else {
    const formData = await c.req.parseBody<{ authorName: string; authorEmail?: string; content: string }>()
    authorName = String(formData.authorName ?? '')
    authorEmail = formData.authorEmail ? String(formData.authorEmail) : undefined
    content = String(formData.content ?? '')
  }

  if (!authorName || authorName.length < 1 || authorName.length > 50) {
    return c.redirect(`/posts/${slug}`)
  }
  if (!content || content.length < 1 || content.length > 1000) {
    return c.redirect(`/posts/${slug}`)
  }

  const [post] = await db.select().from(posts).where(eq(posts.slug, slug))
  if (!post) return c.redirect(`/posts/${slug}`)

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const id = crypto.randomUUID()
  await db.insert(comments).values({
    id,
    postId: post.id,
    authorName: escapeHtml(authorName),
    authorEmail: authorEmail ? escapeHtml(authorEmail) : null,
    content: escapeHtml(content),
    status: 'pending',
  })

  return c.redirect(`/posts/${slug}`)
})

// GET /writings — All articles list
blogRoutes.get('/writings', async (c) => {
  const db = createDb(c.env.DB)
  const result = await getPublishedPosts(db, { page: 1, limit: 1000 })
  return c.html(<WritingsPage posts={result.posts} />)
})

// GET /about — About page
blogRoutes.get('/about', async (c) => {
  const db = createDb(c.env.DB)
  const aboutConfig = await getSiteConfig(db, 'about')
  const content = aboutConfig?.value || '<p>暂无内容</p>'
  return c.html(<AboutPage content={content} />)
})

// GET /tags-cloud — Tags cloud page
blogRoutes.get('/tags-cloud', async (c) => {
  const db = createDb(c.env.DB)
  const allTags = await db.select({
    id: tags.id,
    name: tags.name,
    slug: tags.slug,
    postCount: sql<number>`count(${postTags.postId})`
  }).from(tags)
    .leftJoin(postTags, eq(tags.id, postTags.tagId))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(${postTags.postId})`))

  return c.html(<TagsCloudPage tags={allTags} />)
})

// GET /projects — Projects page
blogRoutes.get('/projects', async (c) => {
  const db = createDb(c.env.DB)
  const publishedProjects = await getPublishedProjects(db)
  return c.html(<ProjectsPage projects={publishedProjects} />)
})

// GET /projects/:id — Project detail page
blogRoutes.get('/projects/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')
  const project = await getProjectById(db, id)
  if (!project || project.status !== 'published') {
    return c.html(<NotFoundPage />, 404)
  }
  return c.html(<ProjectDetailPage project={project} />)
})

// GET /feed.xml — RSS 2.0 feed
blogRoutes.get('/feed.xml', async (c) => {
  const db = createDb(c.env.DB)

  const result = await getPublishedPosts(db, { page: 1, limit: 20 })

  const baseUrl = new URL(c.req.url).origin
  const rssXml = generateRSS(result.posts, baseUrl)

  return c.body(rssXml, 200, {
    'Content-Type': 'application/xml',
  })
})

async function getAdjacentPost(
  db: ReturnType<typeof createDb>,
  currentPublishedAt: string | null,
  direction: 'prev' | 'next'
): Promise<{ slug: string; title: string } | null> {
  if (!currentPublishedAt) return null

  if (direction === 'prev') {
    const [result] = await db
      .select({ slug: posts.slug, title: posts.title })
      .from(posts)
      .where(and(eq(posts.status, 'published'), sql`${posts.publishedAt} < ${currentPublishedAt}`))
      .orderBy(desc(posts.publishedAt))
      .limit(1)
    return result ?? null
  }

  const [result] = await db
    .select({ slug: posts.slug, title: posts.title })
    .from(posts)
    .where(and(eq(posts.status, 'published'), sql`${posts.publishedAt} > ${currentPublishedAt}`))
    .orderBy(asc(posts.publishedAt))
    .limit(1)
  return result ?? null
}

export default blogRoutes
