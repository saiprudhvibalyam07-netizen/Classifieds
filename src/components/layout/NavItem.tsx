import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

type Props = {
  to: string
  icon: ComponentType<LucideProps>
  label: string
  exact?: boolean
  onClick?: () => void
  testId?: string
}

export const NavItem = memo(function NavItem({ to, icon: Icon, label, exact, onClick, testId }: Props) {
  const { pathname } = useLocation()
  const isActive = exact ? pathname === to : pathname.startsWith(to)

  return (
    <Link
      to={to}
      onClick={onClick}
      data-testid={testId}
      className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'text-primary-600'
          : 'text-gray-600 hover:text-gray-900'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
      {isActive && (
        <span className="absolute -bottom-[13px] left-1/2 h-0.5 w-3/4 -translate-x-1/2 rounded-full bg-primary-600" />
      )}
    </Link>
  )
})
