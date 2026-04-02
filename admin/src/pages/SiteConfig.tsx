import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import Editor from '../components/Editor'

interface SiteConfigData {
  key: string
  value: string
}

export default function SiteConfig() {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [avatar, setAvatar] = useState('')
  const [bio, setBio] = useState('')
  const [github, setGithub] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    api.get<SiteConfigData>('/site-config/about')
      .then((data) => {
        if (data) {
          setContent(data.value || '')
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))

    Promise.all([
      api.get<SiteConfigData>('/site-config/author_avatar').catch(() => null),
      api.get<SiteConfigData>('/site-config/author_bio').catch(() => null),
      api.get<SiteConfigData>('/site-config/author_github').catch(() => null),
      api.get<SiteConfigData>('/site-config/author_email').catch(() => null),
    ]).then(([avatarData, bioData, githubData, emailData]) => {
      setAvatar(avatarData?.value || '')
      setBio(bioData?.value || '')
      setGithub(githubData?.value || '')
      setEmail(emailData?.value || '')
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/site-config', { key: 'about', value: content })
      alert(t('siteConfig.saveSuccess'))
    } catch {
      alert(t('siteConfig.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAuthor = async () => {
    setSaving(true)
    try {
      await Promise.all([
        api.put('/site-config', { key: 'author_avatar', value: avatar }),
        api.put('/site-config', { key: 'author_bio', value: bio }),
        api.put('/site-config', { key: 'author_github', value: github }),
        api.put('/site-config', { key: 'author_email', value: email }),
      ])
      alert(t('siteConfig.authorSaveSuccess'))
    } catch {
      alert(t('siteConfig.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return <div className="p-8 text-sm opacity-50">{t('siteConfig.loading')}</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">{t('siteConfig.title')}</h1>
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? t('siteConfig.saving') : t('siteConfig.save')}
          </button>
        </div>
      </div>

      <div className="border-2 border-black">
        <div className="border-b border-black px-4 py-2 bg-gray-50">
          <span className="text-xs uppercase tracking-widest text-gray-600">{t('siteConfig.aboutContent')}</span>
        </div>
        <Editor content={content} onChange={setContent} />
      </div>

      <div className="mt-4 text-xs text-gray-500 uppercase tracking-widest">
        {t('siteConfig.aboutHint')}
      </div>

      {/* Author Profile Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
          <h2 className="text-xl font-bold uppercase tracking-widest">{t('siteConfig.authorProfile')}</h2>
          <button
            onClick={handleSaveAuthor}
            disabled={saving}
            className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? t('siteConfig.saving') : t('siteConfig.saveAuthor')}
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              {t('siteConfig.avatarLabel')}
            </label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder={t('siteConfig.avatarPlaceholder')}
              className="w-full px-4 py-3 border-2 border-black text-sm focus:outline-none focus:border-black"
            />
            <p className="mt-1 text-xs opacity-50">{t('siteConfig.avatarHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              {t('siteConfig.bioLabel')}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('siteConfig.bioPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 border-2 border-black text-sm focus:outline-none focus:border-black resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              {t('siteConfig.githubLabel')}
            </label>
            <input
              type="url"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder={t('siteConfig.githubPlaceholder')}
              className="w-full px-4 py-3 border-2 border-black text-sm focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              {t('siteConfig.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('siteConfig.emailPlaceholder')}
              className="w-full px-4 py-3 border-2 border-black text-sm focus:outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 uppercase tracking-widest">
          {t('siteConfig.authorHint')}
        </div>
      </div>
    </div>
  )
}
