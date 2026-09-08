import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { requireAdmin } from '../lib/admin'
import { SEO } from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import type { Listing, Profile } from '../types'
import { requestValVerify } from '../lib/valverify'

type Tab = 'pending' | 'users' | 'listings'

type VerificationSummary = {
  verification_status: 'RUNNING' | 'COMPLETED' | 'ERROR'
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT' | null
  confidence: number | null
  risk_score: number | null
  summary: string | null
  reasons: unknown
  error?: { code?: string } | null
  updated_at: string
}

type PendingListing = Listing & {
  verification?: VerificationSummary | VerificationSummary[] | null
}

function currentVerification(verification: PendingListing['verification']): VerificationSummary | null {
  return Array.isArray(verification) ? verification[0] ?? null : verification ?? null
}

function VerificationSummary({ verification }: { verification?: VerificationSummary | VerificationSummary[] | null }) {
  const current = currentVerification(verification)
  if (!current) {
    return <p className="text-xs text-gray-500">Automated verification not run</p>
  }

  if (current.verification_status === 'RUNNING') {
    return <p className="text-xs text-blue-700">Automated verification in progress...</p>
  }

  const recommendation = current.recommendation ?? 'REVIEW'
  const badgeClass = recommendation === 'APPROVE'
    ? 'bg-green-100 text-green-800'
    : recommendation === 'REJECT'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800'
  const reasons = Array.isArray(current.reasons)
    ? current.reasons.filter((reason): reason is string => typeof reason === 'string').slice(0, 2)
    : []

  return (
    <div className="mt-1 space-y-1 text-xs" data-testid="listing-verification">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-0.5 font-medium ${badgeClass}`}>
          Automated: {recommendation}
        </span>
        {current.confidence !== null && <span className="text-gray-500">Confidence {current.confidence}%</span>}
        {current.risk_score !== null && <span className="text-gray-500">Risk {current.risk_score}%</span>}
      </div>
      {current.summary && <p className="text-gray-600">{current.summary}</p>}
      {reasons.map((reason) => <p key={reason} className="text-gray-500">{reason}</p>)}
      {current.verification_status === 'ERROR' && (
        <p className="text-yellow-700">
          {current.error?.code === 'STALE_INPUT'
            ? 'Listing content changed since this verification; run it again before approval.'
            : 'Verification needs a retry; Admin approval is still required.'}
        </p>
      )}
    </div>
  )
}

export function Admin() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pending')
  const [users, setUsers] = useState<Profile[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([])
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

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
      .select('id, title, price, location, status, profile:profiles(full_name), images:listing_images(url), verification:listing_verifications(verification_status, recommendation, confidence, risk_score, summary, reasons, error, updated_at)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error fetching pending listings:', error)
      return
    }
    if (data) setPendingListings(data as unknown as PendingListing[])
  }

  async function setListingStatus(id: string, status: string) {
    const { data, error } = await supabase.rpc('admin_set_listing_status', {
      p_listing_id: id,
      p_status: status,
    })

    if (error || !data) {
      console.error('Error updating listing status:', error ?? 'No listing was updated')
      return
    }

    await Promise.all([fetchPending(), fetchListings()])
  }

  async function approveListing(id: string) {
    await setListingStatus(id, 'active')
  }

  async function rejectListing(id: string) {
    await setListingStatus(id, 'inactive')
  }

  async function verifyPendingListing(id: string) {
    setVerifyingId(id)
    try {
      await requestValVerify(id)
    } catch (error) {
      console.error('Error verifying listing:', error)
    } finally {
      setVerifyingId(null)
      await fetchPending()
    }
  }

  async function toggleListingStatus(id: string, status: string) {
    await setListingStatus(id, status)
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
                <div key={l.id} className="flex min-w-0 flex-col items-stretch gap-4 overflow-hidden rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
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
                    <VerificationSummary verification={l.verification} />
                  </div>

                  <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                    {(!currentVerification(l.verification) || currentVerification(l.verification)?.verification_status === 'ERROR') && (
                      <button
                        onClick={() => verifyPendingListing(l.id)}
                        disabled={verifyingId === l.id}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {verifyingId === l.id ? 'Verifying...' : currentVerification(l.verification) ? 'Retry' : 'Verify'}
                      </button>
                    )}
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
                      l.status === 'rejected' ? 'bg-orange-100 text-orange-800' :
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
