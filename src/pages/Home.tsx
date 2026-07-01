import { Link } from 'react-router-dom'
import { Search, Shield, Zap } from 'lucide-react'
import { SearchBar } from '../components/SearchBar'
import { FeatureMenu } from '../components/home/FeatureMenu'

export function Home() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary-900 to-primary-700 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">
            Find What You Need. Sell What You Don't.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-primary-100">
            The trusted marketplace for your community. Browse hundreds of
            listings or post your own ad in minutes.
          </p>
          <div className="mb-10 flex justify-center">
            <SearchBar />
          </div>
          <div className="flex justify-center gap-4">
            <Link
              to="/listings"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-primary-900 transition hover:bg-gray-100"
            >
              Browse Listings
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-white/30 px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              Start Selling
            </Link>
          </div>
        </div>
      </section>

      <FeatureMenu />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <Search className="mb-4 h-8 w-8 text-primary-600" />
              <h3 className="mb-2 text-lg font-semibold">Easy to Find</h3>
              <p className="text-gray-600">
                Powerful search and filters to help you find exactly what you're
                looking for.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <Zap className="mb-4 h-8 w-8 text-primary-600" />
              <h3 className="mb-2 text-lg font-semibold">Quick to Post</h3>
              <p className="text-gray-600">
                Create a listing in under a minute with our simple form and
                image upload.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <Shield className="mb-4 h-8 w-8 text-primary-600" />
              <h3 className="mb-2 text-lg font-semibold">Safe & Secure</h3>
              <p className="text-gray-600">
                Verified users and moderated listings keep our marketplace
                trustworthy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
