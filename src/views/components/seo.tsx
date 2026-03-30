import type { FC } from 'hono/jsx'

const SITE_NAME = "mrwuliu's blog"
const BASE_URL = 'https://mrwuliu.top'
const DEFAULT_DESCRIPTION = '个人博客 - 记录技术与生活'

type SEOProps = {
  title: string
  description?: string
  url?: string
  image?: string
  type?: 'website' | 'article'
  siteName?: string
}

const SEO: FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  url,
  image,
  type = 'website',
  siteName = SITE_NAME,
}) => {
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`
  const canonicalUrl = url ? `${BASE_URL}${url}` : BASE_URL
  const imageUrl = image?.startsWith('http') ? image : image ? `${BASE_URL}${image}` : undefined

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
    </>
  )
}

export default SEO
