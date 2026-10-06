import { afterEach, describe, expect, it, vi } from 'vitest'
import { env, exports } from 'cloudflare:workers'
import { eq, and, sql } from 'drizzle-orm'
import { createDb } from '../../src/db'
import { comments, emailOtps, posts, rateLimits, users, siteAnalytics } from '../../src/db/schema'
import { createCollection, getCollectionWithPosts, updateCollection } from '../../src/db/queries'
import { getHomeBlocks } from '../../src/db/home'
import { generateOtp, issueTokens, verifyOtp } from '../../src/services/auth'
import { sendReplyNotification } from '../../src/services/email'
import { checkRateLimit } from '../../src/utils/rate-limit'
import { trackPostView } from '../../src/utils/analytics'
import { escapeHtml } from '../../src/utils/html'
import { appFetch } from '../helpers'
import app from '../../src/index'

const db = createDb(env.DB)
const json = (body: unknown, method = 'POST') => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
afterEach(() => vi.restoreAllMocks())

async function post(extra = {}) {
  const response = await appFetch('/api/posts', json({ title: `Fix ${crypto.randomUUID()}`, content: '<p>one</p><p>two</p>', status: 'published', ...extra }))
  expect(response.status).toBe(201)
  return response.json() as Promise<{ id: string; slug: string; title: string; tags: { id: string; name: string }[] }>
}
async function account(role: 'user' | 'admin' = 'user') {
  const id = crypto.randomUUID()
  await db.insert(users).values({ id, email: `${id}@example.com`, name: 'Reader', role })
  const [user] = await db.select().from(users).where(eq(users.id, id))
  return { user, tokens: await issueTokens(db, env, user, {}) }
}

