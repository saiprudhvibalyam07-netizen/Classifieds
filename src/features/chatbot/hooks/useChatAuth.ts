import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import type { ChatbotRole } from '../types'
import { SESSION_STORAGE_KEY } from '../constants'

export function useChatAuth() {
  const { user, profile } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setSessionId(null)
    } else {
      let stored = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!stored) {
        stored = crypto.randomUUID()
        localStorage.setItem(SESSION_STORAGE_KEY, stored)
      }
      setSessionId(stored)
    }
  }, [user])

  function determineRole(): ChatbotRole {
    if (!profile) return 'visitor'
    const roleMap: Record<string, ChatbotRole> = {
      admin: 'admin',
      seller: 'seller',
      buyer: 'buyer',
    }
    return roleMap[profile.role] ?? 'visitor'
  }

  return {
    userId: user?.id ?? null,
    sessionId: sessionId,
    role: determineRole(),
    user,
    profile,
    isAuthenticated: !!user,
  }
}
