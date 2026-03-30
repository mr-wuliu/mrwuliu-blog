import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

type Post = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
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
}

const statCards: { key: keyof Stats; label: string; color: string }[] = [
  { key: 'totalPosts', label: 'Total Posts', color: 'bg-blue-500' },
  { key: 'published', label: 'Published', color: 'bg-green-500' },
  { key: 'drafts', label: 'Drafts', color: 'bg-yellow-500' },
  { key: 'pendingComments', label: 'Pending Comments', color: 'bg-red-500' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalPosts: 0, published: 0, drafts: 0, pendingComments: 0 })
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [recentComments, setRecentComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const postsPromise = api.get<PostsResponse>('/posts?limit=1000')
      .then((data) => {
        const posts = data.posts
        const published = posts.filter((p) => p.status === 'published').length
        setStats((prev) => ({
          ...prev,
          totalPosts: posts.length,
          published,
          drafts: posts.length - published,
        }))
        setRecentPosts(posts.slice(0, 5))
      })

    const commentsPromise = api.get<CommentsResponse>('/admin/comments?status=pending&limit=5')
      .then((data) => {
        setStats((prev) => ({ ...prev, pendingComments: data.total }))
        setRecentComments(data.comments)
      })

    Promise.all([postsPromise, commentsPromise])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <Link
          to="/posts/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          New Post
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.key} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${card.color}`} />
              <span className="text-sm text-gray-500">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats[card.key]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Posts</h3>
            <Link to="/posts" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          {recentPosts.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No posts yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentPosts.map((post) => (
                <li key={post.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <Link to={`/posts/${post.id}/edit`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">
                      {post.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(post.createdAt)}</p>
                  </div>
                  <span className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                    post.status === 'published'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {post.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Pending Comments</h3>
            <Link to="/comments" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          {recentComments.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No pending comments</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentComments.map((comment) => (
                <li key={comment.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                    <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