describe('Optimization regressions', () => {
  it('rejects forged Access headers and private-looking hostnames; health remains public', async () => {
    for (const host of ['localhost', '127.attacker.example', '192.168.attacker.example', '10.attacker.example']) {
      const response = await exports.default.fetch(new Request(`https://${host}/api/posts`, {
        headers: { 'Cf-Access-Jwt-Assertion': 'forged', 'Cf-Authorization': 'forged' },
      }))
      expect(response.status).toBe(401)
    }
    const health = await exports.default.fetch(new Request('https://mrwuliu.top/api/health'))
    expect(health.status).toBe(200)
    const preflight = await exports.default.fetch(new Request('https://mrwuliu.top/api/admin/users/id', {
      method: 'OPTIONS', headers: { Origin: 'https://mrwuliu.top', 'Access-Control-Request-Method': 'PATCH' },
    }))
    expect(preflight.headers.get('access-control-allow-methods')).toContain('PATCH')
  })

  it('restores a refresh-only session and returns both rotated cookies on a public page', async () => {
    const { tokens } = await account()
    const response = await appFetch('/settings', { headers: { Cookie: `refresh_token=${tokens.refreshToken}` } })
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('access_token=')
    expect(response.headers.get('set-cookie')).toContain('refresh_token=')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('lets concurrent private requests retry after one explicit session refresh', async () => {
    const item = await post()
    const { tokens } = await account('admin')
    const results = await Promise.all(Array.from({ length: 3 }, () => exports.default.fetch(new Request('https://mrwuliu.top/api/posts', {
      headers: { Cookie: `refresh_token=${tokens.refreshToken}` },
    }))))
    expect(results.every(response => response.status === 401 && !response.headers.has('set-cookie'))).toBe(true)
    const refreshed = await appFetch('/auth/refresh', { method: 'POST', headers: { Cookie: `refresh_token=${tokens.refreshToken}` } })
    expect(refreshed.status).toBe(200)
    const accessToken = refreshed.headers.get('set-cookie')?.match(/access_token=([^;]+)/)?.[1]
    expect(accessToken).toBeTruthy()
    const response = await exports.default.fetch(new Request(`https://mrwuliu.top/api/posts/${item.id}/comments`, {
      ...json({ content: 'Admin reply' }), headers: { 'Content-Type': 'application/json', Cookie: `access_token=${accessToken}` },
    }))
    expect(response.status).toBe(201)
  })

  it('serializes concurrent rate-limit checks and ignores expired ISO timestamps', async () => {
    const action = crypto.randomUUID()
    await db.insert(rateLimits).values({ ip: 'test', action, createdAt: new Date(Date.now() - 120000).toISOString() })
    const accepted = await Promise.all(Array.from({ length: 20 }, () => checkRateLimit(db, 'test', action, 3, 60)))
    expect(accepted.filter(Boolean)).toHaveLength(3)
  })

  it('invalidates every earlier OTP and caps concurrent failed attempts', async () => {
    const email = `${crypto.randomUUID()}@example.com`
    await generateOtp(db, env, email)
    const { code } = await generateOtp(db, env, email)
    const rows = await db.select().from(emailOtps).where(eq(emailOtps.email, email))
    expect(rows.filter(row => row.consumedAt === null)).toHaveLength(1)
    const wrong = code === '000000' ? '111111' : '000000'
    await Promise.all(Array.from({ length: 12 }, () => verifyOtp(db, email, wrong)))
    const [active] = await db.select().from(emailOtps).where(and(eq(emailOtps.email, email), sql`${emailOtps.consumedAt} IS NULL`))
    expect(active.attempts).toBe(5)
    expect((await verifyOtp(db, email, code)).valid).toBe(false)
  })

  it('preserves custom slugs, distinct punctuation tags, and one association per tag', async () => {
    const slug = `custom-${crypto.randomUUID()}`
    const item = await post({ slug, tags: ['C++', 'C#', 'C++'] })
    expect(item.slug).toBe(slug)
    expect(item.tags.map(tag => tag.name).sort()).toEqual(['C#', 'C++'])
    expect(new Set(item.tags.map(tag => tag.id)).size).toBe(2)
    const listed = await (await appFetch(`/api/posts?search=${encodeURIComponent(item.title)}`)).json() as { posts: { tags: unknown[]; content: string }[] }
    expect(listed.posts[0].tags).toHaveLength(2)
    expect(listed.posts[0].content).toBe('')
  })

  it('rolls back a failed slug update without changing metadata or tags', async () => {
    const existing = await post()
    const item = await post({ tags: ['retained'] })
    const response = await appFetch(`/api/posts/${item.id}`, json({ title: 'must roll back', slug: existing.slug, tags: ['lost'] }, 'PUT'))
    expect(response.status).toBe(409)
    const persisted = await (await appFetch(`/api/posts/${item.id}`)).json() as { title: string; tags: { name: string }[] }
    expect(persisted.title).toBe(item.title)
    expect(persisted.tags.map(tag => tag.name)).toEqual(['retained'])
  })

  it('clears optional translated fields and stores word counts with block boundaries', async () => {
    const item = await post({ excerpt: 'old', titleEn: 'old', excerptEn: 'old', contentEn: '<p>three four</p>' })
    const response = await appFetch(`/api/posts/${item.id}`, json({ excerpt: '', titleEn: '', excerptEn: '', contentEn: '' }, 'PUT'))
    const body = await response.json() as Record<string, unknown>
    expect(response.status).toBe(200)
    for (const field of ['excerpt', 'titleEn', 'excerptEn', 'contentEn']) expect(body[field]).toBe('')
    expect(body.wordCount).toBe(2)
    expect(body.wordCountEn).toBe(0)
  })

  it('rolls back collection metadata and membership together when a post is missing', async () => {
    const item = await post()
    const collection = await createCollection(db, { name: 'retained', slug: `series-${crypto.randomUUID()}`, postIds: [item.id, item.id] })
    expect(collection).toBeTruthy()
    await expect(updateCollection(db, collection!.id, { name: 'lost', postIds: [crypto.randomUUID()] })).rejects.toThrow()
    const persisted = await getCollectionWithPosts(db, collection!.id)
    expect(persisted?.name).toBe('retained')
    expect(persisted?.posts.map(row => row.id)).toEqual([item.id])
  })

  it('paginates more than 100 posts without an oversized IN query or truncated totals', async () => {
    const postIds: string[] = []
    for (let index = 0; index < 115; index++) {
      const id = crypto.randomUUID()
      postIds.push(id)
      await db.insert(posts).values({ id, slug: id, title: 'Many', status: 'published', publishedAt: new Date().toISOString() })
    }
    const home = await getHomeBlocks(db, 1)
    expect(home.total).toBeGreaterThanOrEqual(115)
    expect(home.rows).toHaveLength(10)
    expect((await appFetch('/')).status).toBe(200)
    const summary = await (await appFetch('/api/posts/summary')).json() as { totalPosts: number }
    expect(summary.totalPosts).toBeGreaterThanOrEqual(115)
    const page = await (await appFetch('/api/posts?limit=1000&page=-1')).json() as { limit: number; page: number }
    expect(page.limit).toBe(100)
    expect(page.page).toBe(1)
    const collection = await createCollection(db, { name: 'Many posts', slug: crypto.randomUUID(), postIds })
    expect((await getCollectionWithPosts(db, collection!.id))?.posts).toHaveLength(115)
  })

  it('searches long Chinese text literally, including SQL wildcard characters', async () => {
    const title = '中文搜索'.repeat(12) + '%_needle'
    await post({ title })
    const response = await appFetch(`/search?q=${encodeURIComponent(title)}`)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain(title)
    const list = await (await appFetch(`/api/posts?search=${encodeURIComponent(title)}`)).json() as { total: number }
    expect(list.total).toBe(1)
  })

  it('uses translated titles in series pages, the home series stack, navigation, and RSS', async () => {
    const item = await post({ title: '中文文章', titleEn: 'Translated article', pinned: true, excerptEn: 'Translated excerpt' })
    const collection = await createCollection(db, { name: '中文系列', nameEn: 'Translated series', slug: `series-${crypto.randomUUID()}`, status: 'published', postIds: [item.id] })
    for (const path of [`/en/series/${collection!.slug}`, `/en/posts/${item.slug}`, '/en/feed.xml']) {
      const html = await (await appFetch(path)).text()
      expect(html).toContain('Translated article')
    }
    const home = await (await appFetch('/en')).text()
    expect(home).toContain('Translated series')
    expect(home).toContain('Translated article')
  })

  it('renders deep comments once, escapes text once, and keeps replies after parent deletion', async () => {
    const item = await post()
    const ids = Array.from({ length: 3 }, () => crypto.randomUUID())
    for (const [index, id] of ids.entries()) {
      await db.insert(comments).values({ id, postId: item.id, parentId: index ? ids[index - 1] : null, authorName: 'Reader', content: escapeHtml(`level-${index} <b>&</b>`), status: 'approved' })
    }
    let html = await (await appFetch(`/posts/${item.slug}`)).text()
    for (const id of ids) expect(html.match(new RegExp(`id="comment-${id}"`, 'g'))).toHaveLength(1)
    expect(html).toContain('level-2 &lt;b&gt;&amp;&lt;/b&gt;')
    expect(html).not.toContain('level-2 &amp;lt;')
    expect((await appFetch(`/api/admin/comments/${ids[0]}`, { method: 'DELETE' })).status).toBe(200)
    html = await (await appFetch(`/posts/${item.slug}`)).text()
    expect(html).not.toContain(`id="comment-${ids[0]}"`)
    expect(html).toContain(`id="comment-${ids[2]}"`)
  })

  it('never serves removed comments from a warmed article cache', async () => {
    const item = await post()
    const id = crypto.randomUUID()
    await db.insert(comments).values({ id, postId: item.id, authorName: 'Reader', content: 'stale-comment-marker', status: 'approved' })
    expect(await (await appFetch(`/posts/${item.slug}`)).text()).toContain('stale-comment-marker')
    await appFetch(`/api/admin/comments/${id}`, json({ status: 'rejected' }, 'PUT'))
    await db.insert(comments).values({ id: crypto.randomUUID(), postId: item.id, authorName: 'Reader', content: 'fresh-comment-marker', status: 'approved' })
    const response = await appFetch(`/posts/${item.slug}`)
    const html = await response.text()
    expect(html).not.toContain('stale-comment-marker')
    expect(html).toContain('fresh-comment-marker')
    expect(response.headers.get('cache-control')).toContain('no-cache')
  })

  it('counts repeat PV and both languages consistently while excluding bots from human reports', async () => {
    const item = await post()
    const visitor = { postId: item.id, ip: '203.0.113.28', userAgent: 'Test reader', salt: env.JWT_SECRET }
    await Promise.all(['zh', 'zh', 'en'].map(lang => trackPostView(db, { ...visitor, lang })))
    await trackPostView(db, { ...visitor, userAgent: 'Googlebot', lang: 'zh' })
    const report = await (await appFetch(`/api/analytics/post/${item.id}/report`)).json() as {
      post: { totalViews: number; totalUniqueViews: number }; trends: { views: number }[];
      langStats: { lang: string; count: number }[]; botStats: { human: number; bot: number }; referrers: { count: number }[];
    }
    expect(report.post.totalViews).toBe(3)
    expect(report.post.totalUniqueViews).toBe(1)
    expect(report.trends[0].views).toBe(3)
    expect(report.langStats.find(row => row.lang === 'zh')?.count).toBe(2)
    expect(report.langStats.find(row => row.lang === 'en')?.count).toBe(1)
    expect(report.botStats).toEqual({ human: 3, bot: 1 })
    expect(report.referrers[0].count).toBe(3)
  })

  it('counts an English public page once and does not count API calls as page views', async () => {
    const totals = async () => (await db.select({ count: sql<number>`coalesce(sum(${siteAnalytics.pageViews}), 0)` }).from(siteAnalytics))[0].count
    const visit = async (path: string) => {
      const pending: Promise<unknown>[] = []
      await app.fetch(new Request(`http://localhost${path}`, { headers: { 'X-API-Key': env.API_KEY } }), env, {
        waitUntil(promise) { pending.push(promise) }, passThroughOnException() {}, props: {},
      })
      await Promise.all(pending)
      return pending.length
    }
    const before = await totals()
    expect(await visit('/en/about')).toBe(1)
    expect(await totals()).toBe(before + 1)
    expect(await visit('/api/posts')).toBe(0)
    expect(await totals()).toBe(before + 1)
  })

  it('notifies once per reply, including later replies to an already-notified parent', async () => {
    const item = await post()
    const parentId = crypto.randomUUID()
    await db.insert(comments).values({ id: parentId, postId: item.id, authorName: 'Parent', authorEmail: 'parent@example.com', content: 'parent', status: 'approved', notifyOnReply: true, replyNotified: true })
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200 }))
    for (let index = 0; index < 2; index++) {
      const replyComment = { id: crypto.randomUUID(), parentId, authorName: 'Reply', content: 'reply', postId: item.id }
      await db.insert(comments).values({ ...replyComment, status: 'approved' })
      const params = { db, env, replyComment, origin: 'https://mrwuliu.top', lang: 'zh' as const }
      await Promise.all([sendReplyNotification(params), sendReplyNotification(params)])
    }
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('rejects invalid resource types, unsafe URLs, oversized English fields, and nonfinite scroll input', async () => {
    const invalid: [string, unknown][] = [
      ['/api/projects', { title: 'x', status: 'invalid' }],
      ['/api/friend-links', { name: 'x', url: 'javascript:alert(1)' }],
      ['/api/collections', { name: 'x', slug: 'x', postIds: ['bad'] }],
      ['/api/posts', { title: 'x', content: '', contentEn: 'x'.repeat(100001) }],
      ['/api/analytics/scroll', { postId: crypto.randomUUID(), scrollDepth: 'NaN' }],
    ]
    for (const [path, body] of invalid) expect((await appFetch(path, json(body))).status).toBe(400)
  })

  it('versions avatar URLs on each upload so immutable caches cannot serve the previous image', async () => {
    const { tokens } = await account()
    const upload = async () => {
      const body = new FormData()
      body.append('file', new File(['png'], 'avatar.png', { type: 'image/png' }))
      const response = await appFetch('/auth/avatar', { method: 'POST', headers: { Cookie: `access_token=${tokens.accessToken}` }, body })
      expect(response.status).toBe(200)
      return response.json() as Promise<{ user: { avatarUrl: string } }>
    }
    const first = await upload()
    const second = await upload()
    expect(second.user.avatarUrl).not.toBe(first.user.avatarUrl)
    const response = await appFetch(second.user.avatarUrl)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('immutable')
  })

  it('updates only the scroll event for the requested language', async () => {
    const item = await post()
    const headers = { 'User-Agent': 'Scroll reader', 'CF-Connecting-IP': '203.0.113.40' }
    const visitor = { postId: item.id, ip: headers['CF-Connecting-IP'], userAgent: headers['User-Agent'], salt: env.JWT_SECRET }
    await trackPostView(db, { ...visitor, lang: 'zh' })
    await trackPostView(db, { ...visitor, lang: 'en' })
    const response = await appFetch('/api/analytics/scroll', { ...json({ postId: item.id, scrollDepth: 95, lang: 'en' }), headers: { ...headers, 'Content-Type': 'application/json' } })
    expect(response.status).toBe(200)
    const events = await db.all<{ lang: string; scroll_depth: number | null }>(sql`SELECT lang, scroll_depth FROM post_view_events WHERE post_id = ${item.id}`)
    expect(events.find(row => row.lang === 'en')?.scroll_depth).toBe(95)
    expect(events.find(row => row.lang === 'zh')?.scroll_depth).toBeNull()
  })
})
