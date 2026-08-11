import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/store'
import { useLibrarySubscription } from '@/hooks/useLibrarySubscription'
import { LibraryPage } from '@/pages/library/LibraryPage'
import { MainLibraryPage } from '@/pages/library/MainLibraryPage'

export function LibraryRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const { data: subscription, isLoading: subLoading } = useLibrarySubscription(user?.user_id)

  console.log('[LibraryRoute] Debug:', { 
    userId: user?.user_id, 
    isAuthenticated, 
    isLoading,
    subscription,
    subLoading,
    path: location.pathname
  })

  useEffect(() => {
    // Wait for auth to finish loading
    if (subLoading || isLoading) return

    // If not logged in, redirect to login with return URL
    if (!isAuthenticated) {
      console.log('[LibraryRoute] Not authenticated, redirecting to login')
      const returnUrl = encodeURIComponent(location.pathname)
      navigate(`/login?redirect=${returnUrl}`, { replace: true })
      return
    }

    // If user not loaded yet, wait
    if (!user) {
      console.log('[LibraryRoute] User not loaded yet, waiting')
      return
    }

    // If user has active subscription, allow access to main library
    if (subscription?.active) {
      console.log('[LibraryRoute] Has active subscription, showing main library')
      return
    }

    // If not active (no subscription), redirect to subscribe page
    console.log('[LibraryRoute] No active subscription, redirecting to subscribe')
    const returnUrl = encodeURIComponent(location.pathname)
    navigate(`/library/subscribe?redirect=${returnUrl}`, { replace: true })
  }, [subscription, subLoading, isLoading, isAuthenticated, user, navigate, location.pathname])

  if (subLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  // If user is active, show main library (actual library with books)
  if (subscription?.active) {
    return <MainLibraryPage />
  }

  // This shouldn't render due to redirect, but show loading while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )
}