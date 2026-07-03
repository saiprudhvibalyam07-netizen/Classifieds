import { X } from 'lucide-react'

interface UploadItem {
  id: string
  name: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

type Props = {
  uploads: UploadItem[]
  onDismiss: (id: string) => void
}

export function UploadProgress({ uploads, onDismiss }: Props) {
  if (uploads.length === 0) return null

  const activeUploads = uploads.filter((u) => u.status !== 'done')

  if (activeUploads.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 space-y-1 border-t border-gray-200 bg-white px-4 py-2" data-testid="upload-progress">
      {activeUploads.map((upload) => (
        <div key={upload.id} className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="truncate">{upload.name}</span>
              <span>{upload.progress}%</span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  upload.status === 'error' ? 'bg-red-500' : 'bg-primary-500'
                }`}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          </div>
          {upload.status === 'error' && (
            <button
              onClick={() => onDismiss(upload.id)}
              className="flex-shrink-0 text-red-400 hover:text-red-600"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
