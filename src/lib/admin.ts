import type { Profile } from '../types'

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'admin'
}

export function requireAdmin(profile: Profile | null): {
  allowed: boolean
  reason?: string
} {
  if (!profile) return { allowed: false, reason: 'not_authenticated' }
  if (profile.role !== 'admin') return { allowed: false, reason: 'not_admin' }
  return { allowed: true }
}
