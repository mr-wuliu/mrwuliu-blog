import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

type CommentStatus = 'pending' | 'approved' | 'rejected'

interface Comment {
  id: string
  postId: string
  authorName: string
  authorEmail: string | null
  content: string
  status: CommentStatus
  createdAt: string
}

interface CommentsResponse {
  comments: Comment[]
  total: number
  page: number
  limit: number
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
]

const STATUS_LABEL: Record<CommentStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

const STATUS_BADGE: Record<CommentStatus, string> = {
  pending: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  approved: 'bg-green-900/50 text-green-400 border-green-700',
  rejected: 'bg-red-900/50 text-red-400 border-red-700',
}

const FILTER_EMPTY: Record<FilterTab, string> = {
  all: '暂无评论',
  pending: '暂无待审核评论',
  approved: '暂无已通过评论',
  rejected: '暂无已拒绝评论',
}

function formatDate(iso: string): string {
  const d = new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}

export default function Comments() {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [page, setPage] = useState(1)
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const totalPages = Math.max(1, Math.ceil(total / 20))

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const status = filter === 'all' ? '' : filter
      const res = await api.get<CommentsResponse>(
        `/admin/comments?status=${status}&page=${page}&limit=20`
      )
      setComments(res.comments)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleFilterChange = (tab: FilterTab) => {
    setFilter(tab)
    setPage(1)
  }

  const updateStatus = async (id: string, status: CommentStatus) => {
    await api.put(`/admin/comments/${id}`, { status })
    await fetchComments()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条评论吗？')) return
    await api.delete(`/admin/comments/${id}`)
    await fetchComments()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold">评论管理</h1>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 border border-gray-700 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-gray-500 py-12">加载中...</div>
        )}

        {!loading && comments.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            {FILTER_EMPTY[filter]}
          </div>
        )}

        {!loading && comments.length > 0 && (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{comment.authorName}</span>
                    <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">文章 #{comment.postId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_BADGE[comment.status]}`}>
                      {STATUS_LABEL[comment.status]}
                    </span>
                  </div>
                </div>

                <p className="text-gray-300 mb-3">
                  {truncate(comment.content, 100)}
                </p>

                <div className="flex gap-2">
                  {comment.status !== 'approved' && (
                    <button
                      onClick={() => updateStatus(comment.id, 'approved')}
                      className="px-3 py-1 text-sm rounded bg-green-700 hover:bg-green-600 text-white transition-colors"
                    >
                      通过
                    </button>
                  )}
                  {comment.status !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(comment.id, 'rejected')}
                      className="px-3 py-1 text-sm rounded bg-red-700 hover:bg-red-600 text-white transition-colors"
                    >
                      拒绝
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && total > 0 && (
          <div className="flex items-center justify-center gap-4 mt-8 text-sm text-gray-400">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <span>
              第 {page} 页 / 共 {totalPages} 页
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
