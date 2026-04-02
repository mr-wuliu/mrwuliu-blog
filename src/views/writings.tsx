import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t, langPath, formatDateLang } from '../i18n'

type Post = {
  id: string
  title: string
  slug: string
  publishedAt: string | null
  createdAt: string
}

const WritingsPage: FC<{ lang: Lang; posts: Post[]; authorProfile?: AuthorProfile }> = ({ lang, posts, authorProfile }) => {
  return (
    <Layout title={t(lang, 'writings.pageTitle')} authorProfile={authorProfile} lang={lang} currentPath="/writings">
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-8" data-t="writings.title">
          {t(lang, 'writings.title')}
        </h1>
        {posts.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="writings.noPosts">{t(lang, 'writings.noPosts')}</p>
          </div>
        ) : (
          <ul class="divide-y divide-black">
            {posts.map((post) => (
              <li>
                <a
                  href={langPath(`/posts/${post.slug}`, lang)}
                  class="flex justify-between items-baseline py-4 group hover:bg-black hover:bg-opacity-5 transition-colors px-2 -mx-2 no-underline text-black"
                >
                  <span class="text-base group-hover:underline">{post.title}</span>
                  <span class="text-xs uppercase tracking-widest opacity-50 shrink-0 ml-4">
                    {formatDateLang(post.publishedAt || post.createdAt, lang)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}

export default WritingsPage
