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

type HomeProps = {
  lang: Lang
  posts: Post[]
  pagination: PaginationData
  authorProfile?: AuthorProfile
}

const PostCard: FC<{ post: Post; lang: Lang }> = ({ post, lang }) => {
  return (
    <article class="p-6 bg-white border border-black rounded-none shadow-none hover:-translate-y-1 transition-all mb-6 cursor-pointer">
      <a href={langPath(`/posts/${post.slug}`, lang)} class="no-underline text-black block">
        <h2 class="text-xl font-bold tracking-tight mb-2">{post.title}</h2>
        {post.publishedAt && (
          <time class="text-xs font-bold uppercase tracking-widest opacity-50" datetime={post.publishedAt}>
            {formatDateLang(post.publishedAt, lang)}
          </time>
        )}
        {post.excerpt && <p class="mt-3 opacity-70 text-lg leading-relaxed">{post.excerpt}</p>}
      </a>
      {post.tags && post.tags.length > 0 && (
        <div class="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <a href={langPath(`/tags/${tag.slug}`, lang)} class="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-50 px-2 py-0.5 text-black hover:bg-black hover:text-white transition-all no-underline">{tag.name}</a>
          ))}
        </div>
      )}
    </article>
  )
}

const Pagination: FC<{ pagination: PaginationData; lang: Lang }> = ({ pagination, lang }) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null

  return (
    <nav class="mt-12 pt-8 border-t border-black" aria-label="pagination">
      <div class="flex justify-between">
        {page > 1 && (
          <a href={langPath(`/?page=${page - 1}`, lang)} class="text-sm font-bold uppercase tracking-widest border border-black px-6 py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.prev">
            {t(lang, 'pagination.prev')}
          </a>
        )}
        {page < totalPages && (
          <a href={langPath(`/?page=${page + 1}`, lang)} class="ml-auto text-sm font-bold uppercase tracking-widest border border-black px-6 py-3 text-black hover:bg-black hover:text-white transition-all no-underline" data-t="pagination.next">
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

const Home: FC<HomeProps> = ({ lang, posts, pagination, authorProfile }) => {
  return (
    <Layout
      title={t(lang, 'home.pageTitle')}
      description={t(lang, 'home.description')}
      url={langPath('/', lang)}
      type="website"
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/"
    >
      <div>
        <h1 class="text-4xl font-bold tracking-tight mb-10" data-t="home.title">{t(lang, 'home.title')}</h1>
        {posts.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="home.noPosts">{t(lang, 'home.noPosts')}</p>
          </div>
        ) : (
          <>
            <div>
              {posts.map((post) => (
                <PostCard post={post} lang={lang} />
              ))}
            </div>
            <Pagination pagination={pagination} lang={lang} />
          </>
        )}
      </div>
    </Layout>
  )
}

export default Home
