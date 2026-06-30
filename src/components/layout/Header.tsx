import { Link } from 'react-router-dom'
import { Building2, MessageSquare, PlusCircle, LogOut, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadCount } from '../../features/chat/hooks/useUnreadCount'

export function Header() {
  const { user, profile, loading, signOut } = useAuth()
  const { count: unread } = useUnreadCount()

  if (loading) {
    return (
      <header className="bg-primary-900 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Building2 className="h-6 w-6" />
            ValClassifieds
          </Link>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-primary-900 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <Building2 className="h-6 w-6" />
          ValClassifieds
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/create"
                className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/20"
              >
                <PlusCircle className="h-4 w-4" />
                Post Ad
              </Link>
              <Link
                to="/favorites"
                className="rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                Favorites
              </Link>
              <Link
                to="/messages"
                className="relative rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                <MessageSquare className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                <User className="h-4 w-4" />
                {profile?.full_name ?? 'Dashboard'}
              </Link>
              <Link
                to="/profile"
                className="text-sm font-medium hover:underline"
              >
                Profile
              </Link>
              {profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-sm font-medium hover:underline"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium hover:underline"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary-900 transition hover:bg-gray-100"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
