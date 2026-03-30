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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="文章标题"
          className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-600 text-white"
        />

        <input
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="url-slug"
          className="w-full text-sm bg-transparent border-none outline-none text-gray-500 placeholder-gray-700"
        />

        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="标签（逗号分隔）"
          className="w-full text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none text-gray-300 placeholder-gray-600 focus:ring-1 focus:ring-blue-500"
        />

        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="摘要（可选）"
          rows={2}
          className="w-full text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none text-gray-300 placeholder-gray-600 resize-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="flex-1">
          <Editor content={content} onChange={setContent} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={saving || !title}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors cursor-pointer"
          >
            发布
          </button>
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={saving || !title}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors cursor-pointer"
          >
            保存草稿
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving || !title}
              className="px-5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors cursor-pointer"
            >
              更新
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/posts')}
            className="px-5 py-2 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
          >
            取消
          </button>
          {saving && <span className="text-sm text-gray-400">保存中...</span>}
        </div>
      </div>
    </div>
  )
}
