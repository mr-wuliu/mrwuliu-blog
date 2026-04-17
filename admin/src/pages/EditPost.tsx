import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { preRenderMermaidInHtml } from '../lib/mermaid-pre-render'
import Editor from '../components/Editor'

interface PostData {
  id: string
  title: string
  slug: string
  content: string
  status: string
  excerpt: string
  hidden: boolean
  pinned: boolean
  tags: { id: string; name: string; slug: string }[]
  titleEn?: string
  contentEn?: string
  excerptEn?: string
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
  const { t } = useTranslation()
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [content, setContent] = useState('')
  const [hidden, setHidden] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [titleEn, setTitleEn] = useState('')
  const [excerptEn, setExcerptEn] = useState('')
  const [contentEn, setContentEn] = useState('')
  const [activeLang, setActiveLang] = useState<'zh' | 'en'>('zh')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<PostData>(`/posts/${id}`).then((post) => {
      setTitle(post.title)
      setSlug(post.slug)
      setExcerpt(post.excerpt ?? '')
      setTagsInput(post.tags.map((tag) => tag.name).join(', '))
      setContent(post.content)
      setHidden(post.hidden ?? false)
      setPinned(post.pinned ?? false)
      setTitleEn(post.titleEn ?? '')
      setExcerptEn(post.excerptEn ?? '')
      setContentEn(post.contentEn ?? '')
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
      .map((tag) => tag.trim())
      .filter(Boolean)

    try {
      const renderedContent = await preRenderMermaidInHtml(content)
      const renderedContentEn = contentEn ? await preRenderMermaidInHtml(contentEn) : undefined
      const body = {
        title,
        content: renderedContent,
        status,
        tags,
        slug: slug || undefined,
        excerpt: excerpt || undefined,
        hidden,
        pinned,
        titleEn: titleEn || undefined,
        contentEn: renderedContentEn || undefined,
        excerptEn: excerptEn || undefined,
      }

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
  }, [title, content, tagsInput, slug, excerpt, hidden, pinned, isEdit, id, navigate, titleEn, contentEn, excerptEn])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm opacity-50">{t('editPost.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-black flex flex-col">
      <div className="flex-1 max-w-4xl w-full mx-auto px-8 py-8 flex flex-col gap-4">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setActiveLang('zh')}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border ${
              activeLang === 'zh'
                ? 'border-black bg-black text-white'
                : 'border-black border-opacity-30 text-black opacity-70 hover:opacity-100'
            } transition-all`}
          >
            {t('editPost.langZh')}
          </button>
          <button
            onClick={() => setActiveLang('en')}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border ${
              activeLang === 'en'
                ? 'border-black bg-black text-white'
                : 'border-black border-opacity-30 text-black opacity-70 hover:opacity-100'
            } transition-all`}
          >
            {t('editPost.langEn')}
          </button>
        </div>

        {activeLang === 'zh' ? (
          <>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t('editPost.titlePlaceholder')}
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
              placeholder={t('editPost.tagsPlaceholder')}
              className="w-full text-sm border border-black px-4 py-2.5 outline-none text-black placeholder-black placeholder-opacity-30 focus:border-black"
            />

            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder={t('editPost.excerptPlaceholder')}
              rows={2}
              className="w-full text-sm border border-black px-4 py-2.5 outline-none text-black placeholder-black placeholder-opacity-30 resize-none focus:border-black"
            />

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-black">
                <input
                  type="checkbox"
                  checked={hidden}
                  onChange={(e) => setHidden(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                <span className="font-bold uppercase tracking-widest text-xs opacity-70">{t('editPost.hidden')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-black">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                <span className="font-bold uppercase tracking-widest text-xs opacity-70">{t('editPost.pinned')}</span>
              </label>
            </div>

            <div className="flex-1">
              <Editor key="zh" content={content} onChange={setContent} />
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder={t('editPost.titleEnPlaceholder')}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-black placeholder-opacity-30 text-black"
            />

            <textarea
              value={excerptEn}
              onChange={(e) => setExcerptEn(e.target.value)}
              placeholder={t('editPost.excerptEnPlaceholder')}
              rows={2}
              className="w-full text-sm border border-black px-4 py-2.5 outline-none text-black placeholder-black placeholder-opacity-30 resize-none focus:border-black"
            />

            <div className="flex-1">
              <Editor key="en" content={contentEn} onChange={setContentEn} />
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-black px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={saving || !title}
            className="px-6 py-2.5 font-bold text-sm border border-black rounded-none uppercase tracking-widest hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {t('editPost.publish')}
          </button>
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={saving || !title}
            className="px-6 py-2.5 font-bold text-sm border border-black border-opacity-50 rounded-none uppercase tracking-widest text-black hover:border-opacity-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {t('editPost.saveDraft')}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving || !title}
              className="px-6 py-2.5 font-bold text-sm border border-green-600 rounded-none uppercase tracking-widest text-green-600 hover:bg-green-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {t('editPost.update')}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/posts')}
            className="px-6 py-2.5 font-bold text-sm text-black opacity-70 hover:opacity-100 transition-all cursor-pointer"
          >
            {t('editPost.cancel')}
          </button>
          {saving && <span className="text-xs font-bold uppercase tracking-widest opacity-50">{t('editPost.saving')}</span>}
        </div>
      </div>
    </div>
  )
}
