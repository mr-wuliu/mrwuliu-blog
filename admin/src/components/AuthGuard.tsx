import { useEffect, useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { api } from '../lib/api'

type User = { authenticated: boolean; username: string }

export default function AuthGuard() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    api.get<User>('/auth/me')
      .then((data) => {
        if (!cancelled) {
          setUser(data)
          setChecking(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChecking(false)
          navigate('/login', { replace: true })
        }
      })
    return () => { cancelled = true }
  }, [navigate])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Checking authentication…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <Outlet context={user} />
}
