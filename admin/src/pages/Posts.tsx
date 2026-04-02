import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

interface Tag {
  id: string
  name: string
  slug: string
}

interface Post {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  hidden: boolean
  pinned: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
}

interface PostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
}

type StatusFilter = null | 'published' | 'draft'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Posts() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [status, setStatus] = useState<StatusFilter>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status) params.set('status', status)
      const data = await api.get<PostsResponse>(`/posts?${params.toString()}`)
      setPosts(data.posts)
      setTotal(data.total)
    } catch {
      setPosts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('posts.confirmDelete'))) return
    try {
      await api.delete(`/posts/${id}`)
      await fetchPosts()
    } catch {
      void 0
    }
  }

  const handleToggleHidden = async (id: string, currentHidden: boolean) => {
    try {
      await api.put(`/posts/${id}`, { hidden: !currentHidden })
      await fetchPosts()
    } catch {
      void 0
    }
  }

  const handleTogglePinned = async (id: string, currentPinned: boolean) => {
    try {
      await api.put(`/posts/${id}`, { pinned: !currentPinned })
      await fetchPosts()
    } catch {
      void 0
    }
  }

  const filtered = search
    ? posts.filter((p) => p.title.includes(search))
    : posts

  const totalPages = Math.max(1, Math.ceil(total / 20))

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: t('posts.all'), value: null },
    { label: t('posts.publishedTab'), value: 'published' },
    { label: t('posts.draftTab'), value: 'draft' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black">{t('posts.title')}</h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">{t('posts.totalCount', { count: total })}</p>
        </div>
        <button
          onClick={() => navigate('/posts/new')}
          className="px-6 py-2.5 font-bold text-sm border border-black rounded-none uppercase tracking-widest hover:bg-black hover:text-white transition-all"
        >
          {t('posts.newPost')}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={String(tab.value)}
              onClick={() => { setStatus(tab.value); setPage(1) }}
              className={
                status === tab.value
                  ? 'px-4 py-2 text-sm font-bold uppercase tracking-widest border border-black text-black bg-black bg-opacity-5 transition-all'
                  : 'px-4 py-2 text-sm font-bold uppercase tracking-widest border border-black border-opacity-30 text-black opacity-70 hover:opacity-100 hover:border-opacity-100 transition-all'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('posts.searchPlaceholder')}
          className="px-4 py-2.5 border border-black text-sm focus:outline-none focus:border-black w-64 placeholder-black placeholder-opacity-30"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 opacity-50 text-sm">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="opacity-50 text-sm mb-4">{t('posts.noPosts')}</p>
          <button
            onClick={() => navigate('/posts/new')}
            className="px-6 py-2.5 font-bold text-sm border border-black rounded-none uppercase tracking-widest hover:bg-black hover:text-white transition-all"
          >
            {t('posts.writeFirst')}
          </button>
        </div>
      ) : (
        <>
          <div className="border border-black overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black bg-black bg-opacity-5">
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest opacity-50 text-left">
                    {t('posts.tableTitle')}
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest opacity-50 text-left">
                    {t('posts.tableStatus')}
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest opacity-50 text-left">
                    {t('posts.tableTags')}
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest opacity-50 text-left">
                    {t('posts.tableDate')}
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest opacity-50 text-left text-right">
                    {t('posts.tableActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-black border-opacity-20 hover:bg-black hover:bg-opacity-5 transition-all"
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={() => navigate(`/posts/${post.id}/edit`)}
                        className="text-black font-medium text-sm text-left hover:opacity-70 transition-all"
                      >
                        {post.title}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      {post.status === 'published' ? (
                        <span className="text-[10px] font-black uppercase tracking-widest border border-black px-2 py-0.5 bg-green-500/20 text-green-600">
                          {t('posts.published')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest border border-black px-2 py-0.5 bg-yellow-500/20 text-yellow-600">
                          {t('posts.draft')}
                        </span>
                      )}
                      {post.hidden && (
                        <span className="ml-1 text-[10px] font-black uppercase tracking-widest border border-black px-2 py-0.5 bg-gray-500/20 text-gray-600">
                          {t('posts.hidden')}
                        </span>
                      )}
                      {post.pinned && (
                        <span className="ml-1 text-[10px] font-black uppercase tracking-widest border border-black px-2 py-0.5 bg-red-500/20 text-red-600">
                          {t('posts.pinned')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {post.tags && post.tags.length > 0
                          ? post.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="text-[10px] font-black uppercase tracking-widest border border-black border-opacity-30 px-2 py-0.5 text-black opacity-70"
                              >
                                {tag.name}
                              </span>
                            ))
                          : null}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-bold uppercase tracking-widest opacity-50 whitespace-nowrap">
                      {formatDate(
                        post.status === 'published' && post.publishedAt
                          ? post.publishedAt
                          : post.createdAt,
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/posts/${post.id}/edit`)}
                        className="text-xs font-bold uppercase tracking-widest text-black opacity-70 hover:opacity-100 mr-3 transition-all"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleToggleHidden(post.id, post.hidden)}
                        className={`text-xs font-bold uppercase tracking-widest opacity-70 hover:opacity-100 mr-3 transition-all ${post.hidden ? 'text-gray-600' : 'text-gray-400'}`}
                        title={post.hidden ? t('posts.unhide') : t('posts.hide')}
                      >
                        {post.hidden ? t('posts.unhide') : t('posts.hide')}
                      </button>
                      <button
                        onClick={() => handleTogglePinned(post.id, post.pinned)}
                        className={`text-xs font-bold uppercase tracking-widest opacity-70 hover:opacity-100 mr-3 transition-all ${post.pinned ? 'text-red-600' : 'text-gray-400'}`}
                        title={post.pinned ? t('posts.unpin') : t('posts.pin')}
                      >
                        {post.pinned ? t('posts.unpin') : t('posts.pin')}
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-xs font-bold uppercase tracking-widest text-red-600 opacity-70 hover:opacity-100 transition-all"
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">
              {t('common.pageInfo', { page, total: totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
