import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { BreadcrumbSchema } from './components/structured-data'
import { type Lang, t, langPath } from '../i18n'

const AboutPage: FC<{ lang: Lang; content: string; authorProfile?: AuthorProfile }> = ({ lang, content, authorProfile }) => {
  return (
    <Layout
      title={t(lang, 'about.pageTitle')}
      description={t(lang, 'about.description')}
      url={langPath('/about', lang)}
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/about"
      extraHead={
        <BreadcrumbSchema items={[
          { name: t(lang, 'nav.about'), url: langPath('/about', lang) },
        ]} />
      }
    >
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-8" data-t="about.title">
          {t(lang, 'about.title')}
        </h1>
        <div
          class="prose-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </Layout>
  )
}

export default AboutPage
