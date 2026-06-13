import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  name: string
  role: string
  status: 'active' | 'banned'
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  commentCount?: number
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Users() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    api.get<UsersResponse>(`/admin/users?${params}`)
      .then((data) => {
        setUsers(data.users)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleToggleBan = async (user: User) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active'
    try {
      await api.patch(`/admin/users/${user.id}`, { status: newStatus })
      setUsers(users.map((u) => u.id === user.id ? { ...u, status: newStatus } : u))
    } catch {
      alert(t('users.actionFailed'))
    }
  }

  return (
    <div className="overflow-y-auto h-full p-8">
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-widest">{t('users.title')}</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('users.searchPlaceholder')}
            className="px-3 py-2 border-2 border-black text-sm focus:outline-none"
          />
          <button
            onClick={handleSearch}
            className="border-2 border-black px-4 py-2 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            {t('users.search')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm opacity-50">{t('users.loading')}</div>
      ) : users.length === 0 ? (
        <div className="text-sm opacity-50">{t('users.noUsers')}</div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-widest font-bold">{t('users.email')}</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-widest font-bold">{t('users.name')}</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-widest font-bold">{t('users.status')}</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-widest font-bold">{t('users.comments')}</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-widest font-bold">{t('users.lastLogin')}</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-widest font-bold">{t('users.registered')}</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-widest font-bold">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-3">{user.email}</td>
                  <td className="py-2 px-3">{user.name}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold border ${user.status === 'active' ? 'bg-green-500/20 text-green-600 border-black' : 'bg-red-500/20 text-red-600 border-black'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">{user.commentCount ?? 0}</td>
                  <td className="py-2 px-3 text-gray-500">{formatDate(user.lastLoginAt)}</td>
                  <td className="py-2 px-3 text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleToggleBan(user)}
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-colors cursor-pointer ${user.status === 'banned' ? 'opacity-50' : ''}`}
                    >
                      {user.status === 'active' ? t('users.ban') : t('users.unban')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border border-black disabled:opacity-30 cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                ←
              </button>
              <span className="text-sm">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border border-black disabled:opacity-30 cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
