import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const AuthCallback = lazy(() => import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const UpdatePassword = lazy(() => import('./pages/UpdatePassword').then((m) => ({ default: m.UpdatePassword })))
const Listings = lazy(() => import('./pages/Listings').then((m) => ({ default: m.Listings })))
const ListingDetail = lazy(() => import('./pages/ListingDetail').then((m) => ({ default: m.ListingDetail })))
const CreateListing = lazy(() => import('./pages/CreateListing').then((m) => ({ default: m.CreateListing })))
const EditListing = lazy(() => import('./pages/EditListing').then((m) => ({ default: m.EditListing })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Favorites = lazy(() => import('./pages/Favorites').then((m) => ({ default: m.Favorites })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const MessagesPage = lazy(() => import('./features/chat/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })))
const SellerProfile = lazy(() => import('./pages/SellerProfile').then((m) => ({ default: m.SellerProfile })))
const CategoryPage = lazy(() => import('./pages/CategoryPage').then((m) => ({ default: m.CategoryPage })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const AccessDenied = lazy(() => import('./pages/AccessDenied').then((m) => ({ default: m.AccessDenied })))

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
