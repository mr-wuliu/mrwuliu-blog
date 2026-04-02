import { Hono } from 'hono'
import { eq, desc, asc, and, sql, inArray } from 'drizzle-orm'
import { createDb } from '../db'
import { posts, tags, postTags, comments, postLikes } from '../db/schema'
import { getPublishedPosts, getPostWithTags, getSiteConfig, getPublishedProjects, getProjectById, getAuthorProfile } from '../db/queries'
import { renderLatex, generateToc } from '../utils/latex'
import { checkRateLimit } from '../utils/rate-limit'
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
import { generateSitemap } from '../utils/sitemap'
import { type Lang, langPath, t } from '../i18n'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

const blogRoutes = new Hono<{ Bindings: Bindings }>()

function createBlogRouter(lang: Lang) {
  const router = new Hono<{ Bindings: Bindings }>()

  router.get('/', async (c) => {
    const db = createDb(c.env.DB)
    const page = Math.max(1, Number(c.req.query('page')) || 1)
    const limit = 10

    const result = await getPublishedPosts(db, { page, limit })
    const authorProfile = await getAuthorProfile(db)

    const postIds = result.posts.map(p => p.id)

    const commentCounts = postIds.length ? Object.fromEntries(
      (await db
        .select({ postId: comments.postId, count: sql<number>`count(*)` })
        .from(comments)
        .where(and(inArray(comments.postId, postIds), eq(comments.status, 'approved')))
        .groupBy(comments.postId)
      ).map(r => [r.postId, r.count])
    ) : {}

    const likeCounts = postIds.length ? Object.fromEntries(
      (await db
        .select({ postId: postLikes.postId, count: sql<number>`count(*)` })
        .from(postLikes)
        .where(inArray(postLikes.postId, postIds))
        .groupBy(postLikes.postId)
      ).map(r => [r.postId, r.count])
    ) : {}

    const postsWithTags = await Promise.all(
      result.posts.map(async (post) => {
        const postWithTags = await getPostWithTags(db, post.id)
        return {
          ...post,
          tags: postWithTags?.tags ?? [],
          commentCount: commentCounts[post.id] ?? 0,
          likeCount: likeCounts[post.id] ?? 0,
        }
      })
    )

    const totalPages = Math.ceil(result.total / limit)

    return c.html(
      <Home
        lang={lang}
        posts={postsWithTags}
        pagination={{
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages,
        }}
        authorProfile={authorProfile}
      />
    )
  })

  router.get('/tags', (c) => {
    return c.redirect(langPath('/', lang))
  })

  router.get('/tags/:slug', async (c) => {
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
      .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published'), eq(posts.hidden, false)))
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .offset(offset)

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(postTags)
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(and(eq(postTags.tagId, tag.id), eq(posts.status, 'published'), eq(posts.hidden, false)))

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
    const authorProfile = await getAuthorProfile(db)

    return c.html(
      <TagPage
        lang={lang}
        tag={tag}
        posts={postsWithTags}
        allTags={allTags}
        pagination={{
          page,
          limit,
          total,
          totalPages,
        }}
        authorProfile={authorProfile}
      />
    )
  })

  router.get('/posts/:slug', async (c) => {
    const slug = c.req.param('slug')
    const db = createDb(c.env.DB)

    const [post] = await db.select().from(posts).where(eq(posts.slug, slug))
    if (!post || post.status !== 'published') {
      return c.html(<NotFoundPage lang={lang} />, 404)
    }

    const postWithTags = await getPostWithTags(db, post.id)
    if (!postWithTags) {
      return c.html(<NotFoundPage lang={lang} />, 404)
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
    const authorProfile = await getAuthorProfile(db)

    return c.html(
      <PostPage
        lang={lang}
        post={postWithTags}
        content={tocHtml}
        headings={headings}
        comments={approvedComments}
        prev={prevPost}
        next={nextPost}
        authorProfile={authorProfile}
      />
    )
  })

  router.post('/posts/:slug/comments', async (c) => {
    const slug = c.req.param('slug')
    const db = createDb(c.env.DB)
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    const allowed = await checkRateLimit(db, ip, 'comment', 5, 60)
    if (!allowed) {
      return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429)
    }

    const contentType = c.req.header('Content-Type') ?? ''

    let authorName: string
    let authorEmail: string | undefined
    let visitorId: string | undefined
    let content: string

    if (contentType.includes('application/json')) {
      const body = await c.req.json<{ authorName: string; authorEmail?: string; visitorId?: string; content: string }>()
      authorName = body.authorName
      authorEmail = body.authorEmail
      visitorId = body.visitorId
      content = body.content
    } else {
      const formData = await c.req.parseBody<{ authorName: string; authorEmail?: string; visitorId?: string; content: string }>()
      authorName = String(formData.authorName ?? '')
      authorEmail = formData.authorEmail ? String(formData.authorEmail) : undefined
      visitorId = formData.visitorId ? String(formData.visitorId) : undefined
      content = String(formData.content ?? '')
    }

    if (!authorName || authorName.length < 1 || authorName.length > 50) {
      return c.redirect(langPath(`/posts/${slug}`, lang))
    }
    if (!content || content.length < 1 || content.length > 1000) {
      return c.redirect(langPath(`/posts/${slug}`, lang))
    }

    const [post] = await db.select().from(posts).where(eq(posts.slug, slug))
    if (!post) return c.redirect(langPath(`/posts/${slug}`, lang))

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
      visitorId: visitorId ? escapeHtml(visitorId) : null,
      content: escapeHtml(content),
      status: 'pending',
    })

    return c.redirect(langPath(`/posts/${slug}`, lang))
  })

  router.get('/writings', async (c) => {
    const db = createDb(c.env.DB)
    const result = await getPublishedPosts(db, { page: 1, limit: 1000 })
    const authorProfile = await getAuthorProfile(db)
    return c.html(<WritingsPage lang={lang} posts={result.posts} authorProfile={authorProfile} />)
  })

  router.get('/about', async (c) => {
    const db = createDb(c.env.DB)
    const aboutConfig = await getSiteConfig(db, 'about')
    const content = aboutConfig?.value || `<p>${t(lang, 'about.noContent')}</p>`
    const authorProfile = await getAuthorProfile(db)
    return c.html(<AboutPage lang={lang} content={content} authorProfile={authorProfile} />)
  })

  router.get('/tags-cloud', async (c) => {
    const db = createDb(c.env.DB)
    const allTags = await db.select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      postCount: sql<number>`count(${posts.id})`
    }).from(tags)
      .leftJoin(postTags, eq(tags.id, postTags.tagId))
      .leftJoin(posts, and(eq(postTags.postId, posts.id), eq(posts.status, 'published'), eq(posts.hidden, false)))
      .groupBy(tags.id)
      .orderBy(desc(sql`count(${posts.id})`))

    const authorProfile = await getAuthorProfile(db)

    return c.html(<TagsCloudPage lang={lang} tags={allTags} authorProfile={authorProfile} />)
  })

  router.get('/projects', async (c) => {
    const db = createDb(c.env.DB)
    const publishedProjects = await getPublishedProjects(db)
    const authorProfile = await getAuthorProfile(db)
    return c.html(<ProjectsPage lang={lang} projects={publishedProjects} authorProfile={authorProfile} />)
  })

  router.get('/projects/:id', async (c) => {
    const db = createDb(c.env.DB)
    const id = c.req.param('id')
    const project = await getProjectById(db, id)
    if (!project || project.status !== 'published') {
      return c.html(<NotFoundPage lang={lang} />, 404)
    }
    const authorProfile = await getAuthorProfile(db)
    return c.html(<ProjectDetailPage lang={lang} project={project} authorProfile={authorProfile} />)
  })

  return router
}

