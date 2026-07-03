import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'

type SearchResult = {
  messageId: string
  content: string
  createdAt: string
}

type Props = {
  onSearch: (query: string) => Promise<SearchResult[]>
  onJumpTo: (messageId: string) => void
  onClose: () => void
}

export function ConversationSearch({ onSearch, onJumpTo, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await onSearch(q.trim())
      setResults(res)
      setSelectedIndex(0)
    } finally {
      setSearching(false)
    }
  }, [onSearch])

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (results.length > 0) {
        onJumpTo(results[selectedIndex].messageId)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-2" data-testid="conversation-search">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="flex-1 text-sm outline-none placeholder:text-gray-400"
          aria-label="Search messages"
        />
        {searching && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        )}
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }} className="text-gray-400 hover:text-gray-600" aria-label="Clear search">
            <X className="h-4 w-4" />
          </button>
        )}
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close search">
          <X className="h-4 w-4" />
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIndex((i) => Math.max(i - 1, 0))}
              disabled={selectedIndex === 0}
              className="disabled:opacity-30"
              aria-label="Previous result"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <span>
              {selectedIndex + 1}/{results.length}
            </span>
            <button
              onClick={() => setSelectedIndex((i) => Math.min(i + 1, results.length - 1))}
              disabled={selectedIndex === results.length - 1}
              className="disabled:opacity-30"
              aria-label="Next result"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
