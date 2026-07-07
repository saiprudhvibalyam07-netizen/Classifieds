import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { User, LayoutDashboard, Heart, MessageCircle, Settings, LogOut, ChevronDown, Shield } from 'lucide-react'
import type { Profile } from '../../types'
import { isAdmin } from '../../lib/admin'

type Props = {
  profile: Profile | null
  onSignOut: () => void
}

function getMenuItems(profile: Profile | null) {
  const items = [
    { to: '/profile', icon: User, label: 'My Profile' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'My Listings' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/profile', icon: Settings, label: 'Settings' },
  ]
  if (isAdmin(profile)) {
    items.splice(1, 0, { to: '/admin', icon: Shield, label: 'Admin Panel' })
  }
  return items
}

export function ProfileDropdown({ profile, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuItems = getMenuItems(profile)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, close])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
        data-testid="navbar-user-menu"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? ''}
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <User className="h-4 w-4" />
          </div>
        )}
        <span className="hidden max-w-[100px] truncate lg:inline">
          {profile?.full_name ?? 'User'}
        </span>
        <ChevronDown
          className={`hidden h-4 w-4 text-gray-400 transition-transform duration-200 lg:inline ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-48 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg transition-all duration-150"
          role="menu"
        >
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={close}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50"
              role="menuitem"
            >
              <item.icon className="h-4 w-4 text-gray-400" />
              {item.label}
            </Link>
          ))}
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={() => { onSignOut(); close() }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:bg-red-50"
            role="menuitem"
            data-testid="navbar-logout-button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
