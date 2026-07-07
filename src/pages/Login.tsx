import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SEO } from '../components/SEO'

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Invalid email or password. Please try again.',
  'Email not confirmed': 'Please confirm your email address before signing in. Check your inbox for the confirmation link.',
  'email_not_confirmed': 'Please confirm your email address before signing in. Check your inbox for the confirmation link.',
}

function userFriendlyError(message: string): string {
  return ERROR_MESSAGES[message] || message
}

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justConfirmed = searchParams.get('confirmed') === 'true'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (err) {
      setError(userFriendlyError(err.message))
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <>
      <SEO title="Sign In" description="Sign in to your ValClassifieds account to manage listings, chat with sellers, and more." url="/login" />
      <div className="mx-auto mt-16 max-w-md px-4">
      {justConfirmed && (
        <div className="mb-6 rounded-xl bg-green-50 p-4 text-center text-sm text-green-700 shadow-sm" data-testid="login-confirmed-banner">
          Email confirmed successfully! You can now sign in.
        </div>
      )}
      <h1 className="mb-6 text-3xl font-bold">Sign In</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            data-testid="login-email-input"
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
            data-testid="login-password-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" data-testid="login-error-message">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          data-testid="login-submit-button"
          className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-right text-sm">
          <Link to="/forgot-password" className="text-gray-600 hover:text-primary-600 hover:underline">
            Forgot your password?
          </Link>
        </p>
      </form>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-primary-600 hover:underline" data-testid="login-register-link">
          Sign up
        </Link>
      </p>
    </div>
    </>
  )
}
