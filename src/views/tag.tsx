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

type TagPageProps = {
  lang: Lang
  tag: Tag
  posts: Post[]
  allTags: Tag[]
  pagination: PaginationData
  authorProfile?: AuthorProfile
}

const PostCard: FC<{ post: Post; lang: Lang }> = ({ post, lang }) => {
  return (
    <article class="p-6 bg-white border border-black rounded-none shadow-none hover:-translate-y-1 transition-all mb-6">
      <h2 class="text-xl font-bold tracking-tight mb-2">
        <a href={langPath(`/posts/${post.slug}`, lang)} class="text-black no-underline hover:opacity-70 transition-all">{post.title}</a>
      </h2>
      {post.publishedAt && (
        <time class="text-xs font-bold uppercase tracking-widest opacity-50" datetime={post.publishedAt}>
          {formatDateLang(post.publishedAt, lang)}
        </time>
      )}
      {post.excerpt && <p class="mt-3 opacity-70 text-lg leading-relaxed">{post.excerpt}</p>}
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

const Pagination: FC<{ pagination: PaginationData; tagSlug: string; lang: Lang }> = ({ pagination, tagSlug, lang }) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null

  return (
    <nav class="mt-12 pt-8 border-t border-black" aria-label="pagination">
      <div class="flex justify-between">
        {page > 1 && (
          <a href={langPath(`/tags/${tagSlug}?page=${page - 1}`, lang)} class="text-sm font-bold uppercase tracking-widest border border-black px-6 py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.prev">
            {t(lang, 'pagination.prev')}
          </a>
        )}
        {page < totalPages && (
          <a href={langPath(`/tags/${tagSlug}?page=${page + 1}`, lang)} class="ml-auto text-sm font-bold uppercase tracking-widest border border-black px-6 py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.next">
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

const TagPage: FC<TagPageProps> = ({ lang, tag, posts, allTags, pagination, authorProfile }) => {
  return (
    <Layout
      title={tf(lang, 'tag.pageTitle')(tag.name)}
      description={tf(lang, 'tag.pageDescription')(tag.name)}
      url={langPath(`/tags/${tag.slug}`, lang)}
      type="website"
      authorProfile={authorProfile}
      lang={lang}
      currentPath={`/tags/${tag.slug}`}
    >
      <div class="flex flex-col md:flex-row gap-12">
        <aside class="md:w-56 shrink-0">
          <h2 class="text-xs font-bold uppercase tracking-widest opacity-50 mb-4" data-t="tag.allTags">{t(lang, 'tag.allTags')}</h2>
          <ul class="space-y-1 list-none p-0">
            {allTags.map((at) => (
              <li>
                <a
                  href={langPath(`/tags/${at.slug}`, lang)}
                  class={at.slug === tag.slug
                    ? 'block text-sm px-4 py-2 border-l-2 border-black font-bold text-black bg-black bg-opacity-5 no-underline transition-all'
                    : 'block text-sm px-4 py-2 border-l-2 border-transparent text-black opacity-70 hover:opacity-100 hover:border-black no-underline transition-all'
                  }
                >
                  {at.name}
                </a>
              </li>
            ))}
          </ul>
        </aside>
        <div class="flex-1 min-w-0">
          <h1 class="text-4xl font-bold tracking-tight mb-10">{tf(lang, 'tag.pageTitle')(tag.name)}</h1>
          {posts.length === 0 ? (
            <div class="py-16 text-center opacity-50 text-lg">
              <p data-t="tag.noPosts">{t(lang, 'tag.noPosts')}</p>
            </div>
          ) : (
            <>
              <div>
                {posts.map((post) => (
                  <PostCard post={post} lang={lang} />
                ))}
              </div>
              <Pagination pagination={pagination} tagSlug={tag.slug} lang={lang} />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default TagPage
