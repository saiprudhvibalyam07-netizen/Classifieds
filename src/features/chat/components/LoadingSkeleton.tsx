export function SidebarSkeleton() {
  return (
    <div className="space-y-1 p-4" data-testid="chat-loading-skeleton">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex animate-pulse items-center gap-3 rounded-lg p-3">
          <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-28 rounded bg-gray-200" />
            <div className="h-3 w-40 rounded bg-gray-100" />
          </div>
          <div className="h-3 w-8 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export function MessagesSkeleton() {
  return (
    <div className="space-y-4 px-6 py-4" data-testid="chat-loading-skeleton">
      {[1, 2, 3, 4].map((n) => {
        const isRight = n % 2 === 0
        return (
          <div key={n} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
            <div className={`animate-pulse ${isRight ? 'rounded-l-2xl rounded-tr-2xl' : 'rounded-r-2xl rounded-tl-2xl'} bg-gray-100 px-4 py-3`}
              style={{ width: `${60 + n * 15}px`, height: `${36 + n * 4}px` }}
            />
          </div>
        )
      })}
    </div>
  )
}
