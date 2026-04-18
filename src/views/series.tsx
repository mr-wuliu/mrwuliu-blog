import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, langPath, formatDateLang } from '../i18n'

type Collection = {
  id: string
  name: string
  nameEn: string | null
  slug: string
  description: string | null
  descriptionEn: string | null
  coverImageKey: string | null
  postCount: number
  updatedAt: string
}

const CollectionCard: FC<{ collection: Collection; lang: Lang }> = ({ collection, lang }) => {
  const displayName = lang === 'en' && collection.nameEn ? collection.nameEn : collection.name
  const displayDescription = lang === 'en' && collection.descriptionEn ? collection.descriptionEn : collection.description

  return (
    <div class="break-inside-avoid mb-6 border-2 border-black hover:-translate-y-1 transition-all">
      {collection.coverImageKey && (
        <img
          src={`/api/images/${collection.coverImageKey}`}
          alt={displayName}
          class="w-full border-b-2 border-black"
        />
      )}
      <h3 class="font-bold text-lg uppercase tracking-wide p-4">
        <a href={langPath('/series/' + collection.slug, lang)} class="no-underline text-black hover:opacity-70 transition-all">
          {displayName}
        </a>
      </h3>
      {displayDescription && (
        <p class="text-sm text-gray-700 px-4 pb-4">{displayDescription}</p>
      )}
      <div class="flex border-t-2 border-black">
        <span class="flex-1 px-4 py-3 text-sm uppercase tracking-widest text-center">
          {collection.postCount} {t(lang, 'series.posts')}
        </span>
        <a
          href={langPath('/series/' + collection.slug, lang)}
          class="flex-1 px-4 py-3 text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors no-underline text-black text-center border-l-2 border-black"
        >
          →
        </a>
      </div>
    </div>
  )
}

const SeriesPage: FC<{ lang: Lang; collections: Collection[]; authorProfile?: AuthorProfile }> = ({ lang, collections, authorProfile }) => {
  return (
    <Layout title={t(lang, 'series.pageTitle')} authorProfile={authorProfile} lang={lang} currentPath="/series">
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-2" data-t="series.title">
          {t(lang, 'series.title')}
        </h1>
        <p class="text-sm opacity-50 mb-8" data-t="series.subtitle">{t(lang, 'series.subtitle')}</p>
        {collections.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="series.empty">{t(lang, 'series.empty')}</p>
          </div>
        ) : (
          <div class="sm:columns-2 lg:columns-3 gap-6" style="columns: 1">
            {collections.map((collection) => (
              <CollectionCard collection={collection} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default SeriesPage
