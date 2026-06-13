import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import Editor from '../components/Editor'
import LangToggle from '../components/LangToggle'

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
  const [anonAutoApprove, setAnonAutoApprove] = useState(false)
  const [regAutoApprove, setRegAutoApprove] = useState(true)

  const [uploading, setUploading] = useState(false)
  const [hoverAvatar, setHoverAvatar] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      api.get<SiteConfigData>('/site-config/comment_anonymous_auto_approve').catch(() => null),
      api.get<SiteConfigData>('/site-config/comment_registered_auto_approve').catch(() => null),
      api.get<SiteConfigData>('/site-config/comment_auto_approve').catch(() => null),
    ]).then(([avatarData, bioData, githubData, emailData, anonData, regData, legacyData]) => {
      setAvatar(avatarData?.value || '')
      setBio(bioData?.value || '')
      setGithub(githubData?.value || '')
      setEmail(emailData?.value || '')
      // Migrate from legacy single toggle if new keys don't exist yet
      if (anonData) {
        setAnonAutoApprove(anonData.value === 'true')
      } else if (legacyData && legacyData.value === 'true') {
        setAnonAutoApprove(true)
      }
      if (regData) {
        setRegAutoApprove(regData.value === 'true')
      } else if (legacyData && legacyData.value === 'true') {
        setRegAutoApprove(true)
      }
    })
  }, [])

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(t('siteConfig.avatarInvalidType'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(t('siteConfig.avatarTooLarge'))
      return
    }
    setUploading(true)
    try {
      const result = await api.upload<{ url: string }>('/site-config/avatar-upload', file)
      setAvatar(result.url)
    } catch {
      alert(t('siteConfig.avatarUploadFailed'))
    } finally {
      setUploading(false)
    }
  }, [t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleAvatarUpload(file)
  }, [handleAvatarUpload])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleAvatarUpload(file)
    e.target.value = ''
  }, [handleAvatarUpload])

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      await Promise.all([
        api.put('/site-config', { key: 'about', value: content }),
        api.put('/site-config', { key: 'author_avatar', value: avatar }),
        api.put('/site-config', { key: 'author_bio', value: bio }),
        api.put('/site-config', { key: 'author_github', value: github }),
        api.put('/site-config', { key: 'author_email', value: email }),
        api.put('/site-config', { key: 'comment_anonymous_auto_approve', value: anonAutoApprove ? 'true' : 'false' }),
        api.put('/site-config', { key: 'comment_registered_auto_approve', value: regAutoApprove ? 'true' : 'false' }),
      ])
      alert(t('siteConfig.saveSuccess'))
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
    <div className="overflow-y-auto h-full p-8">
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">{t('siteConfig.title')}</h1>
        <div className="flex gap-4 items-center">
          <LangToggle />
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? t('siteConfig.saving') : t('siteConfig.save')}
          </button>
        </div>
      </div>

      {/* Author Profile Section */}
      <div>
        <h2 className="text-xl font-bold uppercase tracking-widest border-b-2 border-black pb-4 mb-6">{t('siteConfig.authorProfile')}</h2>

        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div
              className="group relative w-28 h-28 border-2 border-black flex-shrink-0 cursor-pointer overflow-hidden bg-gray-50"
              onClick={() => !uploading && fileInputRef.current?.click()}
              onMouseEnter={() => setHoverAvatar(true)}
              onMouseLeave={() => { setHoverAvatar(false); setDragOver(false) }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                </div>
              )}
              <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${hoverAvatar || dragOver ? 'opacity-100' : 'opacity-0'} ${uploading ? '!opacity-70' : ''}`}>
                {uploading ? (
                  <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-64">
                <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-1">
                  {t('siteConfig.githubLabel')}
                </label>
                <input
                  type="url"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder={t('siteConfig.githubPlaceholder')}
                  className="w-full px-3 py-2 border-2 border-black text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div className="w-64">
                <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-1">
                  {t('siteConfig.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('siteConfig.emailPlaceholder')}
                  className="w-full px-3 py-2 border-2 border-black text-sm focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-1">
              {t('siteConfig.bioLabel')}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('siteConfig.bioPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 border-2 border-black text-sm focus:outline-none focus:border-black resize-y"
            />
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 uppercase tracking-widest">
          {t('siteConfig.authorHint')}
        </div>
      </div>

      {/* Comment Settings Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold uppercase tracking-widest border-b-2 border-black pb-4 mb-6">{t('siteConfig.commentSettings')}</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border-2 border-black">
            <div>
              <div className="text-sm font-bold uppercase tracking-widest">{t('siteConfig.commentRegApproveLabel')}</div>
              <div className="text-xs text-gray-500 mt-1">{t('siteConfig.commentRegApproveHint')}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={regAutoApprove}
              onClick={() => setRegAutoApprove(!regAutoApprove)}
              className={`relative inline-flex h-7 w-12 items-center border-2 border-black cursor-pointer transition-colors flex-shrink-0 ${regAutoApprove ? 'bg-black' : 'bg-white'}`}
            >
              <span
                className={`inline-block h-4 w-4 transition-transform ${regAutoApprove ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-black'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border-2 border-black">
            <div>
              <div className="text-sm font-bold uppercase tracking-widest">{t('siteConfig.commentAnonApproveLabel')}</div>
              <div className="text-xs text-gray-500 mt-1">{t('siteConfig.commentAnonApproveHint')}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={anonAutoApprove}
              onClick={() => setAnonAutoApprove(!anonAutoApprove)}
              className={`relative inline-flex h-7 w-12 items-center border-2 border-black cursor-pointer transition-colors flex-shrink-0 ${anonAutoApprove ? 'bg-black' : 'bg-white'}`}
            >
              <span
                className={`inline-block h-4 w-4 transition-transform ${anonAutoApprove ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-black'}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 border-2 border-black">
        <div className="border-b border-black px-4 py-2 bg-gray-50">
          <span className="text-xs uppercase tracking-widest text-gray-600">{t('siteConfig.aboutContent')}</span>
        </div>
        <Editor content={content} onChange={setContent} />
      </div>

      <div className="mt-4 text-xs text-gray-500 uppercase tracking-widest">
        {t('siteConfig.aboutHint')}
      </div>
    </div>
  )
}
