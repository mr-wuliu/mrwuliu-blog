import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { ItemListSchema, BreadcrumbSchema } from './components/structured-data'
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
    <div class="portfolio-card series-card">
      <div class="series-bookmark" aria-hidden="true">≡</div>
      {collection.coverImageKey && (
        <img
          src={`/images/${collection.coverImageKey}`}
          alt={displayName}
          class="portfolio-cover" loading="lazy" decoding="async"
        />
      )}
      <h2 class="portfolio-title">
        <a href={langPath('/series/' + collection.slug, lang)} class="no-underline text-black hover:opacity-70 transition-all">
          {displayName}
        </a>
      </h2>
      {displayDescription && (
        <p class="portfolio-description">{displayDescription}</p>
      )}
      <div class="portfolio-actions">
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
    <Layout
      title={t(lang, 'series.pageTitle')}
      description={t(lang, 'series.description')}
      url={langPath('/series', lang)}
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/series"
      extraHead={
        <>
          <BreadcrumbSchema items={[
            { name: t(lang, 'nav.series'), url: langPath('/series', lang) },
          ]} />
          <ItemListSchema data={{
            name: t(lang, 'series.title'),
            description: t(lang, 'series.description'),
            url: langPath('/series', lang),
            numberOfItems: collections.length,
          }} />
        </>
      }
    >
      <section class="series-page">
        <h1 class="page-title" data-t="series.title">
          {t(lang, 'series.title')}
        </h1>
        <p class="page-description" data-t="series.subtitle">{t(lang, 'series.subtitle')}</p>
        {collections.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="series.empty">{t(lang, 'series.empty')}</p>
          </div>
        ) : (
          <div class="collection-grid">
            {collections.map((collection) => (
              <CollectionCard collection={collection} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}

export default SeriesPage
