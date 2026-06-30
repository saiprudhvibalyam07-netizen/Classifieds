import { useEffect, useRef } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { chatMutations } from '../api/chatMutations'
import { useChatStore } from '../state/chatStore'

const AWAY_TIMEOUT = 5 * 60 * 1000
const DB_SYNC_INTERVAL = 30 * 1000

export function usePresence() {
  const { user } = useAuth()
  const setPresence = useChatStore((s) => s.setPresence)
  const removePresence = useChatStore((s) => s.removePresence)
  const lastActivityRef = useRef(Date.now())
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    const uid = user.id

    function handleActivity() {
      lastActivityRef.current = Date.now()
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        chatMutations.updatePresence(uid, 'away').catch(() => {})
      } else {
        lastActivityRef.current = Date.now()
        chatMutations.updatePresence(uid, 'online').catch(() => {})
      }
    }

    function handleBeforeUnload() {
      chatMutations.updatePresence(uid, 'offline').catch(() => {})
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, handleActivity))

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    chatMutations.updatePresence(uid, 'online').catch(() => {})

    syncIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      const status = elapsed > AWAY_TIMEOUT ? 'away' : 'online'
      chatMutations.updatePresence(uid, status).catch(() => {})
    }, DB_SYNC_INTERVAL)

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
      removePresence(uid)
    }
  }, [user, setPresence, removePresence])
}
