import type { FC } from 'hono/jsx'
import { type Lang, t } from '../../i18n'

const SITE_NAME = "mrwuliu's blog"
const BASE_URL = 'https://mrwuliu.top'

type SEOProps = {
  title: string
  description?: string
  url?: string
  image?: string
  type?: 'website' | 'article'
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
  siteName = SITE_NAME,
  publishedTime,
  modifiedTime,
  authorName,
  currentPath,
  lang = 'zh',
}) => {
  const desc = description || t(lang, 'home.description')
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`
  const canonicalUrl = url ? `${BASE_URL}${url}` : (currentPath ? `${BASE_URL}${currentPath}` : BASE_URL)
  const imageUrl = image?.startsWith('http') ? image : image ? `${BASE_URL}${image}` : undefined

  // Build hreflang: Chinese and English alternate
  const zhPath = currentPath ? currentPath.replace(/^\/en/, '') : '/'
  const enPath = `/en${zhPath}`

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang for i18n — critical for multilingual SEO */}
      <link rel="alternate" hreflang="zh" href={`${BASE_URL}${zhPath}`} />
      <link rel="alternate" hreflang="en" href={`${BASE_URL}${enPath}`} />
      <link rel="alternate" hreflang="x-default" href={`${BASE_URL}${zhPath}`} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={lang === 'zh' ? 'zh_CN' : 'en_US'} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}

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

      {/* Twitter Card */}
      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}

      {/* Author meta — E-E-A-T signal */}
      {authorName && <meta name="author" content={authorName} />}
    </>
  )
}

export default SEO
