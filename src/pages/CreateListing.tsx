import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { LocationPicker } from '../components/LocationPicker'
import { SEO } from '../components/SEO'
import type { Category } from '../types'

export function CreateListing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    condition: 'used',
  })
  const [location, setLocation] = useState<{
    latitude: number
    longitude: number
    address: string
    city: string
    state: string
  } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [images, setImages] = useState<File[]>([])

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')
    setLocationError('')

    if (!location) {
      setLocationError('Please select a location on the map.')
      return
    }

    setLoading(true)

    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert({
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        category_id: form.category_id,
        user_id: user.id,
        location: location.city || location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        city: location.city,
        state: location.state,
        condition: form.condition as 'new' | 'used',
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    if (images.length > 0 && listing) {
      const results = await Promise.allSettled(
        images.map(async (file, i) => {
          const filePath = `${user.id}/${listing.id}/${i}-${file.name}`
          const { error: uploadError } = await supabase.storage.from('listing-images').upload(filePath, file)
          if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

          const { data: urlData } = supabase.storage
            .from('listing-images')
            .getPublicUrl(filePath)

          const { error: insertError } = await supabase.from('listing_images').insert({
            listing_id: listing.id,
            url: urlData.publicUrl,
            sort_order: i,
          })
          if (insertError) throw new Error(`DB insert failed: ${insertError.message}`)
        })
      )

      const failures = results.filter((r) => r.status === 'rejected')
      if (failures.length > 0) {
        setError(`${failures.length} image(s) failed to upload`)
        setLoading(false)
        return
      }
    }

    navigate(`/listings/${listing.id}`)
  }

  return (
    <>
      <SEO title="Post a Listing" description="Create a new classified listing on ValClassifieds. Post your ad in minutes." url="/create" />
      <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Post a Listing</h1>

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
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
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
          error={locationError}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">Images</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files ?? []))}
            className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post Listing'}
        </button>
      </form>
    </div>
    </>
  )
}
