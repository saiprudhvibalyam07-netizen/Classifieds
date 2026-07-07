import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SEO } from '../components/SEO'

type Status = 'processing' | 'confirmed' | 'error' | 'already_confirmed' | 'invalid_link'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function handleCallback() {
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        if (error === 'access_denied' && errorDescription?.includes('already')) {
          setStatus('already_confirmed')
          setMessage('This email has already been confirmed. You can sign in now.')
        } else {
          setStatus('invalid_link')
          setMessage(errorDescription || 'The confirmation link is invalid or has expired. Please try signing up again.')
        }
        return
      }

      const { data, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        setStatus('error')
        setMessage('Unable to verify your email. The confirmation link may have expired.')
        return
      }

      if (data?.session) {
        const emailConfirmed = data.session.user?.email_confirmed_at
        if (emailConfirmed) {
          setStatus('confirmed')
          setMessage('Email confirmed successfully! You can now sign in.')
          setTimeout(() => navigate('/login?confirmed=true'), 2000)
        } else {
          setStatus('processing')
          setMessage('Verifying your email...')
        }
      } else {
        setStatus('invalid_link')
        setMessage('Invalid confirmation link. Please try signing up again.')
      }
    }

    handleCallback()
  }, [navigate, searchParams])

  const statusStyles: Record<Status, { bg: string; icon: string }> = {
    processing: { bg: 'bg-blue-50', icon: '🔍' },
    confirmed: { bg: 'bg-green-50', icon: '✅' },
    error: { bg: 'bg-red-50', icon: '❌' },
    already_confirmed: { bg: 'bg-yellow-50', icon: 'ℹ️' },
    invalid_link: { bg: 'bg-red-50', icon: '⚠️' },
  }

  const { bg, icon } = statusStyles[status]

  return (
    <>
      <SEO title="Email Confirmation" description="Confirming your ValClassifieds email address." url="/auth/callback" />
      <div className="mx-auto mt-24 max-w-md px-4">
      <div className={`rounded-xl p-6 text-center shadow-sm ${bg}`}>
        <div className="mb-4 text-3xl">{icon}</div>
        {status === 'processing' && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <p className="text-gray-700">{message || 'Verifying your email...'}</p>
          </>
        )}
        {status === 'confirmed' && (
          <>
            <h2 className="mb-2 text-xl font-bold text-green-800">Email Confirmed</h2>
            <p className="mb-4 text-green-700">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        )}
        {status === 'already_confirmed' && (
          <>
            <h2 className="mb-2 text-xl font-bold text-yellow-800">Already Confirmed</h2>
            <p className="mb-4 text-yellow-700">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white hover:bg-primary-700"
            >
              Go to Login
            </button>
          </>
        )}
        {status === 'invalid_link' && (
          <>
            <h2 className="mb-2 text-xl font-bold text-red-800">Invalid Link</h2>
            <p className="mb-4 text-red-700">{message}</p>
            <button
              onClick={() => navigate('/register')}
              className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white hover:bg-primary-700"
            >
              Sign Up Again
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 className="mb-2 text-xl font-bold text-red-800">Verification Failed</h2>
            <p className="mb-4 text-red-700">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white hover:bg-primary-700"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
    </>
  )
}
