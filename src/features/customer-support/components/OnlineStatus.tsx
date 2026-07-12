interface OnlineStatusProps {
  online?: boolean
  label?: string
}

export function OnlineStatus({ online = true, label }: OnlineStatusProps) {
  const text = label ?? (online ? 'Online' : 'Offline')
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${online ? 'bg-green-400' : 'bg-gray-300'}`}
        aria-hidden="true"
      />
      <span className="text-xs text-white/80">{text}</span>
    </div>
  )
}
