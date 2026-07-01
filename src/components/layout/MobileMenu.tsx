import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Home,
  LayoutGrid,
  Search,
  PlusCircle,
  Heart,
  MessageCircle,
  User,
  LayoutDashboard,
  Settings,
  LogOut,
} from 'lucide-react'

type NavItem = {
  to: string
  icon: typeof Home
  label: string
}

const mainNav: NavItem[] = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/listings', icon: LayoutGrid, label: 'Categories' },
  { to: '/listings', icon: Search, label: 'Browse Ads' },
  { to: '/create', icon: PlusCircle, label: 'Post Ad' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
]

const accountNav: NavItem[] = [
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'My Listings' },
  { to: '/profile', icon: Settings, label: 'Settings' },
]

type Props = {
  open: boolean
  onClose: () => void
  onSignOut: () => void
}

export function MobileMenu({ open, onClose, onSignOut }: Props) {
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
