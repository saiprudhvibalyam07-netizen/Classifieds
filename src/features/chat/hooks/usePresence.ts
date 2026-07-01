import { useEffect, useRef } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { useChatStore } from '../state/chatStore'

const AWAY_TIMEOUT = 5 * 60 * 1000
const DB_SYNC_INTERVAL = 30 * 1000

async function upsertPresence(userId: string, status: string) {
  const { error } = await supabase
    .from('user_presence')
    .upsert({ user_id: userId, status, last_seen_at: new Date().toISOString() })
  if (error && !error.message.includes('does not exist')) {
    throw new Error(error.message)
  }
}

export function usePresence() {
  const { user } = useAuth()
  const setPresence = useChatStore((s) => s.setPresence)
  const removePresence = useChatStore((s) => s.removePresence)
  const lastActivityRef = useRef(Date.now())
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return

    const uid = user.id
    let accessToken = ''

    supabase.auth.getSession().then(({ data }) => {
      accessToken = data.session?.access_token ?? ''
    })

    function handleActivity() {
      lastActivityRef.current = Date.now()
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        upsertPresence(uid, 'away')
      } else {
        lastActivityRef.current = Date.now()
        upsertPresence(uid, 'online')
      }
    }

    function handleBeforeUnload() {
      const supaUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const body = JSON.stringify({
        user_id: uid,
        status: 'offline',
        last_seen_at: new Date().toISOString(),
      })
      fetch(`${supaUrl}/rest/v1/user_presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          Prefer: 'resolution=merge-duplicates',
        },
        body,
        keepalive: true,
      })
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, handleActivity))

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    upsertPresence(uid, 'online')

    syncIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      const status = elapsed > AWAY_TIMEOUT ? 'away' : 'online'
      upsertPresence(uid, status)
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
