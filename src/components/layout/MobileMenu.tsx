import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Home,
  Search,
  PlusCircle,
  Heart,
  MessageCircle,
  User,
  LayoutDashboard,
  Settings,
  LogOut,
  Shield,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { isAdmin } from '../../lib/admin'
import { categories } from '../../data/categories'

type NavItem = {
  to: string
  icon: typeof Home
  label: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSignOut: () => void
}

export function MobileMenu({ open, onClose, onSignOut }: Props) {
  const { profile } = useAuth()
  const [showCategories, setShowCategories] = useState(false)

  const mainNav: NavItem[] = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/listings', icon: Search, label: 'Browse Ads' },
    { to: '/create', icon: PlusCircle, label: 'Post Ad' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    ...(isAdmin(profile) ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ]

  const accountNav: NavItem[] = [
    { to: '/profile', icon: User, label: 'My Profile' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'My Listings' },
    { to: '/profile', icon: Settings, label: 'Settings' },
  ]
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={navRef}
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 text-lg font-bold text-primary-900"
          >
            ValClassifieds
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Browse
          </p>
          <nav className="space-y-0.5">
            {mainNav.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <item.icon className="h-5 w-5 text-gray-400" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Categories accordion */}
          <div className="mt-2">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100"
            >
              <span>All Categories</span>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition duration-200 ${
                  showCategories ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showCategories && (
              <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <Link
                      key={cat.slug}
                      to={`/category/${cat.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-50 text-primary-600">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      {cat.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <hr className="my-4 border-gray-100" />

          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Account
          </p>
          <nav className="space-y-0.5">
            {accountNav.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <item.icon className="h-5 w-5 text-gray-400" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => { onSignOut(); onClose() }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </nav>
        </div>
      </div>
    </>
  )
}
