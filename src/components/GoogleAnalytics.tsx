import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

type Gtag = (
  command: 'event',
  eventName: 'page_view',
  parameters: {
    page_title: string
    page_path: string
    page_location: string
  }
) => void

export function GoogleAnalytics() {
  const { pathname } = useLocation()
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    // The global config tag already sends the initial page_view.
    if (lastTrackedPath.current === null) {
      lastTrackedPath.current = pathname
      return
    }

    if (lastTrackedPath.current === pathname) return
    lastTrackedPath.current = pathname

    const gtag = (window as Window & { gtag?: Gtag }).gtag
    if (typeof gtag !== 'function') return

    // Exclude query strings and hashes, which may contain user-entered values.
    gtag('event', 'page_view', {
      page_title: 'ValClassifieds',
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}`,
    })
  }, [pathname])

  return null
}
