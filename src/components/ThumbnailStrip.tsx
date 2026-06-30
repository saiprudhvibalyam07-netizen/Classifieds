import type { ListingImage } from '../types'

type Props = {
  images: ListingImage[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function ThumbnailStrip({ images, selectedIndex, onSelect }: Props) {
  if (images.length <= 1) return null

  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {images.map((img, i) => (
        <button
          key={img.id}
          onClick={() => onSelect(i)}
          className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
            i === selectedIndex
              ? 'border-primary-600 ring-1 ring-primary-300'
              : 'border-transparent opacity-70 hover:opacity-100'
          }`}
          aria-label={`View image ${i + 1}`}
          aria-current={i === selectedIndex ? 'true' : undefined}
        >
          <img
            src={img.url}
            alt={`Thumbnail ${i + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  )
}
