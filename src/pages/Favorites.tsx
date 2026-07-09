import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'
import { SEO } from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import type { Listing } from '../types'

export function Favorites() {
  const { user } = useAuth()
  const { favoriteIds, toggle } = useFavorites()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || favoriteIds.size === 0) {
      setListings([])
      setLoading(false)
      return
    }
    supabase
      .from('listings')
      .select('*, category:categories(*), images:listing_images(*)')
      .in('id', Array.from(favoriteIds))
      .then(({ data }) => {
        if (data) setListings(data)
        setLoading(false)
      })
  }, [user, favoriteIds])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <SEO title="My Favorites" description="View your saved favorite listings on ValClassifieds." url="/favorites" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold">My Favorites</h1>

      {listings.length === 0 ? (
        <p className="text-gray-500">
          You haven't saved any favorites yet.{' '}
          <Link to="/listings" className="text-primary-600 hover:underline">
            Browse listings
          </Link>
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <div key={listing.id} className="group relative min-w-0 overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md">
              <Link to={`/listings/${listing.id}`}>
                <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-100">
                  {listing.images && listing.images[0] ? (
                    <OptimizedImage src={listing.images[0].url} alt={listing.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">{listing.title}</h3>
                  <p className="mt-1 text-lg font-bold text-primary-700">${listing.price.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-gray-500">{listing.location}</p>
                </div>
              </Link>
              <button
                onClick={() => toggle(listing.id)}
                className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow transition hover:scale-110"
              >
                <Heart className="h-5 w-5 fill-red-500 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
