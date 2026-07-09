import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { Heart, Search, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'
import { SEO, SITE_URL } from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import type { Category, Listing } from '../types'

const PAGE_SIZE = 12

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export function Listings() {
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [listings, setListings] = useState<Listing[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const { user } = useAuth()
  const { favoriteIds, toggle } = useFavorites()
  const citiesCache = useRef<{ data: string[]; timestamp: number } | null>(null)

  const query = searchParams.get('q') ?? ''
  const categorySlug = searchParams.get('category') ?? ''
  const location = searchParams.get('location') ?? ''
  const minPrice = searchParams.get('minPrice') ?? ''
  const maxPrice = searchParams.get('maxPrice') ?? ''
  const condition = searchParams.get('condition') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const page = parseInt(searchParams.get('page') ?? '1')

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  useEffect(() => {
    const cached = citiesCache.current
    if (cached && Date.now() - cached.timestamp < 300_000) {
      setCities(cached.data)
      return
    }
    supabase
      .from('listings')
      .select('city')
      .eq('status', 'active')
      .not('city', 'is', null)
      .order('city')
      .limit(1000)
      .then(({ data }) => {
        if (data) {
          const normalized: string[] = [
            ...new Set(
              data
                .map((r) => r.city?.trim())
                .filter((c): c is string => c !== undefined && c !== null && c.length > 0)
            ),
          ].sort((a, b) => a.localeCompare(b))
          setCities(normalized)
          citiesCache.current = { data: normalized, timestamp: Date.now() }
          if (location && !normalized.includes(location)) {
            const next = new URLSearchParams(searchParams)
            next.delete('location')
            if (next.toString() !== searchParams.toString()) {
              setSearchParams(next, { replace: true })
            }
          }
        }
      })
  }, [])

  useEffect(() => {
    if (categorySlug && categories.length === 0) return
    fetchListings()
  }, [query, categorySlug, location, minPrice, maxPrice, condition, sort, page, categories])

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (key !== 'page') params.set('page', '1')
    setSearchParams(params)
  }

  async function fetchListings() {
    setLoading(true)
    setError(null)

    try {
      let queryBuilder = supabase
        .from('listings')
        .select('*, category:categories(*), images:listing_images(*)', { count: 'exact' })
        .eq('status', 'active')

      if (query) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`
        )
      }

      if (categorySlug) {
        const cat = categories.find((c) => c.slug === categorySlug)
        if (cat) queryBuilder = queryBuilder.eq('category_id', cat.id)
      }

      if (location) {
        queryBuilder = queryBuilder.eq('city', location)
      }

      if (minPrice) queryBuilder = queryBuilder.gte('price', parseFloat(minPrice))
      if (maxPrice) queryBuilder = queryBuilder.lte('price', parseFloat(maxPrice))
      if (condition) queryBuilder = queryBuilder.eq('condition', condition)

      switch (sort) {
        case 'price_asc':
          queryBuilder = queryBuilder.order('price', { ascending: true })
          break
        case 'price_desc':
          queryBuilder = queryBuilder.order('price', { ascending: false })
          break
        default:
          queryBuilder = queryBuilder.order('is_featured', { ascending: false })
          queryBuilder = queryBuilder.order('created_at', { ascending: false })
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      queryBuilder = queryBuilder.range(from, to)

      const { data, count } = await queryBuilder
      if (data) setListings(data as Listing[])
      if (count !== null) setTotal(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <SEO
        title="Browse Listings"
        description="Browse hundreds of classified listings for property, vehicles, jobs, electronics, and more in India."
        url="/listings"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Browse Listings - ValClassifieds',
            description: 'Browse hundreds of classified listings across all categories.',
            url: `${SITE_URL}/listings`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Browse Listings - ValClassifieds',
            description: 'Browse hundreds of classified listings across all categories.',
            url: `${SITE_URL}/listings`,
          },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold">Browse Listings</h1>

      {/* Search bar */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search listings..."
            data-testid="listings-search-input"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Search listings"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
            showFilters ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-700'
          }`}
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm" role="region" aria-label="Filters">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="filter-category" className="mb-1 block text-xs font-medium text-gray-600">Category</label>
              <select
                id="filter-category"
                value={categorySlug}
                onChange={(e) => setParam('category', e.target.value)}
                data-testid="listings-category-select"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-location" className="mb-1 block text-xs font-medium text-gray-600">Location</label>
              <select
                id="filter-location"
                value={location}
                onChange={(e) => setParam('location', e.target.value)}
                data-testid="listings-city-select"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All Locations</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-condition" className="mb-1 block text-xs font-medium text-gray-600">Condition</label>
              <select
                id="filter-condition"
                value={condition}
                onChange={(e) => setParam('condition', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-min-price" className="mb-1 block text-xs font-medium text-gray-600">Min Price</label>
              <input
                id="filter-min-price"
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setParam('minPrice', e.target.value)}
                placeholder="$0"
                data-testid="listings-price-min"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="filter-max-price" className="mb-1 block text-xs font-medium text-gray-600">Max Price</label>
              <input
                id="filter-max-price"
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setParam('maxPrice', e.target.value)}
                placeholder="$99999"
                data-testid="listings-price-max"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sort & results info */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">{total} listing{total !== 1 ? 's' : ''} found</p>
        <select
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          aria-label="Sort listings"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Listings grid */}
      {loading ? (
        <div className="flex justify-center py-20" data-testid="listings-loading-skeleton">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-500">{error}</p>
      ) : listings.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500" data-testid="listings-empty-state">
          No listings match your criteria. Try adjusting your filters.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <div key={listing.id} className="group relative min-w-0 overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md" data-testid="listing-card">
              <Link to={`/listings/${listing.id}`} className="flex flex-1 flex-col">
                <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-100">
                  {listing.images && listing.images[0] ? (
                    <OptimizedImage src={listing.images[0].url} alt={listing.title} data-testid="listing-card-image" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">No image</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {listing.is_featured && (
                    <span className="mb-2 inline-block self-start rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">Featured</span>
                  )}
                  <h3 className="line-clamp-2 font-semibold text-gray-900 group-hover:text-primary-600" data-testid="listing-card-title">
                    {listing.title}
                  </h3>
                  <p className="mt-1 text-lg font-bold text-primary-700" data-testid="listing-card-price">
                    ${listing.price.toLocaleString()}
                  </p>
                  <div className="mt-auto pt-2">
                    {listing.location && (
                      <p className="text-sm text-gray-500" data-testid="listing-card-location">{listing.location}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatTimeAgo(listing.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
              {user && (
                <button
                  onClick={() => toggle(listing.id)}
                  className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label={favoriteIds.has(listing.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`h-5 w-5 ${favoriteIds.has(listing.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <>
          {page > 1 && <link rel="prev" href={`${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) })}`} />}
          {page < totalPages && <link rel="next" href={`${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) })}`} />}
          <nav className="mt-8 flex justify-center gap-2" aria-label="Pagination" data-testid="listings-pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setParam('page', String(p))}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  p === page ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label={`Page ${p}${p === page ? ', current page' : ''}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
    </>
  )
}
