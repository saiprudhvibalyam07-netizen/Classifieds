import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Download } from 'lucide-react'

type Props = {
  src: string
  duration?: number | null
  onLoad?: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VoiceNoteBubble({ src, duration: propDuration, onLoad }: Props) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(propDuration || 0)
  const [waveform] = useState(() => generateWaveform())
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [playbackRate, setPlaybackRate] = useState(1)

  function generateWaveform(): number[] {
    return Array.from({ length: 40 }, () => Math.random() * 100)
  }

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }, [playing])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    function handleTimeUpdate() {
      setCurrentTime(el!.currentTime)
    }

    function handleLoadedMetadata() {
      setDuration(el!.duration)
      onLoad?.()
    }

    function handleEnded() {
      setPlaying(false)
      setCurrentTime(0)
    }

    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('loadedmetadata', handleLoadedMetadata)
    el.addEventListener('ended', handleEnded)

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('loadedmetadata', handleLoadedMetadata)
      el.removeEventListener('ended', handleEnded)
    }
  }, [onLoad])

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressRef.current || !audioRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = x * duration
  }

  function cyclePlaybackRate() {
    const rates = [1, 1.5, 2, 0.5]
    const idx = (rates.indexOf(playbackRate) + 1) % rates.length
    setPlaybackRate(rates[idx])
    if (audioRef.current) {
      audioRef.current.playbackRate = rates[idx]
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex min-w-[220px] max-w-[280px] items-center gap-2 rounded-lg bg-primary-50 p-2" data-testid="voice-note-bubble">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div
          ref={progressRef}
          className="relative h-8 cursor-pointer"
          onClick={handleSeek}
          role="slider"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
        >
          <div className="flex h-full items-end gap-0.5">
            {waveform.map((h, i) => {
              const isPlayed = (i / waveform.length) * 100 <= progress
              return (
                <div
                  key={i}
                  className="w-1 rounded-t"
                  style={{
                    height: `${(h / 100) * 32}px`,
                    backgroundColor: isPlayed ? '#1a3f6a' : '#93c5fd',
                    opacity: isPlayed ? 0.8 : 0.4,
                    transition: 'background-color 0.1s',
                  }}
                />
              )
            })}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500">
            {formatTime(currentTime)} / {duration ? formatTime(duration) : '--:--'}
          </span>
          <button
            onClick={cyclePlaybackRate}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-primary-600 hover:bg-primary-100"
            aria-label="Playback speed"
          >
            {playbackRate}x
          </button>
        </div>
      </div>

      <a
        href={src}
        download="voice-note"
        className="flex-shrink-0 rounded p-1.5 text-gray-400 hover:bg-primary-100 hover:text-gray-600"
        aria-label="Download voice note"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}
