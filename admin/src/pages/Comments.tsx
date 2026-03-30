import { useState } from 'react'
import { Link } from 'react-router-dom'

type FilterTab = 'all' | 'pending' | 'approved' | 'spam'

export default function Comments() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'spam', label: 'Spam' },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">Comments</h1>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/posts" className="text-gray-400 hover:text-white">Posts</Link>
            <Link to="/comments" className="text-blue-400 hover:text-blue-300">Comments</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 border border-gray-700 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Comment</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Post</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No comments yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
