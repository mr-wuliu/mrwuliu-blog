import { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../lib/api'

type CommentsCountResponse = { comments: unknown[]; total: number }

export default function Layout() {
  const [pendingCount, setPendingCount] = useState(0)

  const fetchPendingCount = useCallback(() => {
    api.get<CommentsCountResponse>('/admin/comments?status=pending&limit=1')
      .then((data) => setPendingCount(data.total))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchPendingCount()
  }, [fetchPendingCount])

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-60 bg-white border-r border-black flex flex-col sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-black">
          <h1 className="text-lg font-bold tracking-tight text-black">Blog Admin</h1>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-4">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black bg-opacity-5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
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
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black bg-opacity-5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
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
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black bg-opacity-5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>Comments</span>
                {pendingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-black uppercase text-black border border-black border-opacity-50">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/site-config"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black bg-opacity-5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>Site Config</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black bg-opacity-5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>Projects</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-black flex items-center px-8 bg-white">
          <span className="text-xs font-bold uppercase tracking-widest opacity-50">Blog Admin Panel</span>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
