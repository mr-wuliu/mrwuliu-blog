import type { FC } from 'hono/jsx'
import Layout from './layout'
import { type Lang, t, langPath } from '../i18n'

const NotFoundPage: FC<{ lang?: Lang }> = ({ lang = 'zh' }) => {
  return (
    <Layout title={t(lang, 'notFound.title')} lang={lang} currentPath="/">
      <div class="flex flex-col items-center justify-center py-24">
        <h1 class="text-7xl font-bold text-black">404</h1>
        <p class="mt-4 text-lg opacity-70" data-t="notFound.message">{t(lang, 'notFound.message')}</p>
        <a href={langPath('/', lang)} class="mt-6 text-xs font-bold uppercase tracking-widest border border-black px-6 py-3 hover:bg-black hover:text-white transition-all no-underline" data-t="notFound.backHome">{t(lang, 'notFound.backHome')}</a>
      </div>
    </Layout>
  )
}

export default NotFoundPage
