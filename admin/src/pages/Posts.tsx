import { Link } from 'react-router-dom'

export default function Posts() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">Posts</h1>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/posts" className="text-blue-400 hover:text-blue-300">Posts</Link>
            <Link to="/comments" className="text-gray-400 hover:text-white">Comments</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">All Posts</h2>
            <p className="text-sm text-gray-400 mt-1">Manage your blog posts</p>
          </div>
          <Link
            to="/posts/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
          >
            New Post
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  No posts yet. Click "New Post" to create one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
