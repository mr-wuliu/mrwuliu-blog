import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { type Lang, t } from '../i18n'

type FriendLink = {
  id: string
  name: string
  nameEn: string | null
  url: string
  avatar: string | null
  description: string
  descriptionEn: string | null
}

const FriendLinkCard: FC<{ link: FriendLink; lang: Lang }> = ({ link, lang }) => {
  const displayName = lang === 'en' && link.nameEn ? link.nameEn : link.name
  const displayDesc = lang === 'en' && link.descriptionEn ? link.descriptionEn : link.description

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      class="block border-2 border-black p-4 hover:-translate-y-1 transition-all no-underline text-black"
    >
      <div class="flex items-center mb-2">
        {link.avatar ? (
          <img
            src={link.avatar}
            alt={displayName}
            class="w-8 h-8 border border-black mr-3 object-cover shrink-0"
          />
        ) : (
          <div class="w-8 h-8 border border-black mr-3 flex items-center justify-center text-sm font-bold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span class="font-bold text-sm uppercase tracking-wide truncate">
          {displayName}
        </span>
      </div>
      {displayDesc && (
        <p class="text-xs text-gray-600 leading-relaxed line-clamp-2">{displayDesc}</p>
      )}
    </a>
  )
}

const FriendsPage: FC<{ lang: Lang; links: FriendLink[]; authorProfile?: AuthorProfile }> = ({ lang, links, authorProfile }) => {
  return (
    <Layout title={t(lang, 'friends.pageTitle')} authorProfile={authorProfile} lang={lang} currentPath="/friends">
      <div>
        <h1 class="text-4xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-8" data-t="friends.title">
          {t(lang, 'friends.title')}
        </h1>
        {links.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="friends.noLinks">{t(lang, 'friends.noLinks')}</p>
          </div>
        ) : (
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {links.map((link) => (
              <FriendLinkCard link={link} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default FriendsPage
