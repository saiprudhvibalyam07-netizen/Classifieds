import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { LocationPicker } from '../components/LocationPicker'
import { SEO } from '../components/SEO'
import type { Category, Listing } from '../types'

export function EditListing() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    condition: 'used' as 'new' | 'used',
  })
  const [location, setLocation] = useState<{
    latitude: number
    longitude: number
    address: string
    city: string
    state: string
  } | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('listings').select('*').eq('id', id).single(),
    ]).then(([catRes, listingRes]) => {
      if (catRes.data) setCategories(catRes.data)
      const listing = listingRes.data as Listing | null
      if (listing) {
        if (listing.user_id !== user?.id) {
          navigate('/')
          return
        }
        setForm({
          title: listing.title,
          description: listing.description,
          price: listing.price.toString(),
          category_id: listing.category_id,
          condition: listing.condition ?? 'used',
        })
        if (listing.latitude && listing.longitude) {
          setLocation({
            latitude: listing.latitude,
            longitude: listing.longitude,
            address: listing.address ?? '',
            city: listing.city ?? '',
            state: listing.state ?? '',
          })
        }
      }
      setFetching(false)
    })
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const updates: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      category_id: form.category_id,
      condition: form.condition,
    }

    if (location) {
      updates.location = location.city || location.address
      updates.latitude = location.latitude
      updates.longitude = location.longitude
      updates.address = location.address
      updates.city = location.city
      updates.state = location.state
    }

    const { error: updateError } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      navigate(`/listings/${id}`)
    }
  }

  if (fetching) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <SEO title="Edit Listing" description="Edit your classified listing on ValClassifieds." />
      <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Edit Listing</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              required
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value as 'new' | 'used' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>

        <LocationPicker
          value={location}
          onChange={setLocation}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
    </>
  )
}
