import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Editor as TipTapEditor } from '@tiptap/core'
import { api, ApiError } from '../lib/api'
import { isEditorDirty, setEditorDirty } from '../lib/editor-dirty'
import { preRenderMermaidInHtml } from '../lib/mermaid-pre-render'
import Editor from '../components/Editor'
import AutoGrowTextarea from '../components/AutoGrowTextarea'
import TableOfContents from '../components/TableOfContents'

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
  const [activeEditor, setActiveEditor] = useState<TipTapEditor | null>(null)
  const [tocExpanded, setTocExpanded] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [infoExpanded, setInfoExpanded] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [collectionsExpanded, setCollectionsExpanded] = useState(true)
  const [loadedPostId, setLoadedPostId] = useState<string | undefined>(id)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const originalRef = useRef<{ title: string; content: string; slug: string; excerpt: string; tagsInput: string; hidden: boolean; pinned: boolean; titleEn: string; excerptEn: string; contentEn: string } | null>(null)

  const markDirty = useCallback(() => { setEditorDirty(true) }, [])

  const confirmLeave = useCallback(() => {
    if (isEditorDirty() && !window.confirm(t('editPost.confirmLeave'))) return false
    setEditorDirty(false)
    return true
  }, [t])

  const guardedNavigate = useCallback((path: string) => {
    if (!confirmLeave()) return
    navigate(path)
  }, [navigate, confirmLeave])
  const [postCollections, setPostCollections] = useState<{
    id: string
    name: string
    nameEn: string | null
    slug: string
    posts: { id: string; title: string; slug: string }[]
  }[]>([])

  const handleEditorReady = useCallback((editor: TipTapEditor) => {
    setActiveEditor(editor)
  }, [])

  const switchLang = useCallback((lang: 'zh' | 'en') => {
    setActiveEditor(null)
    setActiveLang(lang)
  }, [])

  useEffect(() => {
    if (!id) {
      setTitle(''); setSlug(''); setSlugManuallyEdited(false); setExcerpt(''); setTagsInput('')
      setContent(''); setContentEn(''); setTitleEn(''); setExcerptEn('')
      setHidden(false); setPinned(false); setPostCollections([]); setLoadedPostId(undefined)
      setLoadError(null); setLoading(false); setEditorDirty(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    api.get<PostData>(`/posts/${id}`).then((post) => {
      if (cancelled) return
      setTitle(post.title)
      setSlug(post.slug)
      setSlugManuallyEdited(true)
      setExcerpt(post.excerpt ?? '')
      setTagsInput(post.tags.map((tag) => tag.name).join(', '))
      setContent(post.content)
      setHidden(post.hidden ?? false)
      setPinned(post.pinned ?? false)
      setTitleEn(post.titleEn ?? '')
      setExcerptEn(post.excerptEn ?? '')
      setContentEn(post.contentEn ?? '')
      setLoadedPostId(id)
      setEditorDirty(false)
      originalRef.current = { title: post.title, content: post.content, slug: post.slug, excerpt: post.excerpt ?? '', tagsInput: post.tags.map((tag) => tag.name).join(', '), hidden: post.hidden ?? false, pinned: post.pinned ?? false, titleEn: post.titleEn ?? '', excerptEn: post.excerptEn ?? '', contentEn: post.contentEn ?? '' }
      setLoading(false)
    }).catch((err) => {
      if (cancelled) return
      console.error('Failed to load post', err)
      setLoadError(err instanceof Error && err.message ? err.message : 'unknown error')
      setLoading(false)
    })
    api.get<{ collections: { id: string; name: string; nameEn: string | null; slug: string; posts: { id: string; title: string; slug: string }[] }[] }>(`/collections/by-post/${id}`).then((res) => {
      if (!cancelled) setPostCollections(res.collections)
    }).catch((err) => {
      // Collections sidebar is optional enrichment — the editor works without it.
      console.error('Failed to load post collections', err)
      if (!cancelled) setPostCollections([])
    })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isEditorDirty()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const handleTitleChange = useCallback((value: string) => {
    markDirty()
    setTitle(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }, [slugManuallyEdited])

  const handleSlugChange = useCallback((value: string) => {
    markDirty()
    setSlug(value)
    setSlugManuallyEdited(true)
  }, [])

  const handleSave = useCallback(async (status: 'draft' | 'published') => {
    if (loading || (isEdit && loadedPostId !== id)) return
    setSaving(true)
    setSaveError(null)
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
        excerpt: excerpt,
        hidden,
        pinned,
        titleEn: titleEn,
        contentEn: renderedContentEn ?? '',
        excerptEn: excerptEn,
      }

      if (isEdit && id) {
        await api.put(`/posts/${id}`, body)
      } else {
        await api.post('/posts', body)
      }
      setEditorDirty(false)
      navigate('/posts')
    } catch (err) {
      console.error('Failed to save post', err)
      setSaveError(
        err instanceof ApiError ? `${t('common.saveFailed')}: ${err.message}` : t('common.saveFailed')
      )
    } finally {
      setSaving(false)
    }
  }, [title, content, tagsInput, slug, excerpt, hidden, pinned, isEdit, id, navigate, titleEn, contentEn, excerptEn, t, loading, loadedPostId])

  if (loading || (!loadError && isEdit && loadedPostId !== id)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm opacity-50">{t('editPost.loading')}</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-bold text-red-600">
          {t('editPost.loadFailed')}: {loadError}
        </p>
        <button
          type="button"
          onClick={() => navigate('/posts')}
          className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-all cursor-pointer"
        >
          {t('posts.title')}
        </button>
      </div>
    )
  }

  return (
    <div className="h-full text-black flex flex-col overflow-hidden">
      <nav className="h-9 border-b border-black bg-white flex items-center shrink-0 px-2 gap-1">
        <button
          type="button"
          onClick={() => guardedNavigate('/posts')}
          title={t('editPost.cancel')}
          aria-label={t('editPost.cancel')}
          className="h-7 px-2 flex items-center justify-center text-sm opacity-50 hover:opacity-100 hover:bg-black hover:text-white transition-all cursor-pointer"
        >
          ←
        </button>

        <div className="w-px h-4 bg-black opacity-10 mx-1" />

        <button
          type="button"
          onClick={() => switchLang('zh')}
          className={`h-7 px-2 text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
            activeLang === 'zh'
              ? 'bg-black text-white'
              : 'opacity-40 hover:opacity-100'
          }`}
        >
          中
        </button>
        <button
          onClick={() => switchLang('en')}
          className={`h-7 px-2 text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
            activeLang === 'en'
              ? 'bg-black text-white'
              : 'opacity-40 hover:opacity-100'
          }`}
        >
          En
        </button>

        <div className="w-px h-4 bg-black opacity-10 mx-1" />

        <button
          type="button"
          onClick={() => handleSave('published')}
          disabled={saving || !title}
          title={isEdit ? t('editPost.update') : t('editPost.publish')}
          className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider border border-black disabled:opacity-30 hover:bg-black hover:text-white disabled:hover:bg-transparent disabled:hover:text-black transition-all cursor-pointer"
        >
          {isEdit ? t('editPost.update') : t('editPost.publish')}
        </button>
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={saving || !title}
          title={t('editPost.saveDraft')}
          className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider border border-black/40 opacity-60 disabled:opacity-30 hover:opacity-100 hover:bg-black hover:text-white disabled:hover:bg-transparent disabled:hover:text-black transition-all cursor-pointer"
        >
          {t('editPost.saveDraft')}
        </button>
        {saving && (
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
            {t('editPost.saving')}
          </span>
        )}
        {saveError && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-red-600" role="alert">
            {saveError}
          </span>
        )}

        <div className="flex-1" />

        {isEdit && (
          <button
            type="button"
            onClick={() => setCollectionsExpanded(!collectionsExpanded)}
            title={t('editPost.toggleCollections')}
            className={`h-7 px-2 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
              collectionsExpanded
                ? 'border-black bg-black text-white'
                : 'border-black/30 opacity-50 hover:opacity-100'
            }`}
          >
            {t('editPost.collections')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setTocExpanded(!tocExpanded)}
          title={t('editPost.toggleToc')}
          className={`h-7 px-2 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            tocExpanded
              ? 'border-black bg-black text-white'
              : 'border-black/30 opacity-50 hover:opacity-100'
          }`}
        >
          ☰ {t('editPost.toc')}
        </button>
        <button
          type="button"
          onClick={() => setInfoExpanded(!infoExpanded)}
          title={t('editPost.toggleInfo')}
          className={`h-7 px-2 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            infoExpanded
              ? 'border-black bg-black text-white'
              : 'border-black/30 opacity-50 hover:opacity-100'
          }`}
        >
          {t('editPost.metadata')}
        </button>
      </nav>

      <div className="relative flex-1 flex min-h-0">
        <div
          className={`absolute inset-y-0 left-0 z-20 lg:static border-r border-black/20 bg-white shrink-0 overflow-hidden transition-all duration-200 ${
            tocExpanded ? 'w-48' : 'w-0'
          }`}
        >
          <div className="w-48 h-full overflow-y-auto">
            {collectionsExpanded && postCollections.length > 0 && (
              <div className="border-b border-black/20">
                <div className="px-3 py-2 border-b border-black/10">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                    {t('editPost.collections')}
                  </span>
                </div>
                {postCollections.map((col) => (
                  <div key={col.id} className="px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">
                      {col.name}
                    </div>
                    <ol className="space-y-0.5">
                      {col.posts.map((cp, idx) => (
                        <li key={cp.id}>
                          <button
                            type="button"
                            onClick={() => cp.id !== id && guardedNavigate(`/posts/${cp.id}/edit`)}
                            className={`w-full text-left text-[11px] leading-tight px-1 py-0.5 rounded transition-colors ${
                              cp.id === id
                                ? 'font-bold text-black bg-black/5'
                                : 'text-black/50 hover:text-black hover:bg-black/5 cursor-pointer'
                            }`}
                          >
                            {idx + 1}. {cp.title}
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
            <TableOfContents editor={activeEditor} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 min-w-0">
          <div className="max-w-4xl mx-auto px-2 py-3 sm:px-8 sm:py-6">
            <Editor
              key={`${activeLang}-${loadedPostId}`}
              content={activeLang === 'zh' ? content : contentEn}
              onChange={(v) => { markDirty(); (activeLang === 'zh' ? setContent : setContentEn)(v) }}
              onEditorReady={handleEditorReady}
            />
          </div>
        </div>

        <div
          className={`absolute inset-y-0 right-0 z-20 lg:static border-l border-black/20 bg-white shrink-0 overflow-hidden transition-all duration-200 ${
            infoExpanded ? 'w-72' : 'w-0'
          }`}
        >
          <div className="w-72 h-full overflow-y-auto">
            <div className="px-4 py-3 border-b border-black/20">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                {t('editPost.metadata')}
              </span>
            </div>
            <div className="px-4 py-4 flex flex-col gap-3">
              {activeLang === 'zh' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">
                      {t('editPost.titlePlaceholder')}
                    </label>
                    <AutoGrowTextarea
                      value={title}
                      onChange={(v) => handleTitleChange(v.replace(/\n/g, ' '))}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                      placeholder={t('editPost.titlePlaceholder')}
                      className="w-full text-sm font-bold bg-transparent border border-black/30 px-3 py-2 outline-hidden placeholder:text-black/30 text-black focus:border-black transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">
                      slug
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="url-slug"
                      className="w-full text-sm bg-transparent border border-black/30 px-3 py-2 outline-hidden text-black opacity-50 placeholder:text-black/20 focus:border-black transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">
                      {t('editPost.tagsPlaceholder')}
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => { markDirty(); setTagsInput(e.target.value) }}
                      placeholder={t('editPost.tagsPlaceholder')}
                      className="w-full text-sm border border-black/30 px-3 py-2 outline-hidden text-black placeholder:text-black/30 focus:border-black transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">
                      {t('editPost.excerptPlaceholder')}
                    </label>
                    <AutoGrowTextarea
                      value={excerpt}
                      onChange={(v) => { markDirty(); setExcerpt(v) }}
                      placeholder={t('editPost.excerptPlaceholder')}
                      minRows={3}
                      className="w-full text-sm border border-black/30 px-3 py-2 outline-hidden text-black placeholder:text-black/30 focus:border-black transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-black">
                      <input type="checkbox" checked={hidden} onChange={(e) => { markDirty(); setHidden(e.target.checked) }} className="w-4 h-4 accent-black" />
                      <span className="font-bold uppercase tracking-widest text-xs opacity-70">{t('editPost.hidden')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-black">
                      <input type="checkbox" checked={pinned} onChange={(e) => { markDirty(); setPinned(e.target.checked) }} className="w-4 h-4 accent-black" />
                      <span className="font-bold uppercase tracking-widest text-xs opacity-70">{t('editPost.pinned')}</span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">
                      {t('editPost.titleEnPlaceholder')}
                    </label>
                    <AutoGrowTextarea
                      value={titleEn}
                      onChange={(v) => { markDirty(); setTitleEn(v.replace(/\n/g, ' ')) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                      placeholder={t('editPost.titleEnPlaceholder')}
                      className="w-full text-sm font-bold bg-transparent border border-black/30 px-3 py-2 outline-hidden placeholder:text-black/30 text-black focus:border-black transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">
                      {t('editPost.excerptEnPlaceholder')}
                    </label>
                    <AutoGrowTextarea
                      value={excerptEn}
                      onChange={(v) => { markDirty(); setExcerptEn(v) }}
                      placeholder={t('editPost.excerptEnPlaceholder')}
                      minRows={3}
                      className="w-full text-sm border border-black/30 px-3 py-2 outline-hidden text-black placeholder:text-black/30 focus:border-black transition-colors"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
