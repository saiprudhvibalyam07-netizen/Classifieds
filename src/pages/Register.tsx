import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SEO, SITE_URL } from '../components/SEO'

const ERROR_MESSAGES: Record<string, string> = {
  'User already registered': 'This email is already registered. Please sign in instead.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
  'signup_disabled': 'Registration is currently disabled. Please try again later.',
}

function userFriendlyError(message: string): string {
  return ERROR_MESSAGES[message] || message
}

export function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : SITE_URL}/auth/callback`,
      },
    })

    if (err) {
      setError(userFriendlyError(err.message))
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <>
        <SEO title="Account Created" description="Your ValClassifieds account has been created. Check your email to confirm your account." url="/register" />
        <div className="mx-auto mt-16 max-w-md px-4">
        <div className="rounded-xl bg-green-50 p-8 text-center shadow-sm">
          <div className="mb-4 text-4xl">📧</div>
          <h1 className="mb-4 text-2xl font-bold text-green-800">Account Created Successfully</h1>
          <p className="mb-6 text-green-700">
            Please check your email and click the confirmation link before signing in.
          </p>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 font-medium text-white transition hover:bg-primary-700"
            data-testid="register-success-login-link"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
      </>
    )
  }

  return (
    <>
      <SEO title="Create Account" description="Create your ValClassifieds account to start buying and selling in your community." url="/register" />
      <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-6 text-3xl font-bold">Create Account</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            data-testid="register-name-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            data-testid="register-email-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            data-testid="register-password-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {error && <p className="text-sm text-red-600" data-testid="register-error-message">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          data-testid="register-submit-button"
          className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
    </>
  )
}
