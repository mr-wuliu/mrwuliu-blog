import type { FC } from 'hono/jsx'
import Layout from './layout'
import ResultCard from './components/result-card'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, tf, langPath } from '../i18n'

type Tag = {
  id: string
  name: string
  slug: string
}

type Post = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  coverImageKey: string | null
  status: 'draft' | 'published'
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
}

type PaginationData = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type SearchPageProps = {
  lang: Lang
  query: string
  posts: Post[]
  pagination: PaginationData
  authorProfile?: AuthorProfile
}

const Pagination: FC<{ pagination: PaginationData; query: string; lang: Lang }> = ({ pagination, query, lang }) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null

  const href = (p: number) => langPath(`/search?q=${encodeURIComponent(query)}&page=${p}`, lang)

  return (
    <nav class="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-black" aria-label="pagination">
      <div class="flex justify-between">
        {page > 1 && (
          <a href={href(page - 1)} class="text-xs sm:text-sm font-bold uppercase tracking-widest border border-black px-4 sm:px-6 py-2.5 sm:py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.prev">
            {t(lang, 'pagination.prev')}
          </a>
        )}
        {page < totalPages && (
          <a href={href(page + 1)} class="ml-auto text-xs sm:text-sm font-bold uppercase tracking-widest border border-black px-4 sm:px-6 py-2.5 sm:py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.next">
            {t(lang, 'pagination.next')}
          </a>
        )}
      </div>
      <span class="block mt-4 text-center text-xs font-bold uppercase tracking-widest opacity-50">
        {tf(lang, 'pagination.pageInfo')(page, totalPages)}
      </span>
    </nav>
  )
}

const SearchPage: FC<SearchPageProps> = ({ lang, query, posts, pagination, authorProfile }) => {
  const hasQuery = query.length > 0
  const title = hasQuery ? tf(lang, 'search.resultsTitle')(query, pagination.total) : t(lang, 'search.pageTitle')
  const description = hasQuery ? tf(lang, 'search.resultsDescription')(query) : t(lang, 'search.description')
  const currentPath = hasQuery ? `/search?q=${encodeURIComponent(query)}` : '/search'

  return (
    <Layout
      title={title}
      description={description}
      url={langPath(currentPath, lang)}
      type="website"
      authorProfile={authorProfile}
      lang={lang}
      currentPath={currentPath}
      extraHead={hasQuery ? <meta name="robots" content="noindex" /> : undefined}
    >
      <section class="search-page">
        <h1 class="page-title">{title}</h1>
        <form action={langPath('/search', lang)} method="get" class="search-form" role="search">
          <input
            type="search"
            name="q"
            value={query}
            placeholder={t(lang, 'search.placeholder')}
            data-placeholder="search.placeholder"
            aria-label={t(lang, 'search.title')}
            class="flex-1 min-w-0 px-4 py-2.5 sm:py-3 border border-black bg-white text-black placeholder-black placeholder-opacity-40 focus:outline-none"
          />
          <button
            type="submit"
            class="shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border border-black text-xs sm:text-sm font-bold uppercase tracking-widest text-black hover:bg-black hover:text-white transition-all"
            data-t="search.button"
          >
            {t(lang, 'search.button')}
          </button>
        </form>
        {!hasQuery ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="search.noQuery">{t(lang, 'search.noQuery')}</p>
          </div>
        ) : posts.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="search.noResults">{t(lang, 'search.noResults')}</p>
          </div>
        ) : (
          <>
            <div>
              {posts.map((post) => (
                <ResultCard post={post} lang={lang} />
              ))}
            </div>
            <Pagination pagination={pagination} query={query} lang={lang} />
          </>
        )}
      </section>
    </Layout>
  )
}

export default SearchPage
