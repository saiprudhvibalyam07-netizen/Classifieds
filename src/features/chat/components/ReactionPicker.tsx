import { useState, useRef, useEffect } from 'react'
import { SmilePlus } from 'lucide-react'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👎'] as const

type Props = {
  onReact: (emoji: string) => void
  currentReactions?: string[]
  messageId: string
}

export function ReactionPicker({ onReact, currentReactions = [] }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleSelect(emoji: string) {
    onReact(emoji)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative" data-testid="reaction-picker">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full p-1 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
        aria-label="Add reaction"
      >
        <SmilePlus className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2"
          role="toolbar"
          aria-label="Reaction picker"
        >
          <div className="flex gap-1 rounded-full border border-gray-200 bg-white px-2 py-1.5 shadow-lg">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className={`rounded-full p-1.5 text-lg transition hover:bg-gray-100 ${
                  currentReactions.includes(emoji) ? 'bg-primary-50 scale-110' : ''
                }`}
                aria-label={`React with ${emoji}`}
                aria-pressed={currentReactions.includes(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
