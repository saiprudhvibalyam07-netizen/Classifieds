import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { User, MapPin, Calendar, Package, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SEO } from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import type { Listing, Profile } from '../types'
import { format } from 'date-fns'

type SellerInfo = Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'created_at'> & {
  location: string | null
  about: string | null
}

export function SellerProfile() {
  const { id } = useParams<{ id: string }>()
  const [seller, setSeller] = useState<SellerInfo | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchSellerData()
  }, [id])

  async function fetchSellerData() {
    setLoading(true)

    const [profileRes, listingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, location, about')
        .eq('id', id)
        .single(),
      supabase
        .from('listings')
        .select('id, title, price, location, is_featured, created_at, category:categories(name), images:listing_images(url)')
        .eq('user_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (profileRes.data) setSeller(profileRes.data as SellerInfo)
    if (listingsRes.data) {
      setListings(listingsRes.data as unknown as Listing[])
      setActiveCount(listingsRes.data.length)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <>
        <SEO title="Seller Profile" description="View seller profile and their listings on ValClassifieds." />
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gray-200" />
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-gray-200" />
              <div className="h-4 w-32 rounded bg-gray-200" />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
      </>
    )
  }

  if (!seller) {
    return (
      <>
        <SEO title="Seller Not Found" description="The requested seller profile could not be found." />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Seller not found</h1>
        <Link to="/listings" className="mt-4 inline-block text-primary-600 hover:underline">
          Browse listings
        </Link>
      </div>
      </>
    )
  }

  return (
    <>
      <SEO
        title={seller.full_name ?? 'Seller'}
        description={`View ${seller.full_name ?? 'seller'}'s profile and their active listings on ValClassifieds.`}
        url={`/seller/${seller.id}`}
      />
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/listings"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to listings
      </Link>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="bg-gradient-to-r from-primary-700 to-primary-500 p-6 sm:p-8">
          <div className="flex items-center gap-5">
            {seller.avatar_url ? (
              <OptimizedImage
                src={seller.avatar_url}
                alt={seller.full_name ?? ''}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full border-4 border-white/50 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/50 bg-white/20">
                <User className="h-10 w-10 text-white" />
              </div>
            )}
            <div className="text-white">
              <h1 className="text-2xl font-bold">{seller.full_name ?? 'Anonymous Seller'}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {format(new Date(seller.created_at), 'MMMM yyyy')}
                </span>
                {seller.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {seller.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-3">
              <Package className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-2xl font-bold text-primary-700">{activeCount}</p>
                <p className="text-xs text-gray-500">Active listings</p>
              </div>
            </div>
          </div>

          {seller.about && (
            <div className="mt-6">
              <h2 className="mb-2 font-semibold">About</h2>
              <p className="text-gray-700">{seller.about}</p>
            </div>
          )}

          <div className="mt-6">
            <button
              disabled
              className="cursor-not-allowed rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white opacity-70"
              title="Contact feature coming soon"
            >
              Contact Seller
            </button>
          </div>
        </div>
      </div>

      {listings.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-6 text-xl font-bold">More ads from this seller</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listings/${listing.id}`}
                className="group min-w-0 overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-100">
                  {listing.images && listing.images[0] ? (
                    <OptimizedImage
                      src={listing.images[0].url}
                      alt={listing.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">No image</div>
                  )}
                </div>
                <div className="p-4">
                  {listing.is_featured && (
                    <span className="mb-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                      Featured
                    </span>
                  )}
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">{listing.title}</h3>
                  <p className="mt-1 text-lg font-bold text-primary-700">${listing.price.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-gray-500">{listing.location}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {activeCount === 0 && (
        <div className="mt-10 rounded-xl bg-white p-10 text-center shadow-sm">
          <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">This seller has no active listings right now.</p>
        </div>
      )}
    </div>
    </>
  )
}
