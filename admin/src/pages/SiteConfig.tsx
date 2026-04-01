import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Editor from '../components/Editor'

interface SiteConfigData {
  key: string
  value: string
}

export default function SiteConfig() {
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
      alert('保存成功')
    } catch {
      alert('保存失败')
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
      alert('作者信息保存成功')
    } catch {
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return <div className="p-8 text-sm opacity-50">Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">SITE CONFIG</h1>
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="border-2 border-black">
        <div className="border-b border-black px-4 py-2 bg-gray-50">
          <span className="text-xs uppercase tracking-widest text-gray-600">About Content (自述)</span>
        </div>
        <Editor content={content} onChange={setContent} />
      </div>

      <div className="mt-4 text-xs text-gray-500 uppercase tracking-widest">
        此内容将显示在博客的「自述」页面
      </div>

      {/* Author Profile Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
          <h2 className="text-xl font-bold uppercase tracking-widest">AUTHOR PROFILE</h2>
          <button
            onClick={handleSaveAuthor}
            disabled={saving}
            className="border-2 border-black px-6 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? '保存中...' : '保存作者信息'}
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              Avatar URL (头像链接)
            </label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-4 py-3 border-2 border-black text-sm focus:outline-none focus:border-black"
            />
            <p className="mt-1 text-xs opacity-50">输入头像图片的 URL 地址</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              Bio (简介)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="一句话介绍自己..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-black text-sm focus:outline-none focus:border-black resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              GitHub URL
            </label>
            <input
              type="url"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="https://github.com/your-username"
              className="w-full px-4 py-3 border-2 border-black text-sm focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              Email (联系邮箱)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border-2 border-black text-sm focus:outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 uppercase tracking-widest">
          此信息将显示在博客页面的右侧边栏
        </div>
      </div>
    </div>
  )
}
