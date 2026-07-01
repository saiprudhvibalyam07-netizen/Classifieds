import { useCallback, useEffect, useRef } from 'react'
import { useChatStore } from '../state/chatStore'
import type { Toast } from '../types'

const AUTO_DISMISS_MS = 4000

export function useToast() {
  const toasts = useChatStore((s) => s.toasts)
  const addToast = useChatStore((s) => s.addToast)
  const removeToast = useChatStore((s) => s.removeToast)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
      timersRef.current.clear()
    }
  }, [])

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    addToast({ ...toast, id })
    const timer = setTimeout(() => {
      removeToast(id)
      timersRef.current.delete(id)
    }, AUTO_DISMISS_MS)
    timersRef.current.set(id, timer)
  }, [addToast, removeToast])

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    removeToast(id)
  }, [removeToast])

  return { toasts, show, dismiss }
}
