import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { requireAdmin } from '../lib/admin'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (adminOnly) {
    const { allowed } = requireAdmin(profile)
    if (!allowed) return <Navigate to="/access-denied" replace />
  }

  return <>{children}</>
}
