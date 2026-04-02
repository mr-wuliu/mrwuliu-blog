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
  lang?: Lang
}

const SEO: FC<SEOProps> = ({
  title,
  description,
  url,
  image,
  type = 'website',
  siteName = SITE_NAME,
  lang = 'zh',
}) => {
  const desc = description || t(lang, 'home.description')
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`
  const canonicalUrl = url ? `${BASE_URL}${url}` : BASE_URL
  const imageUrl = image?.startsWith('http') ? image : image ? `${BASE_URL}${image}` : undefined

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
    </>
  )
}

export default SEO
