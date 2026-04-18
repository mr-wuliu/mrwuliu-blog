import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, langPath, formatDateLang } from '../i18n'

type CollectionPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  status: string
  createdAt: string
  updatedAt: string
}

type Collection = {
  id: string
  name: string
  nameEn: string | null
  slug: string
  description: string | null
  descriptionEn: string | null
  coverImageKey: string | null
  updatedAt: string
  posts: CollectionPost[]
}

const SeriesDetailPage: FC<{ lang: Lang; collection: Collection; authorProfile?: AuthorProfile }> = ({ lang, collection, authorProfile }) => {
  const displayName = lang === 'en' && collection.nameEn ? collection.nameEn : collection.name
  const displayDescription = lang === 'en' && collection.descriptionEn ? collection.descriptionEn : collection.description

  return (
    <Layout title={`${displayName} - ${t(lang, 'series.pageTitle')}`} authorProfile={authorProfile} lang={lang} currentPath={`/series/${collection.slug}`}>
      <div class="flex flex-col lg:flex-row gap-8">
        <div class="lg:w-3/5">
          <h1 class="text-3xl md:text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-4 mb-6">
            {displayName}
          </h1>

          {displayDescription && (
            <p class="text-base leading-relaxed opacity-80 mb-8">{displayDescription}</p>
          )}

          <div class="mb-8">
            <h2 class="text-xs font-bold uppercase tracking-widest opacity-50 mb-4" data-t="series.collectionPosts">
              {t(lang, 'series.collectionPosts')}
            </h2>
            <ol class="space-y-3">
              {collection.posts.map((post, index) => (
                <li key={post.id} class="border-b border-gray-200 pb-3 last:border-0">
                  <a href={langPath('/posts/' + post.slug, lang)} class="text-black no-underline hover:opacity-70 transition-all flex items-baseline gap-3">
                    <span class="text-sm font-bold opacity-30">{String(index + 1).padStart(2, '0')}</span>
                    <span class="font-medium">{post.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div class="lg:w-2/5">
          {collection.coverImageKey && (
            <img
              src={`/api/images/${collection.coverImageKey}`}
              alt={displayName}
              class="w-full border-2 border-black mb-6"
            />
          )}

          <div class="border-2 border-black p-6 space-y-4 mb-6">
            <div>
              <span class="text-xs font-bold uppercase tracking-widest opacity-50 block mb-1" data-t="series.lastUpdated">
                {t(lang, 'series.lastUpdated')}
              </span>
              <span class="text-sm">{formatDateLang(collection.updatedAt, lang)}</span>
            </div>
            <div class="border-t border-black pt-4">
              <span class="text-xs font-bold uppercase tracking-widest opacity-50 block mb-1" data-t="series.collectionPosts">
                {t(lang, 'series.collectionPosts')}
              </span>
              <span class="text-sm">{collection.posts.length} {t(lang, 'series.posts')}</span>
            </div>
          </div>

          <a
            href={langPath('/series', lang)}
            class="inline-block text-sm font-bold uppercase tracking-widest text-black opacity-70 hover:opacity-100 no-underline transition-all"
            data-t="series.backToSeries"
          >
            {t(lang, 'series.backToSeries')}
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default SeriesDetailPage
