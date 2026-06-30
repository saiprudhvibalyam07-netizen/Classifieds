import { type FormEvent, useState, useRef, useEffect } from 'react'
import { Send, Loader, Paperclip, Image as ImageIcon, Mic, Smile } from 'lucide-react'

const MAX_LENGTH = 2000
const MIN_HEIGHT = 44

export function MessageComposer({
  onSend,
  sending,
  onUpload,
  onTyping,
}: {
  onSend: (text: string, attachments?: { type: 'image' | 'file'; url: string; name: string; size: number; storage_path: string; mime_type: string }[]) => Promise<void>
  sending: boolean
  onUpload: (file: File) => Promise<{ type: 'image' | 'file'; url: string; name: string; size: number; storage_path: string; mime_type: string } | null>
  onTyping?: () => void
}) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<{ type: 'image' | 'file'; url: string; name: string; size: number; storage_path: string; mime_type: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = `${MIN_HEIGHT}px`
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  useEffect(() => {
    autoResize()
  }, [text])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending || uploading || (!text.trim() && attachments.length === 0)) return
    await onSend(text, attachments.length > 0 ? attachments : undefined)
    setText('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`
    }
  }

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const attachment = await onUpload(file)
      if (attachment) {
        setAttachments((prev) => [...prev, attachment])
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const canSend = (text.trim() || attachments.length > 0) && !sending && !uploading
  const remaining = MAX_LENGTH - text.length

  return (
    <div className="border-t border-gray-200 bg-white">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2">
          {attachments.map((att, i) => (
            <div key={i} className="group relative flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 ring-1 ring-gray-200">
              {att.type === 'image' ? (
                <img src={att.url} alt={att.name} className="h-8 w-8 rounded object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                  <Paperclip className="h-4 w-4 text-gray-500" />
                </div>
              )}
              <span className="max-w-[120px] truncate text-xs text-gray-600">{att.name}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove attachment"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 py-3">
        <div className="flex flex-shrink-0 items-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => imgRef.current?.click()}
            disabled={uploading}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Send image"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg p-2 text-gray-300 transition"
            aria-label="Send emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg p-2 text-gray-300 transition"
            aria-label="Voice message"
          >
            <Mic className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilePick}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilePick}
        />

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= MAX_LENGTH) {
                setText(e.target.value)
                onTyping?.()
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="block w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Message input"
          />
          {text.length > MAX_LENGTH * 0.9 && (
            <span className={`absolute bottom-2 right-3 text-[10px] font-medium ${
              remaining < 20 ? 'text-red-500' : 'text-gray-400'
            }`}>
              {remaining}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSend}
          className="mb-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:bg-primary-600"
          aria-label="Send message"
        >
          {sending || uploading ? (
            <Loader className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>
    </div>
  )
}
