import { describe, expect, it } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import Home, { type HomeRenderGroup } from '../../src/views/home'

const post = {
  id: 'cover-post', title: 'A long title / 长标题', slug: 'cover-post', content: '', excerpt: 'An excerpt',
  coverImageKey: 'images/portrait.webp', status: 'published' as const, hidden: false, pinned: false,
  publishedAt: '2026-11-01', createdAt: '2026-11-01', updatedAt: '2026-11-01',
}
const pagination = { page: 1, limit: 10, total: 1, totalPages: 1 }

describe('Home gallery', () => {
  it('links covers to translated articles and keeps text-only posts usable', () => {
    const groups: HomeRenderGroup[] = [{ kind: 'post', post }, { kind: 'post', post: { ...post, id: 'text', coverImageKey: null } }]
    const html = renderToString(<Home lang="en" groups={groups} pagination={pagination} />)
    expect(html).toContain('src="/images/images/portrait.webp"')
    expect(html).toContain('href="/en/posts/cover-post"')
    expect(html).toContain('journal-card-text')
    expect(html).toContain('aria-label="Like"')
  })

  it('limits long series previews while linking to the full series', () => {
    const html = renderToString(<Home lang="zh" pagination={pagination} groups={[{
      kind: 'series', collection: { id: 'series', name: '系列', nameEn: null, slug: 'series' },
      posts: Array.from({ length: 12 }, (_, i) => ({ ...post, id: `${i}`, title: `Article ${i}` })),
    }]} />)
    expect(html).toContain('12 篇')
    expect(html).toContain('Article 2')
    expect(html).not.toContain('Article 3')
    expect(html).toContain('href="/series/series"')
  })
})
