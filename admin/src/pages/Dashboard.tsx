import { Link } from 'react-router-dom'

const stats = [
  { label: 'Total Posts', value: '—', color: 'bg-blue-500' },
  { label: 'Published', value: '—', color: 'bg-green-500' },
  { label: 'Drafts', value: '—', color: 'bg-yellow-500' },
  { label: 'Comments', value: '—', color: 'bg-purple-500' },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-blue-400 hover:text-blue-300">Dashboard</Link>
            <Link to="/posts" className="text-gray-400 hover:text-white">Posts</Link>
            <Link to="/comments" className="text-gray-400 hover:text-white">Comments</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-3">
            <Link
              to="/posts/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
            >
              New Post
            </Link>
            <Link
              to="/posts"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
            >
              Manage Posts
            </Link>
            <Link
              to="/comments"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
            >
              View Comments
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
