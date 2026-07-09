import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit, Trash2, PlusCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { SEO } from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import type { Listing } from '../types'

export function Dashboard() {
  const { user } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchListings()
  }, [user])

  async function fetchListings() {
    if (!user) return
    const { data } = await supabase
      .from('listings')
      .select('id, title, price, views_count, status, images:listing_images(url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (data) setListings(data as unknown as Listing[])
    setLoading(false)
  }

  async function deleteListing(id: string) {
    if (!confirm('Delete this listing?')) return
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) return
    setListings((prev) => prev.filter((l) => l.id !== id))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <SEO title="My Dashboard" description="Manage your classified listings on ValClassifieds." url="/dashboard" />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <Link
          to="/create"
          className="flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <PlusCircle className="h-4 w-4" />
          New Listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="text-gray-500">
          You haven't posted any listings yet.{' '}
          <Link to="/create" className="text-primary-600 hover:underline">
            Create your first listing
          </Link>
        </p>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex min-w-0 items-center gap-4 overflow-hidden rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {listing.images && listing.images[0] ? (
                  <OptimizedImage
                    src={listing.images[0].url}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    No img
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/listings/${listing.id}`}
                  className="font-medium hover:text-primary-600"
                >
                  {listing.title}
                </Link>
                <p className="text-sm text-gray-500">
                  ${listing.price.toLocaleString()} &middot; {listing.views_count} views
                </p>
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  listing.status === 'active' ? 'bg-green-100 text-green-800' :
                  listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  listing.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {listing.status}
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/edit/${listing.id}`}
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => deleteListing(listing.id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
