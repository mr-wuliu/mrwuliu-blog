import type { FC } from 'hono/jsx'
import Layout from './layout'
import { type Lang, t, langPath } from '../i18n'

type UnsubscribeStatus = 'success' | 'invalid'

const UnsubscribePage: FC<{ lang: Lang; status: UnsubscribeStatus }> = ({ lang, status }) => {
  return (
    <Layout
      title={t(lang, 'unsubscribe.title')}
      description={t(lang, 'unsubscribe.title')}
      url={langPath('/', lang)}
      lang={lang}
      currentPath="/unsubscribe"
    >
      <div class="flex flex-col items-center justify-center py-24">
        {status === 'success' ? (
          <>
            <h1 class="text-3xl font-bold text-black">{t(lang, 'unsubscribe.success')}</h1>
            <p class="mt-4 text-sm opacity-70">{t(lang, 'unsubscribe.successDesc')}</p>
          </>
        ) : (
          <>
            <h1 class="text-3xl font-bold text-black">{t(lang, 'unsubscribe.invalid')}</h1>
            <p class="mt-4 text-sm opacity-70">{t(lang, 'unsubscribe.invalidDesc')}</p>
          </>
        )}
        <a href={langPath('/', lang)} class="mt-6 text-xs font-bold uppercase tracking-widest border border-black px-6 py-3 hover:bg-black hover:text-white transition-all no-underline">
          {t(lang, 'unsubscribe.backHome')}
        </a>
      </div>
    </Layout>
  )
}

export default UnsubscribePage
