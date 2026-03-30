import { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet, useOutletContext, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type User = { authenticated: boolean; username: string }

type CommentsCountResponse = { comments: unknown[]; total: number }

export function useUser(): User {
  return useOutletContext<User>()
}

export default function Layout() {
  const user = useUser()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  const fetchPendingCount = useCallback(() => {
    api.get<CommentsCountResponse>('/admin/comments?status=pending&limit=1')
      .then((data) => setPendingCount(data.total))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchPendingCount()
  }, [fetchPendingCount])

  async function handleLogout() {
    await api.post('/auth/logout', {}).catch(() => {})
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="px-5 py-6 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">Blog Admin</h1>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/posts"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span>Posts</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/comments"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span>Comments</span>
                {pendingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium text-white bg-red-500 rounded-full">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="px-5 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 truncate">{user.username}</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
          <span className="text-sm text-gray-500">Welcome back, <span className="font-medium text-gray-700">{user.username}</span></span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
