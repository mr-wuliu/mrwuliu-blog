import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { ItemListSchema, BreadcrumbSchema } from './components/structured-data'
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
    <Layout
      title={t(lang, 'writings.pageTitle')}
      description={t(lang, 'writings.description')}
      url={langPath('/writings', lang)}
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/writings"
      extraHead={
        <>
          <BreadcrumbSchema items={[
            { name: t(lang, 'nav.writings'), url: langPath('/writings', lang) },
          ]} />
          <ItemListSchema data={{
            name: t(lang, 'writings.title'),
            description: t(lang, 'writings.description'),
            url: langPath('/writings', lang),
            numberOfItems: posts.length,
          }} />
        </>
      }
    >
      <section class="writings-page">
        <h1 class="page-title" data-t="writings.title">
          {t(lang, 'writings.title')}
        </h1>
        <p class="page-description" data-t="writings.description">{t(lang, 'writings.description')}</p>
        {posts.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="writings.noPosts">{t(lang, 'writings.noPosts')}</p>
          </div>
        ) : (
          <div class="archive-years">
            {Array.from(new Set(posts.map(post => (post.publishedAt || post.createdAt).slice(0, 4)))).map(year => (
              <section class="archive-year">
                <h2>{year}</h2>
                <ul>
                  {posts.filter(post => (post.publishedAt || post.createdAt).startsWith(year)).map(post => (
                    <li>
                      <a href={langPath(`/posts/${post.slug}`, lang)} class="archive-entry">
                        <span>{post.title}</span>
                        <time datetime={post.publishedAt || post.createdAt}>{formatDateLang(post.publishedAt || post.createdAt, lang)}</time>
                        <span aria-hidden="true" class="archive-arrow">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}

export default WritingsPage
