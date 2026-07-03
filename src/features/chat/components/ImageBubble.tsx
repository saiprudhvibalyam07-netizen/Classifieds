import { useState, useRef, useCallback, useEffect } from 'react'
import { Download, Maximize2 } from 'lucide-react'

type Props = {
  src: string
  alt: string
  width?: number | null
  height?: number | null
  onLoad?: () => void
}

export function ImageBubble({ src, alt, width, height, onLoad }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = alt || 'image'
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }, [src, alt])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setFullscreen(false)
        setZoom(1)
      }
    }
    if (fullscreen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [fullscreen])

  if (error) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
        Failed to load image
      </div>
    )
  }

  return (
    <>
      <div className="group relative max-w-[300px] overflow-hidden rounded-lg" data-testid="image-bubble">
        {!loaded && (
          <div className="flex h-40 w-60 animate-pulse items-center justify-center rounded-lg bg-gray-200">
            <span className="text-xs text-gray-400">Loading...</span>
          </div>
        )}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          className={`cursor-pointer rounded-lg object-cover transition-all hover:brightness-95 ${loaded ? 'block' : 'hidden'}`}
          style={{
            maxHeight: height ? Math.min(height, 400) : 300,
            width: width ? Math.min(width, 300) : 'auto',
          }}
          onLoad={() => { setLoaded(true); onLoad?.() }}
          onError={() => { setError(true); onLoad?.() }}
          onClick={() => setFullscreen(true)}
        />
        <button
          onClick={handleDownload}
          className="absolute right-2 top-2 hidden rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70 group-hover:block"
          aria-label="Download image"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => { setFullscreen(false); setZoom(1) }}
          role="dialog"
          aria-label="Fullscreen image"
        >
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            className="absolute right-6 top-6 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            aria-label="Download image"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            className="absolute right-16 top-6 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            aria-label="Close fullscreen"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.stopPropagation()
              setZoom((z) => Math.max(0.5, Math.min(5, z - e.deltaY * 0.01)))
            }}
          />
        </div>
      )}
    </>
  )
}
