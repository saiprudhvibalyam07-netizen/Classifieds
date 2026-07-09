import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Listings } from './pages/Listings'
import { ListingDetail } from './pages/ListingDetail'
import { CategoryPage } from './pages/CategoryPage'
import { SellerProfile } from './pages/SellerProfile'
import { ForgotPassword } from './pages/ForgotPassword'

const AuthCallback = lazy(() => import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback })))
const UpdatePassword = lazy(() => import('./pages/UpdatePassword').then((m) => ({ default: m.UpdatePassword })))
const CreateListing = lazy(() => import('./pages/CreateListing').then((m) => ({ default: m.CreateListing })))
const EditListing = lazy(() => import('./pages/EditListing').then((m) => ({ default: m.EditListing })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Favorites = lazy(() => import('./pages/Favorites').then((m) => ({ default: m.Favorites })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const MessagesPage = lazy(() => import('./features/chat/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const AccessDenied = lazy(() => import('./pages/AccessDenied').then((m) => ({ default: m.AccessDenied })))

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/create" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
          <Route path="/edit/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/seller/:id" element={<SellerProfile />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/access-denied" element={<AccessDenied />} />
        </Route>
      </Routes>
      </Suspense>
    </AuthProvider>
  )
}
