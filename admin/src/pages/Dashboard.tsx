import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

type Post = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  viewCount: number
  uniqueViewCount: number
  createdAt: string
  updatedAt: string
}

type Comment = {
  id: string
  postId: string
  authorName: string
  content: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

type PostsResponse = { posts: Post[]; total: number }
type CommentsResponse = { comments: Comment[]; total: number }

type Stats = {
  totalPosts: number
  published: number
  drafts: number
  pendingComments: number
  totalViews: number
  totalUniqueViews: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    published: 0,
    drafts: 0,
    pendingComments: 0,
    totalViews: 0,
    totalUniqueViews: 0,
  })
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [recentComments, setRecentComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const statCards: { key: keyof Stats; label: string; color: string }[] = [
    { key: 'totalPosts', label: t('dashboard.totalPosts'), color: 'bg-black' },
    { key: 'published', label: t('dashboard.published'), color: 'bg-green-500' },
    { key: 'drafts', label: t('dashboard.drafts'), color: 'bg-yellow-500' },
    { key: 'pendingComments', label: t('dashboard.pendingComments'), color: 'bg-red-500' },
    { key: 'totalViews', label: t('dashboard.totalViews'), color: 'bg-blue-500' },
    { key: 'totalUniqueViews', label: t('dashboard.totalUniqueViews'), color: 'bg-cyan-500' },
  ]

  useEffect(() => {
    const controller = new AbortController()
    const postsPromise = Promise.all([
      api.get<Omit<Stats, 'pendingComments'>>('/posts/summary', controller.signal),
      api.get<PostsResponse>('/posts?limit=5', controller.signal),
    ]).then(([summary, data]) => {
      if (controller.signal.aborted) return
      setStats(prev => ({ ...prev, ...summary }))
      setRecentPosts(data.posts)
    })

    const commentsPromise = api.get<CommentsResponse>('/admin/comments?status=pending&limit=5', controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setStats((prev) => ({ ...prev, pendingComments: data.total }))
        setRecentComments(data.comments)
      })

    Promise.all([postsPromise, commentsPromise])
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : t('common.loadFailed'))
        // Cards/lists fall back to zeros and empty states; logged for diagnosis.
        console.error('Failed to load dashboard data', err)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  if (error) return <div role="alert" className="p-8 text-red-600">{error}<button className="block mt-4 underline" onClick={() => window.location.reload()}>{t('common.retry')}</button></div>

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-black">{t('dashboard.title')}</h2>
        <Link
          to="/posts/new"
          className="px-6 py-2.5 font-bold text-sm border border-black rounded-none uppercase tracking-widest hover:bg-black hover:text-white transition-all"
        >
          {t('dashboard.newPost')}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.key} className="bg-white border border-black p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 ${card.color}`} />
              <span className="text-xs font-bold uppercase tracking-widest opacity-50">{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-black">{stats[card.key]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-black">
          <div className="px-6 py-4 border-b border-black flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">{t('dashboard.recentPosts')}</h3>
            <Link to="/posts" className="text-xs font-bold uppercase tracking-widest text-black opacity-70 hover:opacity-100">{t('dashboard.viewAll')}</Link>
          </div>
          {recentPosts.length === 0 ? (
            <p className="px-6 py-10 text-sm opacity-50 text-center">{t('dashboard.noPosts')}</p>
          ) : (
            <>
              <div className="px-6 py-2 border-b border-black grid grid-cols-[minmax(0,1fr)_36px_36px_96px] items-center gap-2">
                <span />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50 text-center">{t('dashboard.pv')}</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50 text-center">{t('dashboard.uv')}</span>
                <span />
              </div>
              <ul className="divide-y divide-black">
              {recentPosts.map((post) => (
                <li key={post.id} className="px-6 py-3 grid grid-cols-[minmax(0,1fr)_36px_36px_96px] items-center gap-2">
                  <div className="min-w-0 overflow-hidden">
                    <Link
                      to={`/posts/${post.id}/edit`}
                      className="text-sm font-medium text-black hover:opacity-70 truncate block min-w-0"
                    >
                      {post.title}
                    </Link>
                  </div>
                  <span className="inline-flex items-center justify-center h-6 w-9 border border-black bg-blue-500/20 text-blue-700 text-[10px] font-black tracking-widest leading-none">
                    {post.viewCount ?? 0}
                  </span>
                  <span className="inline-flex items-center justify-center h-6 w-9 border border-black bg-cyan-500/20 text-cyan-700 text-[10px] font-black tracking-widest leading-none">
                    {post.uniqueViewCount ?? 0}
                  </span>
                  <span className={`inline-flex items-center justify-center h-6 w-24 justify-self-start text-[10px] font-black uppercase tracking-widest border border-black px-2 py-0.5 ${
                    post.status === 'published'
                      ? 'bg-green-500/20 text-green-600'
                      : 'bg-yellow-500/20 text-yellow-600'
                  }`}>
                    {post.status}
                  </span>
                </li>
              ))}
              </ul>
            </>
          )}
        </div>

        <div className="bg-white border border-black">
          <div className="px-6 py-4 border-b border-black flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">{t('dashboard.pendingCommentsTitle')}</h3>
            <Link to="/comments" className="text-xs font-bold uppercase tracking-widest text-black opacity-70 hover:opacity-100">{t('dashboard.viewAll')}</Link>
          </div>
          {recentComments.length === 0 ? (
            <p className="px-6 py-10 text-sm opacity-50 text-center">{t('dashboard.noPendingComments')}</p>
          ) : (
            <ul className="divide-y divide-black">
              {recentComments.map((comment) => (
                <li key={comment.id} className="px-6 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-black">{comment.authorName}</span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm opacity-70 line-clamp-2">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
