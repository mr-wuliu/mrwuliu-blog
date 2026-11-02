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
      <section class="about-page">
        <h1 class="page-title" data-t="about.title">
          {t(lang, 'about.title')}
        </h1>
        <p class="page-description" data-t="about.description">{t(lang, 'about.description')}</p>
        <div
          class="prose-content post-content about-prose"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </section>
    </Layout>
  )
}

export default AboutPage
