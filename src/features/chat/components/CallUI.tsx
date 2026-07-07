import { useEffect } from 'react'
import { Phone, Video, PhoneOff } from 'lucide-react'

type CallType = 'voice' | 'video'
type CallState = 'incoming' | 'calling' | 'ongoing' | 'missed' | 'declined' | 'ended'

type Props = {
  callType: CallType
  callState: CallState
  callerName: string
  callerAvatar?: string | null
  duration?: number
  onAccept?: () => void
  onDecline?: () => void
  onEnd?: () => void
  onDismiss?: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function CallUI({ callType, callState, callerName, callerAvatar, duration, onAccept, onDecline, onEnd, onDismiss }: Props) {
  useEffect(() => {
    if (callState === 'ended' || callState === 'missed' || callState === 'declined') {
      const timer = setTimeout(() => onDismiss?.(), 3000)
      return () => clearTimeout(timer)
    }
  }, [callState, onDismiss])

  if (callState === 'ended' || callState === 'missed' || callState === 'declined') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" data-testid="call-ui-ended">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          {callState === 'missed' && <p className="text-sm font-medium text-red-500">Missed {callType === 'voice' ? 'call' : 'video call'}</p>}
          {callState === 'declined' && <p className="text-sm font-medium text-orange-500">Call declined</p>}
          {callState === 'ended' && (
            <>
              <p className="text-sm font-medium text-gray-500">Call ended</p>
              {duration !== undefined && <p className="mt-1 text-lg font-semibold text-gray-900">{formatDuration(duration)}</p>}
            </>
          )}
          <button onClick={onDismiss} className="mt-4 text-xs text-gray-400 underline hover:text-gray-600">
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800" data-testid="call-ui">
      <div className="flex flex-col items-center gap-6 px-8">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-700">
          {callerAvatar ? (
            <img src={callerAvatar} alt={callerName} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Phone className="h-10 w-10 text-gray-400" />
          )}
        </div>

        <div className="text-center">
          <p className="text-xl font-semibold text-white">{callerName}</p>
          <p className="mt-1 text-sm text-gray-400">
            {callState === 'incoming' ? `Incoming ${callType === 'video' ? 'video' : 'voice'} call...` : callState === 'calling' ? 'Calling...' : callState === 'ongoing' ? (duration ? formatDuration(duration) : 'Connecting...') : ''}
          </p>
        </div>

        <div className="flex items-center gap-6">
          {(callState === 'incoming') && (
            <>
              <button onClick={onDecline} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600" aria-label="Decline call">
                <PhoneOff className="h-6 w-6" />
              </button>
              <button onClick={onAccept} className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600" aria-label="Accept call">
                {callType === 'video' ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
              </button>
            </>
          )}
          {(callState === 'calling' || callState === 'ongoing') && (
            <button onClick={onEnd} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600" aria-label="End call">
              <PhoneOff className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
