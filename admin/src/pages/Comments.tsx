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
  pending: 'bg-yellow-500/20 text-yellow-600 border-black',
  approved: 'bg-green-500/20 text-green-600 border-black',
  rejected: 'bg-red-500/20 text-red-600 border-black',
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
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-black">评论管理</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={
              filter === tab.key
                ? 'px-4 py-2 text-sm font-bold uppercase tracking-widest border border-black text-black bg-black bg-opacity-5 transition-all'
                : 'px-4 py-2 text-sm font-bold uppercase tracking-widest border border-black border-opacity-30 text-black opacity-70 hover:opacity-100 hover:border-opacity-100 transition-all'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center opacity-50 py-16 text-sm">加载中...</div>
      )}

      {!loading && comments.length === 0 && (
        <div className="text-center opacity-50 py-16 text-sm">
          {FILTER_EMPTY[filter]}
        </div>
      )}

      {!loading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white border border-black p-6 mb-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-black text-sm">{comment.authorName}</span>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">{formatDate(comment.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">文章 #{comment.postId}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest border border-black px-2 py-0.5 ${STATUS_BADGE[comment.status]}`}>
                    {STATUS_LABEL[comment.status]}
                  </span>
                </div>
              </div>

              <p className="opacity-70 text-sm leading-relaxed mb-4">
                {truncate(comment.content, 100)}
              </p>

              <div className="flex gap-2">
                {comment.status !== 'approved' && (
                  <button
                    onClick={() => updateStatus(comment.id, 'approved')}
                    className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-all"
                  >
                    通过
                  </button>
                )}
                {comment.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(comment.id, 'rejected')}
                    className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                  >
                    拒绝
                  </button>
                )}
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-black opacity-70 hover:opacity-100 hover:bg-black hover:text-white transition-all"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            上一页
          </button>
          <span className="text-xs font-bold uppercase tracking-widest opacity-50">
            第 {page} 页 / 共 {totalPages} 页
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
