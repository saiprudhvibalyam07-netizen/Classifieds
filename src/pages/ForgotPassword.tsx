import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SEO, SITE_URL } from '../components/SEO'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : SITE_URL}/update-password`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <>
        <SEO title="Check Your Email" description="We've sent a password reset link to your email." url="/forgot-password" />
        <div className="mx-auto mt-16 max-w-md px-4 text-center">
        <h1 className="mb-4 text-3xl font-bold">Check Your Email</h1>
        <p className="text-gray-600">
          We've sent a password reset link to <strong>{email}</strong>.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-primary-600 hover:underline">
          Back to sign in
        </Link>
      </div>
      </>
    )
  }

  return (
    <>
      <SEO title="Reset Password" description="Reset your ValClassifieds account password." url="/forgot-password" />
      <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-6 text-3xl font-bold">Reset Password</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        <Link to="/login" className="font-medium text-primary-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
    </>
  )
}
