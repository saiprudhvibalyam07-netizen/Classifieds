import { X } from 'lucide-react'
import { useChatStore } from '../state/chatStore'

export function ToastContainer() {
  const toasts = useChatStore((s) => s.toasts)
  const removeToast = useChatStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-white'
          }`}
        >
          <p className="text-sm">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} aria-label="Dismiss" className="flex-shrink-0 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
