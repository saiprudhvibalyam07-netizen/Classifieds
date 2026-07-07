import { useState } from 'react'

type Props = {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  decoding?: 'sync' | 'async' | 'auto'
  fallback?: string
  'data-testid'?: string
  onLoad?: () => void
  onError?: () => void
}

function getSupabaseWebpUrl(originalUrl: string, width?: number): string | null {
  try {
    const url = new URL(originalUrl)
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(public|authenticated)\/(.+)/)
    if (!pathMatch) return null
    const visibility = pathMatch[1]
    const bucketPath = pathMatch[2]
    const renderUrl = new URL(url.origin)
    renderUrl.pathname = `/storage/v1/render/image/${visibility}/${bucketPath}`
    if (width) renderUrl.searchParams.set('width', String(width))
    renderUrl.searchParams.set('format', 'webp')
    renderUrl.searchParams.set('quality', '80')
    return renderUrl.toString()
  } catch {
    return null
  }
}

export function OptimizedImage({ src, alt, className, width, height, loading = 'lazy', decoding = 'async', fallback, 'data-testid': testId, onLoad, onError }: Props) {
  const [imgError, setImgError] = useState(false)

  if (imgError && fallback) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className ?? ''}`}>
        <span className="text-sm text-gray-400">{fallback}</span>
      </div>
    )
  }

  const webpUrl = getSupabaseWebpUrl(src, width ? Math.min(width, 800) : undefined)
  const webpUrl2x = width ? getSupabaseWebpUrl(src, width * 2) : null

  return (
    <picture>
      {webpUrl && (
        <>
          <source srcSet={webpUrl2x ? `${webpUrl} 1x, ${webpUrl2x} 2x` : webpUrl} type="image/webp" />
          <source srcSet={src} type={undefined} />
        </>
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        className={className}
        data-testid={testId}
        onLoad={onLoad}
        onError={() => { setImgError(true); onError?.() }}
      />
    </picture>
  )
}
