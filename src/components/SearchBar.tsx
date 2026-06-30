import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'

export function SearchBar() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const debouncedQuery = useDebounce(input, 300)

  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    if (trimmed) {
      navigate(`/listings?q=${encodeURIComponent(trimmed)}`)
    }
  }, [debouncedQuery, navigate])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      const trimmed = input.trim()
      if (trimmed) {
        navigate(`/listings?q=${encodeURIComponent(trimmed)}`)
      }
    }
  }

  return (
    <div className="relative w-full max-w-2xl">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search by title, description, location..."
        className="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-12 pr-4 text-white placeholder-white/60 backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
    </div>
  )
}
