import type { FC } from 'hono/jsx'
import { type Lang, t, langPath } from '../../i18n'

const SITE_NAME = "mrwuliu's blog"
const BASE_URL = 'https://mrwuliu.top'
const DEFAULT_OG_IMAGE = `${BASE_URL}/favicon.svg`

type SEOProps = {
  title: string
  description?: string
  url?: string
  image?: string
  type?: 'website' | 'article'
  tags?: string[]
  siteName?: string
  publishedTime?: string
  modifiedTime?: string
  authorName?: string
  currentPath?: string
  lang?: Lang
}

const SEO: FC<SEOProps> = ({
  title,
  description,
  url,
  image,
  type = 'website',
  tags = [],
  siteName = SITE_NAME,
  publishedTime,
  modifiedTime,
  authorName,
  currentPath,
  lang = 'zh',
}) => {
  const desc = description || t(lang, 'home.description')
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`

  const canonicalPath = url || (currentPath ? langPath(currentPath, lang) : '/')
  const canonicalUrl = `${BASE_URL}${canonicalPath}`

  const imageUrl = image
    ? (image.startsWith('http') ? image : `${BASE_URL}${image}`)
    : DEFAULT_OG_IMAGE

  // Build hreflang: Chinese and English alternate
  const zhPath = currentPath ? currentPath.replace(/^\/en/, '') : '/'
  const enPath = zhPath === '/' ? '/en' : `/en${zhPath}`

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="application-name" content={siteName} />
      <meta name="generator" content="Hono on Cloudflare Workers" />
      {tags.length > 0 && <meta name="keywords" content={tags.join(', ')} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang for i18n — critical for multilingual SEO */}
      <link rel="alternate" hreflang="zh-CN" href={`${BASE_URL}${zhPath}`} />
      <link rel="alternate" hreflang="en" href={`${BASE_URL}${enPath}`} />
      <link rel="alternate" hreflang="x-default" href={`${BASE_URL}${zhPath}`} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={lang === 'zh' ? 'zh_CN' : 'en_US'} />
      <meta property="og:locale:alternate" content={lang === 'zh' ? 'en_US' : 'zh_CN'} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={title} />

      {/* Article-specific OG tags — AI engines & Google use these for citation decisions */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && authorName && (
        <meta property="article:author" content={authorName} />
      )}
      {type === 'article' && tags.map((tag) => (
        <meta property="article:tag" content={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Author meta — E-E-A-T signal */}
      {authorName && <meta name="author" content={authorName} />}
    </>
  )
}

export default SEO
