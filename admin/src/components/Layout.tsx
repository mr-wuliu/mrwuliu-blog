import { useEffect, useState, useCallback } from 'react'
import type { MouseEvent } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { isEditorDirty, setEditorDirty } from '../lib/editor-dirty'

type CommentsCountResponse = { comments: unknown[]; total: number }

export default function Layout() {
  const { t } = useTranslation()
  const [pendingCount, setPendingCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const fetchPendingCount = useCallback(() => {
    api.get<CommentsCountResponse>('/admin/comments?status=pending&limit=1')
      .then((data) => setPendingCount(data.total))
      .catch((err) => {
        // Badge count is optional enrichment — keep the nav usable without it.
        console.error('Failed to load pending comment count', err)
      })
  }, [])

  useEffect(() => {
    fetchPendingCount()
  }, [fetchPendingCount])

  // Sidebar links bypass the editor page's own navigation guard; intercept the
  // click before react-router handles it so unsaved changes get a confirm().
  const guardNavigation = useCallback((e: MouseEvent) => {
    if (!(e.target instanceof Element) || !e.target.closest('a')) return
    if (isEditorDirty() && !window.confirm(t('editPost.confirmLeave'))) {
      e.preventDefault()
      return
    }
    setEditorDirty(false)
    setMenuOpen(false)
  }, [t])

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {menuOpen && <button type="button" aria-label={t('layout.adminTitle')} className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside id="admin-navigation" className={`w-48 shrink-0 bg-white border-r border-black flex-col top-0 h-screen z-40 ${menuOpen ? 'flex fixed' : 'hidden'} md:flex md:sticky`}>
        <div className="px-4 py-6 border-b border-black">
          <h1 className="text-lg font-bold tracking-tight text-black">{t('layout.adminTitle')}</h1>
        </div>

        <nav className="flex-1 py-4" onClickCapture={guardNavigation}>
          <ul className="space-y-1 px-4">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.dashboard')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.analytics')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/collections"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.collections')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/posts"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.posts')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/comments"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.comments')}</span>
                {pendingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-black uppercase text-black border border-black/50">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.users')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/site-config"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.siteConfig')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.projects')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/friend-links"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 border-l-2 text-sm transition-all ${
                    isActive
                      ? 'border-black font-bold text-black bg-black/5'
                      : 'border-transparent text-black opacity-70 hover:opacity-100 hover:border-black'
                  }`
                }
              >
                <span>{t('layout.friendLinks')}</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-11 shrink-0 flex items-center gap-3 px-3 border-b border-black md:hidden">
          <button type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" aria-label={t('layout.adminTitle')} className="px-2 py-1 border border-black" onClick={() => setMenuOpen(value => !value)}>☰</button>
          <span className="text-sm font-bold">{t('layout.adminTitle')}</span>
        </div>
        <main className="flex-1 overflow-hidden bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
