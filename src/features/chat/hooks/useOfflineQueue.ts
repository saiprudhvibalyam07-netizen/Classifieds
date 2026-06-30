import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { getQueuedActions, removeQueuedAction, incrementRetry, getQueueSize, enqueueAction, type OfflineActionType } from '../utils/offlineQueue'

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error'

export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const processingRef = useRef(false)

  const refreshSize = useCallback(async () => {
    const size = await getQueueSize()
    setQueueSize(size)
  }, [])

  useEffect(() => {
    refreshSize()

    function handleOnline() { setIsOnline(true) }
    function handleOffline() { setIsOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const heartBeat = setInterval(async () => {
      const { error } = await supabase.from('conversations').select('id').limit(1).maybeSingle()
      if (error?.message?.includes('fetch')) setIsOnline(false)
      else setIsOnline(true)
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(heartBeat)
    }
  }, [refreshSize])

  const processQueue = useCallback(async () => {
    if (processingRef.current || !navigator.onLine) return
    processingRef.current = true
    setSyncStatus('syncing')

    try {
      const items = await getQueuedActions()
      if (items.length === 0) {
        setSyncStatus('idle')
        processingRef.current = false
        return
      }

      for (const item of items) {
        try {
          await processAction(item)
          await removeQueuedAction(item.id)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          await incrementRetry(item.id, msg)
        }
      }

      await refreshSize()
      setSyncStatus(items.length > 0 ? 'done' : 'idle')
    } catch {
      setSyncStatus('error')
    } finally {
      processingRef.current = false
    }
  }, [refreshSize])

  useEffect(() => {
    if (isOnline && queueSize > 0) {
      processQueue()
    }
  }, [isOnline, queueSize, processQueue])

  const enqueue = useCallback(async (type: OfflineActionType, payload: Record<string, unknown>) => {
    await enqueueAction(type, payload)
    await refreshSize()
  }, [refreshSize])

  return { queueSize, syncStatus, isOnline, processQueue, enqueue, refreshSize }
}

async function processAction(item: { id: string; type: OfflineActionType; payload: Record<string, unknown> }): Promise<void> {
  switch (item.type) {
    case 'send_message': {
      const payload = { ...item.payload } as Record<string, unknown>
      if (!payload.content) payload.content = null
      if (!payload.type) payload.type = 'text'
      if (!payload.metadata) payload.metadata = {}
      const { error } = await supabase.from('messages').insert(payload)
      if (error) throw error
      break
    }
    case 'edit_message': {
      const { id, ...updates } = item.payload
      const { error } = await supabase.from('messages').update(updates).eq('id', id as string)
      if (error) throw error
      break
    }
    case 'delete_message': {
      const { error } = await supabase.from('messages').delete().eq('id', item.payload.id as string)
      if (error) throw error
      break
    }
    case 'mark_read': {
      const { conversationId, userId } = item.payload as Record<string, string>
      const { data: msgs } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
      if (msgs && msgs.length > 0) {
        const reads = msgs.map((m) => ({ message_id: m.id, profile_id: userId }))
        const { error } = await supabase
          .from('message_reads')
          .upsert(reads, { onConflict: 'message_id,profile_id', ignoreDuplicates: true })
        if (error) throw error
      }
      break
    }
    default:
      break
  }
}