blogRoutes.route('/', createBlogRouter('zh'))
blogRoutes.route('/en', createBlogRouter('en'))

// Redirect trailing slash: /en/ → /en (Hono doesn't match /en/ via route('/en', ...))
blogRoutes.get('/en/', (c) => c.redirect('/en'))

blogRoutes.get('/feed.xml', async (c) => {
  const db = createDb(c.env.DB)

  const result = await getPublishedPosts(db, { page: 1, limit: 20 })

  const baseUrl = new URL(c.req.url).origin
  const rssXml = generateRSS(result.posts, baseUrl)

  return c.body(rssXml, 200, {
    'Content-Type': 'application/xml',
  })

blogRoutes.get('/sitemap.xml', async (c) => {
  const db = createDb(c.env.DB)
  const result = await getPublishedPosts(db, { page: 1, limit: 1000 })
  const baseUrl = new URL(c.req.url).origin
  const sitemapXml = generateSitemap(result.posts, baseUrl)
  return c.body(sitemapXml, 200, {
    'Content-Type': 'application/xml',
  })
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
      .where(and(eq(posts.status, 'published'), eq(posts.hidden, false), sql`${posts.publishedAt} < ${currentPublishedAt}`))
      .orderBy(desc(posts.publishedAt))
      .limit(1)
    return result ?? null
  }

  const [result] = await db
    .select({ slug: posts.slug, title: posts.title })
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.hidden, false), sql`${posts.publishedAt} > ${currentPublishedAt}`))
    .orderBy(asc(posts.publishedAt))
    .limit(1)
  return result ?? null
}

export default blogRoutes
