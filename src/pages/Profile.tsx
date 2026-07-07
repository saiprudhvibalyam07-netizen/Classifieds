import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { SEO } from '../components/SEO'

export function Profile() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
    } else if (!user) {
      navigate('/login')
    }
  }, [profile, user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null })
      .eq('id', user.id)

    setLoading(false)
    if (!error) setSaved(true)
  }

  return (
    <>
      <SEO title="My Profile" description="Manage your ValClassifieds profile and account settings." url="/profile" />
      <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">My Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input
            id="email"
            value={user?.email ?? ''}
            disabled
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="full-name" className="mb-1 block text-sm font-medium">Full Name</label>
          <input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">Phone</label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {saved && <p className="text-sm text-green-600">Profile updated.</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
    </>
  )
}
