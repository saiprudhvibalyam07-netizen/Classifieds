import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal, List, LayoutGrid, Building2, MapPin, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SEO, BreadcrumbListJsonLd, SITE_URL } from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import type { Category, Listing } from '../types'
import { categories } from '../data/categories'
import { categoryFilterConfigs, type FilterDef } from '../data/categoryFilters'

const defaultFilters: Record<string, FilterDef[]> = {
  property: [
    { key: 'condition', label: 'Condition', type: 'select', options: [{ value: 'new', label: 'New' }, { value: 'used', label: 'Used' }] },
  ],
  vehicles: [
    { key: 'condition', label: 'Condition', type: 'select', options: [{ value: 'new', label: 'New' }, { value: 'used', label: 'Used' }] },
  ],
}

const sortOptions = [
  { value: 'created_at_desc', label: 'Newest First' },
  { value: 'created_at_asc', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const staticCat = categories.find((c) => c.slug === slug)
  const filterConfig = slug ? categoryFilterConfigs[slug] : undefined

  const [category, setCategory] = useState<Category | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [featured, setFeatured] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('created_at_desc')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    setLoading(true)
    setListings([])
    setFeatured([])

    supabase.from('categories').select('*').eq('slug', slug).single()
      .then(({ data }) => {
        if (cancelled) return
        if (!data) { setLoading(false); return }

        const cat = data as Category
        setCategory(cat)

        let query = supabase
          .from('listings')
          .select('*, category:categories(*), images:listing_images(*)')
          .eq('status', 'active')
          .eq('category_id', cat.id)

        Object.entries(activeFilters).forEach(([key, val]) => {
          if (key === 'price' && val) {
            if (val.endsWith('+')) {
              const min = parseInt(val)
              query = query.gte('price', min)
            } else {
              const [min, max] = val.split('-').map(Number)
              if (!isNaN(min)) query = query.gte('price', min)
              if (!isNaN(max)) query = query.lte('price', max)
            }
          } else if (val) {
            query = query.eq(key, val)
          }
        })

        if (sort === 'price_asc') query = query.order('price', { ascending: true })
        else if (sort === 'price_desc') query = query.order('price', { ascending: false })
        else if (sort === 'created_at_asc') query = query.order('created_at', { ascending: true })
        else query = query.order('created_at', { ascending: false })

        Promise.all([
          query.limit(50),
          supabase.from('listings')
            .select('*, category:categories(*), images:listing_images(*)')
            .eq('status', 'active')
            .eq('is_featured', true)
            .eq('category_id', cat.id)
            .order('created_at', { ascending: false })
            .limit(6),
        ]).then(([listRes, featRes]) => {
          if (cancelled) return
          if (listRes.data) setListings(listRes.data as Listing[])
          if (featRes.data) setFeatured(featRes.data as Listing[])
          setLoading(false)
        })
      })

    return () => { cancelled = true }
  }, [slug, sort, activeFilters])

  if (!slug || !staticCat) {
    return (
      <>
        <SEO title="Category Not Found" description="The requested category could not be found on ValClassifieds." />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Category Not Found</h1>
          <Link to="/" className="text-primary-600 hover:text-primary-700">Back to Home</Link>
        </div>
      </>
    )
  }

  const Icon = staticCat.icon
  const filters = filterConfig?.filters || defaultFilters[slug] || []
  const description = category?.description || staticCat.description

  return (
    <>
      <SEO
        title={staticCat.name}
        description={description || `Browse ${staticCat.name} classified listings on ValClassifieds.`}
        url={`/category/${slug}`}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${staticCat.name} - ValClassifieds`,
            description: description || `Browse ${staticCat.name} classified listings.`,
            url: `${SITE_URL}/category/${slug}`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${staticCat.name} - ValClassifieds`,
            description: description || `Browse ${staticCat.name} classified listings.`,
            url: `${SITE_URL}/category/${slug}`,
          },
        ]}
      />
      <BreadcrumbListJsonLd items={[
        { name: 'Home', url: '/' },
        { name: staticCat.name, url: `/category/${slug}` },
      ]} />
      <div>
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-primary-200 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white sm:text-4xl">{staticCat.name}</h1>
                  <p className="mt-1 text-primary-100">{description}</p>
                </div>
              </div>
            </div>
            <Link
              to={`/create?category=${slug}`}
              className="hidden rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50 sm:inline-flex"
            >
              Post an Ad
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Featured Listings */}
        {featured.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Featured Listings</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((l) => (
                <Link
                  key={l.id}
                  to={`/listings/${l.id}`}
                  className="group min-w-0 overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="aspect-[16/9] overflow-hidden rounded-t-xl bg-gray-100">
                    {l.images?.[0] ? (
                      <OptimizedImage src={l.images[0].url} alt={l.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <Building2 className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900">{l.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {l.city || l.location || 'Various locations'}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary-600">${l.price.toLocaleString()}</span>
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        Featured
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Filters & Sort */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {loading ? 'Loading...' : `${listings.length} Listing${listings.length !== 1 ? 's' : ''}`}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {filters.length > 0 && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  showFilters ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {Object.keys(activeFilters).length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                    {Object.keys(activeFilters).length}
                  </span>
                )}
              </button>
            )}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="hidden items-center gap-1 rounded-lg border border-gray-300 p-0.5 sm:flex">
              <button
                onClick={() => setView('grid')}
                className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`rounded-md p-1.5 ${view === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filter Sidebar */}
          {showFilters && filters.length > 0 && (
            <aside className="w-64 flex-shrink-0">
              <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={() => { setActiveFilters({}) }}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-4">
                  {filters.map((f) => (
                    <div key={f.key}>
                      <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {f.label}
                      </label>
                      {f.type === 'select' && f.options ? (
                        <select
                          value={activeFilters[f.key] || ''}
                          onChange={(e) =>
                            setActiveFilters((prev) => {
                              const next = { ...prev }
                              if (e.target.value) next[f.key] = e.target.value
                              else delete next[f.key]
                              return next
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">All</option>
                          {f.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : f.type === 'range' && f.options ? (
                        <select
                          value={activeFilters[f.key] || ''}
                          onChange={(e) =>
                            setActiveFilters((prev) => {
                              const next = { ...prev }
                              if (e.target.value) next[f.key] = e.target.value
                              else delete next[f.key]
                              return next
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">All Prices</option>
                          {f.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Listings Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Icon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">No listings found</h3>
                <p className="mb-6 text-sm text-gray-500">
                  {Object.keys(activeFilters).length > 0
                    ? 'Try adjusting your filters to see more results.'
                    : `There are no ${staticCat.name.toLowerCase()} listings available yet.`}
                </p>
                <Link
                  to={`/create?category=${slug}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Post the First Ad
                </Link>
              </div>
            ) : (
              <div className={view === 'grid'
                ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'
              }>
                {listings.map((l) => (
                  <Link
                    key={l.id}
                    to={`/listings/${l.id}`}
                    className={`group min-w-0 overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md ${
                      view === 'list' ? 'flex gap-4 p-3' : ''
                    }`}
                  >
                    {view === 'grid' ? (
                      <>
                        <div className="aspect-[16/9] overflow-hidden rounded-t-xl bg-gray-100">
                          {l.images?.[0] ? (
                            <OptimizedImage src={l.images[0].url} alt={l.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">
                              <Building2 className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="font-semibold text-gray-900">{l.title}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{l.city || l.location || 'Various locations'}</span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-bold text-primary-600">${l.price.toLocaleString()}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(l.created_at).toLocaleDateString()}
                            {l.is_featured && (
                              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {l.images?.[0] ? (
                            <OptimizedImage src={l.images[0].url} alt={l.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">
                              <Building2 className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{l.title}</p>
                            <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">{l.city || l.location || 'Various locations'}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(l.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <span className="text-lg font-bold text-primary-600">${l.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
