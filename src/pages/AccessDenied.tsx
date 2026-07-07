import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { SEO } from '../components/SEO'

export function AccessDenied() {
  return (
    <>
      <SEO title="Access Denied" description="You do not have permission to access this page." url="/access-denied" />
      <div className="mx-auto mt-24 max-w-md px-4 text-center">
      <ShieldAlert className="mx-auto mb-4 h-16 w-16 text-red-400" />
      <h1 className="mb-2 text-4xl font-bold text-gray-900">403</h1>
      <p className="mb-6 text-lg text-gray-600">Access Denied</p>
      <p className="mb-8 text-sm text-gray-500">
        You do not have permission to access this page.
      </p>
      <Link
        to="/"
        className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 font-medium text-white transition hover:bg-primary-700"
      >
        Go Home
      </Link>
    </div>
    </>
  )
}
