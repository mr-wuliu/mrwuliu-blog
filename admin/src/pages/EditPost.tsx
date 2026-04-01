import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Editor from '../components/Editor'

interface PostData {
  id: string
  title: string
  slug: string
  content: string
  status: string
  excerpt: string
  tags: { id: string; name: string; slug: string }[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function EditPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<PostData>(`/posts/${id}`).then((post) => {
      setTitle(post.title)
      setSlug(post.slug)
      setExcerpt(post.excerpt ?? '')
      setTagsInput(post.tags.map((t) => t.name).join(', '))
      setContent(post.content)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [id])

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }, [slugManuallyEdited])

  const handleSlugChange = useCallback((value: string) => {
    setSlug(value)
    setSlugManuallyEdited(true)
  }, [])

  const handleSave = useCallback(async (status: 'draft' | 'published') => {
    setSaving(true)
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const body = {
      title,
      content,
      status,
      tags,
      slug: slug || undefined,
      excerpt: excerpt || undefined,
    }

    try {
      if (isEdit && id) {
        await api.put(`/posts/${id}`, body)
      } else {
        await api.post('/posts', body)
      }
      navigate('/posts')
    } catch {
      // Save failed — re-enable buttons
    } finally {
      setSaving(false)
    }
  }, [title, content, tagsInput, slug, excerpt, isEdit, id, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm opacity-50">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-black flex flex-col">
      <div className="flex-1 max-w-4xl w-full mx-auto px-8 py-8 flex flex-col gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="文章标题"
          className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-black placeholder-opacity-30 text-black"
        />

        <input
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="url-slug"
          className="w-full text-sm bg-transparent border-none outline-none text-black opacity-50 placeholder-black placeholder-opacity-20"
        />

        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="标签（逗号分隔）"
          className="w-full text-sm border border-black px-4 py-2.5 outline-none text-black placeholder-black placeholder-opacity-30 focus:border-black"
        />

        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="摘要（可选）"
          rows={2}
          className="w-full text-sm border border-black px-4 py-2.5 outline-none text-black placeholder-black placeholder-opacity-30 resize-none focus:border-black"
        />

        <div className="flex-1">
          <Editor content={content} onChange={setContent} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-black px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={saving || !title}
            className="px-6 py-2.5 font-bold text-sm border border-black rounded-none uppercase tracking-widest hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            发布
          </button>
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={saving || !title}
            className="px-6 py-2.5 font-bold text-sm border border-black border-opacity-50 rounded-none uppercase tracking-widest text-black hover:border-opacity-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            保存草稿
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving || !title}
              className="px-6 py-2.5 font-bold text-sm border border-green-600 rounded-none uppercase tracking-widest text-green-600 hover:bg-green-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              更新
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/posts')}
            className="px-6 py-2.5 font-bold text-sm text-black opacity-70 hover:opacity-100 transition-all cursor-pointer"
          >
            取消
          </button>
          {saving && <span className="text-xs font-bold uppercase tracking-widest opacity-50">保存中...</span>}
        </div>
      </div>
    </div>
  )
}
