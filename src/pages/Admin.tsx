import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { requireAdmin } from '../lib/admin'
import { SEO } from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import type { Listing, Profile } from '../types'

type Tab = 'pending' | 'users' | 'listings'

export function Admin() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pending')
  const [users, setUsers] = useState<Profile[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [pendingListings, setPendingListings] = useState<Listing[]>([])

  useEffect(() => {
    if (profile) {
      const { allowed } = requireAdmin(profile)
      if (!allowed) { navigate('/access-denied'); return }
      fetchUsers()
      fetchListings()
      fetchPending()
    }
  }, [profile])
  async function fetchUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      console.error('Error fetching users:', error)
      return
    }
    if (data) setUsers(data as Profile[])
  }

  async function fetchListings() {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, price, status, profile:profiles(full_name)')
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      console.error('Error fetching listings:', error)
      return
    }
    if (data) setListings(data as unknown as Listing[])
  }

  async function fetchPending() {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, price, location, status, profile:profiles(full_name), images:listing_images(url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error fetching pending listings:', error)
      return
    }
    if (data) setPendingListings(data as unknown as Listing[])
  }

  async function approveListing(id: string) {
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'active' })
      .eq('id', id)
      .select()

    if (error || !data || data.length === 0) {
      console.error('Error approving listing:', error ?? 'No rows updated — RLS likely blocked the update')
      return
    }

    await Promise.all([fetchPending(), fetchListings()])
  }

  async function rejectListing(id: string) {
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'inactive' })
      .eq('id', id)
      .select()

    if (error || !data || data.length === 0) {
      console.error('Error rejecting listing:', error ?? 'No rows updated — RLS likely blocked the update')
      return
    }

    await Promise.all([fetchPending(), fetchListings()])
  }

  async function toggleListingStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('listings')
      .update({ status })
      .eq('id', id)
      .select()

    if (error || !data || data.length === 0) {
      console.error('Error updating listing status:', error ?? 'No rows updated — RLS likely blocked the update')
      return
    }

    await fetchListings()
  }

  const { allowed } = requireAdmin(profile)
  if (!allowed) return null

  return (
    <>
      <SEO title="Admin Panel" description="Administration panel for ValClassifieds." url="/admin" />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold">Admin Panel</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => setTab('pending')}
          className={`relative rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Pending
          {pendingListings.length > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {pendingListings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('users')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'users' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setTab('listings')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'listings' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Listings ({listings.length})
        </button>

      </div>

      {tab === 'pending' && (
        <div>
          {pendingListings.length === 0 ? (
            <p className="py-10 text-center text-gray-500">No pending listings.</p>
          ) : (
            <div className="space-y-4">
              {pendingListings.map((l) => (
                <div key={l.id} className="flex min-w-0 items-center gap-4 overflow-hidden rounded-xl bg-white p-4 shadow-sm">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {l.images && l.images[0] ? (
                      <OptimizedImage src={l.images[0].url} alt={l.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">No img</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-sm text-gray-500">
                      ${l.price.toLocaleString()} &middot; {l.profile?.full_name ?? 'Unknown'} &middot; {l.location}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => approveListing(l.id)}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => rejectListing(l.id)}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="px-4 py-3">{u.full_name ?? '—'}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'listings' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{l.title}</td>
                  <td className="px-4 py-3">{l.profile?.full_name ?? 'Unknown'}</td>
                  <td className="px-4 py-3">${l.price.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      l.status === 'active' ? 'bg-green-100 text-green-800' :
                      l.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => toggleListingStatus(l.id, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="sold">Sold</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  )
}
