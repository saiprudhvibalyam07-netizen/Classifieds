"use client"

import type { UserProfile } from '../types'

interface AuthContext {
  user: { id: string } | null
  profile: UserProfile | null
  sessionId: string | null
}

function getAuthContext(): AuthContext {
  let user = null
  let profile = null
  let sessionId = null

  try {
    const stored = localStorage.getItem('auth.user')
    if (stored) {
      const parsed = JSON.parse(stored)
      user = parsed
    }

    const storedProfile = localStorage.getItem('auth.profile')
    if (storedProfile) {
      const parsedProfile = JSON.parse(storedProfile)
      profile = parsedProfile
    }

    const storedSessionId = localStorage.getItem('auth.sessionId')
    if (storedSessionId) {
      sessionId = storedSessionId
    }
  } catch (error) {
    console.error('Failed to parse auth storage:', error)
  }

  return { user, profile, sessionId }
}

export { getAuthContext }