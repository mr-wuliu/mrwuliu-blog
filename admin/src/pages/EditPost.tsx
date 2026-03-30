import { Link, useParams } from 'react-router-dom'

export default function EditPost() {
  const { id } = useParams()
  const isNew = !id

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">{isNew ? 'New Post' : 'Edit Post'}</h1>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/posts" className="text-blue-400 hover:text-blue-300">Posts</Link>
            <Link to="/comments" className="text-gray-400 hover:text-white">Comments</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="Post title..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-2">
              Slug
            </label>
            <input
              id="slug"
              type="text"
              placeholder="post-url-slug"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-300 mb-2">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              rows={2}
              placeholder="Brief description..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content
            </label>
            <div className="w-full h-64 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-500">
              Editor will be added here
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
            >
              {isNew ? 'Publish' : 'Update'}
            </button>
            <button
              type="button"
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
            >
              Save Draft
            </button>
            <Link
              to="/posts"
              className="px-6 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
