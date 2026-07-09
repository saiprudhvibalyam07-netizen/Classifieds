import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Heart, MapPin, Calendar, Eye, User, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'
import { ImageGallery } from '../components/ImageGallery'
import { ListingMap } from '../components/ListingMap'
import { SEO, BreadcrumbListJsonLd, SITE_URL } from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import type { Listing } from '../types'
import { format } from 'date-fns'

export function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { favoriteIds, toggle } = useFavorites()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (id) fetchListing()
    return () => { mountedRef.current = false }
  }, [id])

  async function fetchListing() {
    const { data, error } = await supabase
      .from('listings')
      .select('*, category:categories(*), profile:profiles(*), images:listing_images(*)')
      .eq('id', id)
      .single()

    if (!mountedRef.current) return

    if (error) {
      setLoading(false)
      return
    }

    if (data) {
      setListing(data)
      supabase
        .from('listings')
        .update({ views_count: (data.views_count ?? 0) + 1 })
        .eq('id', id)
        .then(undefined, () => {})
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <>
        <SEO title="Loading..." description="Loading listing details..." />
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </>
    )
  }

  if (!listing) {
    return (
      <>
        <SEO title="Listing Not Found" description="The requested listing could not be found." />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Listing not found</h1>
          <Link to="/listings" className="mt-4 inline-block text-primary-600 hover:underline">
            Back to listings
          </Link>
        </div>
      </>
    )
  }

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description?.slice(0, 200),
    image: listing.images?.[0]?.url || undefined,
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      itemCondition: listing.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    },
  }

  return (
    <>
      <SEO
        title={listing.title}
        description={listing.description?.slice(0, 160) || `View ${listing.title} for $${listing.price.toLocaleString()}`}
        image={listing.images?.[0]?.url || undefined}
        url={`/listings/${listing.id}`}
        type="website"
        jsonLd={[
          productSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${listing.title} - ValClassifieds`,
            description: listing.description?.slice(0, 160) || `View ${listing.title} for $${listing.price.toLocaleString()}`,
            url: `${SITE_URL}/listings/${listing.id}`,
          },
        ]}
      />
      <BreadcrumbListJsonLd items={[
        { name: 'Home', url: '/' },
        { name: 'Browse Listings', url: '/listings' },
        { name: listing.title, url: `/listings/${listing.id}` },
      ]} />
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/listings"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to listings
      </Link>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <div data-testid="listing-detail-gallery">
            <ImageGallery images={listing.images} title={listing.title} />
          </div>

          {listing.latitude && listing.longitude && (
            <ListingMap
              latitude={listing.latitude}
              longitude={listing.longitude}
              title={listing.title}
              address={listing.address ?? listing.city ?? listing.location ?? null}
            />
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              {listing.is_featured && (
                <span className="mb-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                  Featured
                </span>
              )}
              <h1 className="text-2xl font-bold" data-testid="listing-detail-title">{listing.title}</h1>
            </div>
            {user && (
              <button
                onClick={() => toggle(listing.id)}
                className="rounded-full p-2 transition hover:bg-gray-100"
                data-testid="listing-favorite-button"
              >
                <Heart className={`h-6 w-6 ${favoriteIds.has(listing.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            )}
          </div>

          <p className="mt-2 text-3xl font-bold text-primary-700" data-testid="listing-detail-price">
            ${listing.price.toLocaleString()}
          </p>

          <div className="mt-4 space-y-2 text-sm text-gray-600">
                {listing.city && (
              <div className="flex items-center gap-2" data-testid="listing-detail-location">
                <MapPin className="h-4 w-4" />
                {listing.city}{listing.state ? `, ${listing.state}` : ''}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Posted {format(new Date(listing.created_at), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {listing.views_count} views
            </div>
            {listing.condition && (
              <p>
                <span className="font-medium">Condition:</span>{' '}
                {listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)}
              </p>
            )}
            {listing.category && (
              <p data-testid="listing-detail-category">
                <span className="font-medium">Category:</span> {listing.category.name}
              </p>
            )}
          </div>

          <div className="mt-6">
            <h2 className="mb-2 font-semibold">Description</h2>
              <p className="whitespace-pre-wrap text-gray-700" data-testid="listing-detail-description">
                {listing.description}
              </p>
          </div>

          {listing.profile && (
            <Link
              to={`/seller/${listing.profile.id}`}
              className="mt-6 flex items-center gap-3 rounded-lg bg-gray-50 p-4 transition hover:bg-gray-100"
            >
              {listing.profile.avatar_url ? (
                <OptimizedImage src={listing.profile.avatar_url} alt={listing.profile.full_name || 'Seller'} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Seller</p>
                <p className="font-medium hover:text-primary-600">{listing.profile.full_name}</p>
              </div>
            </Link>
          )}

          {user && listing.profile && user.id !== listing.user_id && (
            <Link
              to={`/messages?new=true&listing=${listing.id}&seller=${listing.user_id}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
              data-testid="listing-contact-seller"
            >
              <MessageSquare className="h-4 w-4" />
              Chat with Seller
            </Link>
          )}

          {user && listing.profile && user.id === listing.user_id && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
              This is your own listing
            </div>
          )}

          {listing.status === 'pending' && user?.id === listing.user_id && (
            <div className="mt-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              This listing is pending admin approval. It will be visible to others once approved.
            </div>
          )}

          {user?.id === listing.user_id && (
            <div className="mt-6 flex gap-3">
              <Link
                to={`/edit/${listing.id}`}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                data-testid="listing-edit-button"
              >
                Edit Listing
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
