import { useState, useRef } from 'react'
import { Play, Download, Maximize2 } from 'lucide-react'

type Props = {
  src: string
  filename: string
  mimeType: string
  thumbnailUrl?: string | null
  onLoad?: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoBubble({ src, filename, mimeType, thumbnailUrl, onLoad }: Props) {
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  function handlePlay() {
    if (videoRef.current) {
      videoRef.current.play()
      setPlaying(true)
    }
  }

  function handlePause() {
    if (videoRef.current) {
      videoRef.current.pause()
      setPlaying(false)
    }
  }

  function handleLoadedMetadata() {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
    onLoad?.()
  }

  return (
    <div className="group relative max-w-[320px] overflow-hidden rounded-lg bg-black" data-testid="video-bubble">
      {!playing && (
        <div className="relative cursor-pointer" onClick={handlePlay}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={filename}
              className="max-h-64 w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-48 w-64 items-center justify-center bg-gray-900">
              <video
                ref={videoRef}
                src={src}
                className="hidden"
                onLoadedMetadata={handleLoadedMetadata}
                preload="metadata"
              />
              <span className="text-xs text-gray-400">Video</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="ml-0.5 h-6 w-6 text-gray-900" />
            </div>
          </div>
          {duration > 0 && (
            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
              {formatDuration(duration)}
            </div>
          )}
        </div>
      )}
      {playing && (
        <div className="relative">
          <video
            ref={videoRef}
            src={src}
            controls
            autoPlay
            className="max-h-96 w-full"
            onPause={handlePause}
            onEnded={handlePause}
            onLoadedMetadata={handleLoadedMetadata}
          >
            <source src={src} type={mimeType} />
          </video>
        </div>
      )}
      <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
        <a
          href={src}
          download={filename}
          className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          aria-label="Download video"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
        {playing && (
          <button
            onClick={() => videoRef.current?.requestFullscreen()}
            className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
            aria-label="Fullscreen video"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
