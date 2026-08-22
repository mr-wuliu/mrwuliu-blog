import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, tf, langPath, formatDateLang } from '../i18n'

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

const PostCard: FC<{ post: Post; lang: Lang }> = ({ post, lang }) => {
  return (
    <article class="p-4 sm:p-6 bg-white border border-black rounded-none shadow-none hover:-translate-y-1 transition-all mb-4 sm:mb-6">
      <h2 class="text-lg sm:text-xl font-bold tracking-tight mb-2">
        <a href={langPath(`/posts/${post.slug}`, lang)} class="text-black no-underline hover:opacity-70 transition-all">{post.title}</a>
      </h2>
      {post.publishedAt && (
        <time class="text-xs font-bold uppercase tracking-widest opacity-50" datetime={post.publishedAt}>
          {formatDateLang(post.publishedAt, lang)}
        </time>
      )}
      {post.excerpt && <p class="mt-3 opacity-70 text-base sm:text-lg leading-relaxed">{post.excerpt}</p>}
      {post.tags && post.tags.length > 0 && (
        <div class="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <a href={langPath(`/tags/${tag.slug}`, lang)} class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline">{tag.name}</a>
          ))}
        </div>
      )}
    </article>
  )
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
      <div>
        <h1 class="text-2xl sm:text-4xl font-bold tracking-tight mb-6 sm:mb-10 break-words">{title}</h1>
        <form action={langPath('/search', lang)} method="get" class="mb-8 sm:mb-10 flex gap-2" role="search">
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
                <PostCard post={post} lang={lang} />
              ))}
            </div>
            <Pagination pagination={pagination} query={query} lang={lang} />
          </>
        )}
      </div>
    </Layout>
  )
}

export default SearchPage
