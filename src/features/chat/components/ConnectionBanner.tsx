import { WifiOff } from 'lucide-react'

export function ConnectionBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700">
      <WifiOff className="h-3.5 w-3.5" />
      No internet connection
    </div>
  )
}
