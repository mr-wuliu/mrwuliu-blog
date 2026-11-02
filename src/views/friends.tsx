import type { FC } from 'hono/jsx'
import Layout from './layout'
import type { AuthorProfile } from './components/author-sidebar'
import { ItemListSchema, BreadcrumbSchema } from './components/structured-data'
import { type Lang, t, langPath } from '../i18n'

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
      class="friend-card no-underline text-black"
    >
      {link.avatar ? (
        <img
          src={link.avatar}
          alt={displayName}
          class="friend-avatar" loading="lazy"
        />
      ) : (
        <div class="friend-avatar friend-initial">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div class="min-w-0">
        <span class="friend-name">
          {displayName}
        </span>
        {displayDesc && (
          <p class="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-1">{displayDesc}</p>
        )}
      </div>
    </a>
  )
}

const FriendsPage: FC<{ lang: Lang; links: FriendLink[]; authorProfile?: AuthorProfile }> = ({ lang, links, authorProfile }) => {
  return (
    <Layout
      title={t(lang, 'friends.pageTitle')}
      description={t(lang, 'friends.description')}
      url={langPath('/friends', lang)}
      authorProfile={authorProfile}
      lang={lang}
      currentPath="/friends"
      extraHead={
        <>
          <BreadcrumbSchema items={[
            { name: t(lang, 'nav.friends'), url: langPath('/friends', lang) },
          ]} />
          <ItemListSchema data={{
            name: t(lang, 'friends.title'),
            description: t(lang, 'friends.description'),
            url: langPath('/friends', lang),
            numberOfItems: links.length,
          }} />
        </>
      }
    >
      <section class="friends-page">
        <h1 class="page-title" data-t="friends.title">
          {t(lang, 'friends.title')}
        </h1>
        <p class="page-description" data-t="friends.description">{t(lang, 'friends.description')}</p>
        {links.length === 0 ? (
          <div class="py-16 text-center opacity-50 text-lg">
            <p data-t="friends.noLinks">{t(lang, 'friends.noLinks')}</p>
          </div>
        ) : (
          <div class="friends-grid">
            {links.map((link) => (
              <FriendLinkCard link={link} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}

export default FriendsPage
