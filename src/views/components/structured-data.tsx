import type { FC } from 'hono/jsx'

const SITE_NAME = "mrwuliu's blog"
const BASE_URL = 'https://mrwuliu.top'

/**
 * Article schema — add to every blog post page.
 * AI engines use author, publisher, datePublished, dateModified to evaluate source credibility.
 */
type ArticleSchemaProps = {
  title: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  authorName?: string
  authorUrl?: string
  imageUrl?: string
}

export const ArticleSchema: FC<{ data: ArticleSchemaProps }> = ({ data }) => {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    url: `${BASE_URL}${data.url}`,
    datePublished: data.datePublished,
    ...(data.dateModified && { dateModified: data.dateModified }),
    author: {
      '@type': 'Person',
      name: data.authorName || 'mrwuliu',
      ...(data.authorUrl && { url: data.authorUrl }),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}${data.url}`,
    },
    ...(data.imageUrl && {
      image: data.imageUrl.startsWith('http') ? data.imageUrl : `${BASE_URL}${data.imageUrl}`,
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Organization schema — add to homepage + about page.
 * Builds entity recognition in AI knowledge graphs.
 */
type OrganizationSchemaProps = {
  name?: string
  url?: string
  github?: string
  email?: string
  sameAs?: string[]
}

export const OrganizationSchema: FC<OrganizationSchemaProps> = ({
  name = 'mrwuliu',
  url = BASE_URL,
  github,
  email,
  sameAs = [],
}) => {
  const socialLinks = [
    github || 'https://github.com/mrwuliu',
    ...sameAs,
  ].filter(Boolean)

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/favicon.svg`,
    },
    sameAs: socialLinks,
    ...(email && { contactPoint: { '@type': 'ContactPoint', email, contactType: 'customer support' } }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * BreadcrumbList schema — add to all pages.
 * Helps AI engines understand your site hierarchy and content categorization.
 */
type BreadcrumbItem = { name: string; url: string }

export const BreadcrumbSchema: FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * WebSite schema with SearchAction — add to homepage.
 * Enables Google sitelinks search box.
 */
export const WebSiteSchema: FC = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
