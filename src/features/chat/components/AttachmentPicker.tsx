import { useRef } from 'react'
import { Paperclip, Camera, Mic } from 'lucide-react'

type Props = {
  onSelectFiles: (files: FileList) => void
  onRecordVoice?: () => void
  disabled?: boolean
}

export function AttachmentPicker({ onSelectFiles, onRecordVoice, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) onSelectFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-1" data-testid="attachment-picker">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
        aria-label="Attach file"
        data-testid="attach-file-button"
      >
        <Paperclip className="h-5 w-5" />
      </button>
      <button
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
        aria-label="Take photo"
        data-testid="attach-camera-button"
      >
        <Camera className="h-5 w-5" />
      </button>
      <button
        onClick={onRecordVoice}
        disabled={disabled}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
        aria-label="Record voice"
        data-testid="attach-voice-button"
      >
        <Mic className="h-5 w-5" />
      </button>
    </div>
  )
}
