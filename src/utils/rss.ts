interface RSSPost {
  title: string
  slug: string
  excerpt: string | null
  publishedAt: string | null
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toRFC822(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toUTCString()
}

export function generateRSS(posts: RSSPost[], baseUrl: string): string {
  const siteTitle = 'Blog'
  const siteDescription = 'Personal Blog - Tech & Life'
  const siteUrl = baseUrl.replace(/\/$/, '')
  const lastBuildDate = new Date().toUTCString()

  const items = posts
    .map((post) => {
      const link = `${siteUrl}/posts/${post.slug}`
      const pubDate = post.publishedAt ? toRFC822(post.publishedAt) : ''
      const description = post.excerpt
        ? `<![CDATA[${post.excerpt}]]>`
        : ''

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      ${description ? `<description>${description}</description>` : ''}
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-cn</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`
}
