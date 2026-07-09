import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Building2, TrendingUp, Zap, Shield, ArrowRight, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SearchBar } from '../components/SearchBar'
import { FeatureMenu } from '../components/home/FeatureMenu'
import { SEO, OrganizationJsonLd, WebsiteJsonLd, WebPageJsonLd } from '../components/SEO'
import type { Listing } from '../types'

export function Home() {
  return (
    <>
      <SEO
        title="Buy & Sell"
        description="The trusted marketplace for your community. Browse hundreds of listings or post your own ad in minutes."
        url="/"
      />
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <WebPageJsonLd name="ValClassifieds - Buy & Sell" description="The trusted marketplace for your community. Browse hundreds of listings or post your own ad in minutes." url="/" />
      <HomeContent />
    </>
  )
}

function HomeContent() {
  const [featured, setFeatured] = useState<Listing[]>([])
  const [recent, setRecent] = useState<Listing[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('listings')
        .select('*, category:categories(name, slug), images:listing_images(url)')
        .eq('status', 'active')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('listings')
        .select('*, category:categories(name, slug), images:listing_images(url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8),
    ]).then(([featRes, recentRes]) => {
      if (featRes.data) setFeatured(featRes.data as unknown as Listing[])
      if (recentRes.data) setRecent(recentRes.data as unknown as Listing[])
    })
  }, [])

  const trendingSearches = ['Apartments', 'Used Cars', 'Jobs', 'Smartphones', 'Furniture', 'Bikes', 'Tutors', 'Pets']

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80">
            <Sparkles className="h-4 w-4" />
            India's Trusted Marketplace
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find What You Need.{' '}
            <span className="text-primary-300">Sell What You Don't.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-primary-100">
            The trusted marketplace for your community. Browse hundreds of listings or post your own ad in minutes.
          </p>
          <div className="mb-8 flex justify-center">
            <SearchBar />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-primary-900 shadow-sm transition hover:bg-gray-100"
            >
              Browse All Listings <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Post an Ad <Zap className="h-4 w-4" />
            </Link>
          </div>

          {/* Trending Searches */}
          <div className="mt-8">
            <p className="mb-3 flex items-center justify-center gap-1.5 text-sm text-primary-200">
              <TrendingUp className="h-4 w-4" />
              Trending searches
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {trendingSearches.map((term) => (
                <Link
                  key={term}
                  to={`/listings?q=${encodeURIComponent(term)}`}
                  className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white/80 transition hover:bg-white/20 hover:text-white"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <FeatureMenu />

      {/* Featured Listings */}
      {featured.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Featured Listings</h2>
                <p className="mt-1 text-sm text-gray-500">Hand-picked listings from trusted sellers</p>
              </div>
              <Link to="/listings?featured=true" className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:inline-flex">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {featured.map((l) => (
                <Link
                  key={l.id}
                  to={`/listings/${l.id}`}
                  className="group min-w-0 overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
                >
                    <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                      {l.images?.[0] ? (
                        <div className="absolute inset-0">
                          <img
                            src={l.images[0].url}
                            alt={l.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          <Building2 className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-1 flex items-center gap-2">
                        {l.category && (
                          <span className="text-xs text-gray-500">{l.category.name}</span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          Featured
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">{l.title}</p>
                      <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {l.city || l.location || 'Various locations'}
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-bold text-primary-600">${l.price.toLocaleString()}</span>
                      </div>
                    </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link to="/listings?featured=true" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                View All Featured <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recently Added */}
      {recent.length > 0 && (
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recently Added</h2>
                <p className="mt-1 text-sm text-gray-500">Latest listings from our community</p>
              </div>
              <Link to="/listings" className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:inline-flex">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {recent.map((l) => (
                <Link
                  key={l.id}
                  to={`/listings/${l.id}`}
                  className="group min-w-0 overflow-hidden rounded-xl bg-white p-3 shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {l.images?.[0] ? (
                      <div className="absolute inset-0">
                        <img
                          src={l.images[0].url}
                          alt={l.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <Building2 className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="font-semibold text-gray-900 truncate text-sm">{l.title}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{l.city || l.location || 'Various locations'}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-bold text-primary-600 text-sm">${l.price.toLocaleString()}</span>
                      {l.category && (
                        <span className="text-xs text-gray-400">{l.category.name}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link to="/listings" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                View All Listings <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Trust / Why Us */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Why ValClassifieds?</h2>
            <p className="mt-1 text-gray-500">The safest way to buy and sell in your community</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                <Search className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Easy to Find</h3>
              <p className="text-sm text-gray-500">
                Powerful search and filters across 16 categories to help you find exactly what you're looking for.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                <Zap className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Quick to Post</h3>
              <p className="text-sm text-gray-500">
                Create a listing in under a minute with our simple form and image upload. Reach thousands of buyers instantly.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                <Shield className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Safe & Secure</h3>
              <p className="text-sm text-gray-500">
                Verified users and moderated listings keep our marketplace trustworthy. Chat directly with sellers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Sellers CTA */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Start Buying & Selling Today
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-primary-100">
            Join thousands of happy users in your community. Post your first ad for free and connect with buyers near you.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50 hover:shadow-xl"
            >
              Get Started Free
            </Link>
            <Link
              to="/listings"
              className="rounded-xl border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
