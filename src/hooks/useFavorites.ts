import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useFavorites() {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set())
      return
    }
    supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setFavoriteIds(new Set(data.map((f) => f.listing_id)))
      })
  }, [user])

  async function toggle(listingId: string) {
    if (!user) return

    if (favoriteIds.has(listingId)) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
      if (error) return
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        next.delete(listingId)
        return next
      })
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, listing_id: listingId })
      if (error) return
      setFavoriteIds((prev) => new Set(prev).add(listingId))
    }
  }

  return { favoriteIds, toggle }
}
