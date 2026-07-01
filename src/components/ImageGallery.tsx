import { useState } from 'react'
import { Image } from 'lucide-react'
import type { ListingImage } from '../types'
import { ThumbnailStrip } from './ThumbnailStrip'
import { FullscreenViewer } from './FullscreenViewer'

type Props = {
  images: ListingImage[] | undefined
  title: string
}

export function ImageGallery({ images, title }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-gray-100">
        <div className="text-center text-gray-400">
          <Image className="mx-auto mb-2 h-10 w-10" />
          <p className="text-sm">No images available</p>
        </div>
      </div>
    )
  }

  const safeIndex = Math.min(selectedIndex, images.length - 1)
  const currentImage = images[safeIndex]

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-gray-100">
        <div className="relative aspect-[4/3]">
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-gray-200" />
          )}
          <button
            onClick={() => setFullscreen(true)}
            className="h-full w-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            aria-label="Open fullscreen viewer"
          >
            <img
              key={currentImage.url}
              src={currentImage.url}
              alt={`${title} - Image ${safeIndex + 1}`}
              onLoad={() => setLoaded(true)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
            />
          </button>

          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-0.5 text-xs text-white">
              {safeIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      <ThumbnailStrip
        images={images}
        selectedIndex={safeIndex}
        onSelect={setSelectedIndex}
      />

      {fullscreen && (
        <FullscreenViewer
          images={images}
          initialIndex={safeIndex}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  )
}
