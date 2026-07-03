import { FileText, File as FileIcon, Download, Eye } from 'lucide-react'
import { useState } from 'react'

type Props = {
  filename: string
  mimeType: string
  sizeBytes: number
  url: string
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return FileText
  return FileIcon
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toUpperCase() || ''
}

function isPreviewable(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

export function DocumentBubble({ filename, mimeType, sizeBytes, url }: Props) {
  const FileIconComponent = getFileIcon(mimeType)
  const extension = getExtension(filename)
  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <div className="flex min-w-[240px] max-w-[300px] items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm" data-testid="document-bubble">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <FileIconComponent className="h-5 w-5 text-primary-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{filename}</p>
          <p className="text-xs text-gray-500">
            {extension} &middot; {formatSize(sizeBytes)}
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-1">
          {isPreviewable(mimeType) && (
            <button
              onClick={() => setShowPreview(true)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Preview document"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <a
            href={url}
            download={filename}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Download file"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>

      {showPreview && mimeType === 'application/pdf' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPreview(false)}
          role="dialog"
          aria-label="PDF Preview"
        >
          <div className="h-full w-full max-w-4xl overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-medium text-gray-700">{filename}</span>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe
              src={url}
              className="h-[calc(100%-48px)] w-full"
              title={filename}
            />
          </div>
        </div>
      )}
    </>
  )
}
