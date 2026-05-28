interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: string
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function generateSitemap(
  posts: { slug: string; publishedAt: string | null; updatedAt: string | null }[],
  tags: { slug: string }[],
  collections: { slug: string; updatedAt: string | null }[],
  baseUrl: string
): string {
  const siteUrl = baseUrl.replace(/\/$/, '')

  const staticPages: SitemapEntry[] = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/en', changefreq: 'daily', priority: '0.9' },
    { loc: '/writings', changefreq: 'daily', priority: '0.9' },
    { loc: '/en/writings', changefreq: 'daily', priority: '0.8' },
    { loc: '/series', changefreq: 'weekly', priority: '0.8' },
    { loc: '/en/series', changefreq: 'weekly', priority: '0.7' },
    { loc: '/projects', changefreq: 'weekly', priority: '0.7' },
    { loc: '/en/projects', changefreq: 'weekly', priority: '0.7' },
    { loc: '/tags-cloud', changefreq: 'weekly', priority: '0.6' },
    { loc: '/en/tags-cloud', changefreq: 'weekly', priority: '0.6' },
    { loc: '/about', changefreq: 'monthly', priority: '0.5' },
    { loc: '/en/about', changefreq: 'monthly', priority: '0.5' },
    { loc: '/friends', changefreq: 'monthly', priority: '0.5' },
    { loc: '/en/friends', changefreq: 'monthly', priority: '0.5' },
  ]

  const postPages: SitemapEntry[] = posts.flatMap((post) => [
    {
      loc: `/posts/${post.slug}`,
      lastmod: post.updatedAt ?? post.publishedAt ?? undefined,
      changefreq: 'weekly' as const,
      priority: '0.8',
    },
    {
      loc: `/en/posts/${post.slug}`,
      lastmod: post.updatedAt ?? post.publishedAt ?? undefined,
      changefreq: 'weekly' as const,
      priority: '0.7',
    },
  ])

  const tagPages: SitemapEntry[] = tags.flatMap((tag) => [
    {
      loc: `/tags/${tag.slug}`,
      changefreq: 'weekly' as const,
      priority: '0.6',
    },
    {
      loc: `/en/tags/${tag.slug}`,
      changefreq: 'weekly' as const,
      priority: '0.5',
    },
  ])

  const collectionPages: SitemapEntry[] = collections.flatMap((col) => [
    {
      loc: `/series/${col.slug}`,
      lastmod: col.updatedAt ?? undefined,
      changefreq: 'weekly' as const,
      priority: '0.7',
    },
    {
      loc: `/en/series/${col.slug}`,
      lastmod: col.updatedAt ?? undefined,
      changefreq: 'weekly' as const,
      priority: '0.6',
    },
  ])

  const allPages = [...staticPages, ...postPages, ...tagPages, ...collectionPages]

  const urls = allPages
    .map((page) => {
      const loc = `${siteUrl}${page.loc}`
      const xhtmlLinks = buildXhtmlLinks(page.loc, siteUrl)
      return `  <url>
    <loc>${escapeXml(loc)}</loc>${page.lastmod ? `\n    <lastmod>${escapeXml(page.lastmod)}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${xhtmlLinks}
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`
}

function buildXhtmlLinks(loc: string, siteUrl: string): string {
  const zhPath = loc.replace(/^\/en/, '') || '/'
  const enPath = loc.startsWith('/en') ? loc : `/en${loc}`
  return `
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${siteUrl}${zhPath}" />
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}${enPath}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${zhPath}" />`
}
