import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import type { ListingImage } from '../types'

type Props = {
  images: ListingImage[]
  initialIndex: number
  onClose: () => void
}

export function FullscreenViewer({ images, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [zoomed, setZoomed] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length)
    setZoomed(false)
  }, [images.length])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length)
    setZoomed(false)
  }, [images.length])

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goNext, goPrev])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX
  }

  function handleTouchEnd() {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 60) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  const image = images[index]

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} of ${images.length}`}
    >
      {/* Close button */}
      <button
        ref={closeRef}
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close viewer"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image counter */}
      <div className="absolute left-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
        Image {index + 1} of {images.length}
      </div>

      {/* Zoom toggle */}
      <button
        onClick={() => setZoomed(!zoomed)}
        className="absolute right-4 top-16 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
      >
        {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
      </button>

      {/* Previous */}
      {images.length > 1 && (
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:left-4"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:right-4"
          aria-label="Next image"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Main image */}
      <div className="flex max-h-[90vh] max-w-[90vw] items-center justify-center overflow-hidden">
        <img
          src={image.url}
          alt={`Image ${index + 1} of ${images.length}`}
          onClick={() => setZoomed(!zoomed)}
          className={`max-h-[90vh] max-w-[90vw] cursor-zoom-in object-contain transition-transform duration-200 ${
            zoomed ? 'scale-150 cursor-zoom-out' : 'scale-100'
          }`}
          draggable={false}
          loading="lazy"
        />
      </div>
    </div>
  )
}
