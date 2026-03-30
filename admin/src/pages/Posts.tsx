import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
    if (!window.confirm('确认删除这篇文章？此操作不可恢复。')) return
    try {
      await api.delete(`/posts/${id}`)
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
    { label: '全部', value: null },
    { label: '已发布', value: 'published' },
    { label: '草稿', value: 'draft' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">文章管理</h1>
          <p className="text-sm text-gray-400 mt-1">共 {total} 篇文章</p>
        </div>
        <button
          onClick={() => navigate('/posts/new')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          新文章
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={String(tab.value)}
              onClick={() => { setStatus(tab.value); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                status === tab.value
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索文章标题..."
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">暂无文章</p>
          <button
            onClick={() => navigate('/posts/new')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            写第一篇文章
          </button>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    标题
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    标签
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-gray-700/50 hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/posts/${post.id}/edit`)}
                        className="text-gray-200 hover:text-blue-400 font-medium text-left transition-colors"
                      >
                        {post.title}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {post.status === 'published' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-400">
                          已发布
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/50 text-yellow-400">
                          草稿
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {post.tags && post.tags.length > 0
                          ? post.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300"
                              >
                                {tag.name}
                              </span>
                            ))
                          : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {formatDate(
                        post.status === 'published' && post.publishedAt
                          ? post.publishedAt
                          : post.createdAt,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/posts/${post.id}/edit`)}
                        className="text-sm text-blue-400 hover:text-blue-300 mr-3 transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              第 {page} / {totalPages} 页
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
