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

  useEffect(() => {
    api.get<SiteConfigData>('/site-config/about')
      .then((data) => {
        if (data) {
          setContent(data.value || '')
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
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
    </div>
  )
}
