import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Home, Search, PlusCircle, Heart, MessageCircle, Menu, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadCount } from '../../features/chat/hooks/useUnreadCount'
import { isAdmin } from '../../lib/admin'
import { NavItem } from './NavItem'
import { CategoryDropdown } from './CategoryDropdown'
import { ProfileDropdown } from './ProfileDropdown'
import { NotificationBell } from './NotificationBell'
import { MobileMenu } from './MobileMenu'

export function Navbar() {
  const { user, profile, loading, signOut } = useAuth()

  const centerNav = [
    { to: '/', icon: Home, label: 'Home', exact: true },
    { to: '/listings', icon: Search, label: 'Browse Ads' },
    { to: '/create', icon: PlusCircle, label: 'Post Ad' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    ...(isAdmin(profile) ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ]
  const { count: unread } = useUnreadCount()
  const [mobileOpen, setMobileOpen] = useState(false)
  const handleCloseMobile = useCallback(() => setMobileOpen(false), [])

  if (loading) {
    return (
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-900">
            <Building2 className="h-6 w-6" />
            ValClassifieds
          </Link>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
              aria-label="Open menu"
              data-testid="navbar-mobile-toggle"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-900" data-testid="navbar-logo">
              <Building2 className="h-6 w-6" />
              ValClassifieds
            </Link>

            <nav className="ml-10 hidden items-center gap-1 lg:flex" aria-label="Main navigation">
              <CategoryDropdown />
              {centerNav.map((item) => (
                <NavItem
                  key={item.label}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  exact={item.exact}
                  testId={item.label === 'Post Ad' ? 'navbar-create-listing' : undefined}
                />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/messages"
                  className="relative rounded-lg p-2 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  aria-label={`Messages${unread > 0 ? ` (${unread} unread)` : ''}`}
                >
                  <MessageCircle className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>

                <NotificationBell count={0} />

                <ProfileDropdown profile={profile} onSignOut={signOut} />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  data-testid="navbar-login-link"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={handleCloseMobile}
        onSignOut={signOut}
      />
    </>
  )
}
