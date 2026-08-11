import { useEffect } from 'react'
import { usePWAUpdate } from './hooks/usePWAUpdate'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/store'
import { setUnauthorizedHandler } from '@/lib/interceptor'
import { PublicLayout, AuthLayout, AppLayout } from '@/components/layout/index'
import { PermissionRoute } from '@/components/PermissionRoute'
import { LibraryRoute } from '@/components/LibraryRoute'
import { AffiliateSignupPage, AffiliateLoginPage } from '@/pages/affiliate/AuthPages'
import { AffiliateDashboardPage } from '@/pages/affiliate/DashboardPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { HomePage } from '@/pages/home/HomePage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ClientDashboard } from '@/pages/dashboard/ClientDashboard'
import { AuthorDashboard } from '@/pages/dashboard/AuthorDashboard'
import { MarketerDashboard } from '@/pages/dashboard/MarketerDashboard'
import { DashboardRouter } from '@/pages/dashboard/DashboardRouter'
import { LibraryPage } from '@/pages/library/LibraryPage'
import { EbookPage } from '@/pages/ebook/EbookPage'
import { EbookUploadPage } from '@/pages/ebook/EbookUploadPage'
import { EbookConversionPage } from '@/pages/ebook/EbookConversionPage'
import { BookShopPage } from '@/pages/shop/BookShopPage'
import { BookDetailPage } from '@/pages/shop/BookDetailPage'
import CartPage from '@/pages/shop/CartPage'
import { OrdersListPage, OrderViewPage } from '@/pages/shop/OrdersPage'
import { UserPaymentsPage } from '@/pages/shop/UserPaymentsPage'
import { PayPalStatusPage } from '@/pages/shop/PayPalStatusPage'
import { StoriesPage as AdminStoriesPage } from '@/pages/stories/StoriesPage'
import { StoryViewPage } from '@/pages/stories/StoryViewPage'
import { SlidersPage } from '@/pages/admin/SlidersPage'
import { FeaturedBooksPage } from '@/pages/admin/FeaturedBooksPage'
import { StoriesPage as AdminStoriesManagePage } from '@/pages/admin/StoriesPage'
import { AdminOrdersListPage, AdminOrderViewPage } from '@/pages/admin/OrdersPage'
import { AdminPaymentsListPage, AdminPaymentViewPage } from '@/pages/admin/PaymentsPage'
import { FileCleanupPage } from '@/pages/admin/FileCleanupPage'
import { SubscribePage } from '@/pages/library/SubscribePage'
import { ArchivePage, PricingPage, HelpPage } from '@/pages/custom/CustomPages'
import { OfflineLibraryPage } from '@/pages/library/OfflineLibraryPage'
import LimitlessInitiativePage from '@/pages/LimitlessInitiativePage'
import AboutLimitlessPage from '@/pages/AboutLimitlessPage'
import LimitlessAdminPage from '@/pages/admin/LimitlessAdminPage'
import DonationPage from '@/pages/DonationPage'
import { SellBooksPage } from '@/pages/sellbooks/SellBooksPage'
import { BookSubmissionPage } from '@/pages/sellbooks/BookSubmissionPage'
import { BookReaderPage } from '@/pages/library/BookReaderPage'
import { MarketersPage, MarketerAddPage, MarketerViewPage, MarketerEditPage } from '@/pages/admin/MarketerAddPage'
import { AdminBooksPage } from '@/pages/admin/AdminBooksPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { RolesPage } from '@/pages/admin/RolesPage'
import { AdminPermissionsPage } from '@/pages/admin/AdminPermissionsPage'
import { PermissionsPage } from '@/pages/admin/PermissionsPage'

if (typeof window !== 'undefined') {
  if (window.history.scrollRestoration === 'auto') {
    window.history.scrollRestoration = 'manual'
  }
}

// Public only route (login, register)
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  if (isAuthenticated) {
    const redirectTo = location.search.includes('redirect=') 
      ? '/' + location.search.split('redirect=')[1].split('&')[0]
      : '/dashboard'
    return <Navigate to={redirectTo} replace />
  }
  return <AuthLayout>{children}</AuthLayout>
}

// Unauthenticated public page (no layout needed)
function PublicPage({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Page that doesn't require authentication but uses PublicLayout
function PublicLayoutPage({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}

// No layout page (for fullscreen like reader)
function NoLayoutPage({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function AppContent() {
  const { showUpdateDialog, updateApp, dismissUpdate } = usePWAUpdate()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useAuthStore.getState().logout()
      navigate('/login', { replace: true })
    })
  }, [navigate])

  return (
    <>
      <Toaster position="top-right" />
      {showUpdateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-sm">
            <h3 className="font-bold text-lg">Update Available</h3>
            <p className="py-4 text-base-content/70">
              A new version is available. Update now for the best experience.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost btn-sm" onClick={dismissUpdate}>
                Later
              </button>
              <button className="btn btn-primary btn-sm" onClick={updateApp}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      <Routes>
          {/* === PUBLIC PAGES - No auth required === */}
          {/* Home & landing pages */}
          <Route path="/" element={<PublicLayoutPage><HomePage /></PublicLayoutPage>} />
          
          {/* Library - public for browsing, permission needed for reading */}
          <Route path="/dbslibrary" element={<PublicLayoutPage><LibraryRoute /></PublicLayoutPage>} />
          <Route path="/mainlibrary" element={<PublicLayoutPage><LibraryRoute /></PublicLayoutPage>} />
          
          {/* Ebook - public */}
          <Route path="/ebook" element={<PublicLayoutPage><EbookPage /></PublicLayoutPage>} />
          
          {/* Shop - public */}
          <Route path="/books/shop" element={<PublicLayoutPage><BookShopPage /></PublicLayoutPage>} />
          <Route path="/books/view/:id" element={<PublicLayoutPage><BookDetailPage /></PublicLayoutPage>} />
          
          {/* Stories - public */}
          <Route path="/stories" element={<PublicLayoutPage><AdminStoriesPage /></PublicLayoutPage>} />
          <Route path="/stories/view/:id" element={<PublicLayoutPage><StoryViewPage /></PublicLayoutPage>} />
          
          {/* Subscribe - public */}
          <Route path="/library/subscribe/:id?" element={<PublicLayoutPage><SubscribePage /></PublicLayoutPage>} />
          
          {/* Sell books - public */}
          <Route path="/sellbooks" element={<PublicLayoutPage><SellBooksPage /></PublicLayoutPage>} />
          
{/* Custom pages */}
          <Route path="/limitlessintiative" element={<PublicLayoutPage><LimitlessInitiativePage /></PublicLayoutPage>} />
          <Route path="/about_limitless" element={<PublicLayoutPage><AboutLimitlessPage /></PublicLayoutPage>} />
          <Route path="/donations/add" element={<PublicLayoutPage><DonationPage /></PublicLayoutPage>} />
          <Route path="/dbspricelist" element={<PublicLayoutPage><PricingPage /></PublicLayoutPage>} />
          <Route path="/archive" element={<PublicLayoutPage><ArchivePage /></PublicLayoutPage>} />
          <Route path="/aboutus" element={<PublicLayoutPage><AboutLimitlessPage /></PublicLayoutPage>} />
          <Route path="/help" element={<PublicLayoutPage><HelpPage /></PublicLayoutPage>} />

          {/* === AUTH PAGES - Redirect if already logged in === */}
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/signin" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/forgotpassword" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
          <Route path="/resetpassword" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />

          {/* Affiliate auth - separate layout */}
          <Route path="/affiliate/signup" element={<AuthLayout><AffiliateSignupPage /></AuthLayout>} />
          <Route path="/affiliate/login" element={<AuthLayout><AffiliateLoginPage /></AuthLayout>} />
          <Route path="/affiliate/dashboard" element={<AffiliateDashboardPage />} />

          {/* === PROTECTED PAGES - Auth required, permission verified === */}
          
          {/* Reader - fullscreen, permission checked inside page */}
          <Route path="/library/read/:id" element={
            <BookReaderPage />
          } />
          
          {/* Cart - requires cart permission */}
          <Route path="/cart" element={
            <PermissionRoute module="cart">
              <CartPage />
            </PermissionRoute>
          } />
          
          {/* Dashboard - role-based routing */}
          <Route path="/dashboard" element={
            <PermissionRoute module="dashboard">
              <DashboardRouter />
            </PermissionRoute>
          } />
          
          {/* User profile */}
          <Route path="/profile" element={
            <PermissionRoute module="dashboard">
              <ProfilePage />
            </PermissionRoute>
          } />
          
          {/* User orders - requires user_orders permission */}
          <Route path="/orders" element={
            <PermissionRoute module="user_orders">
              <OrdersListPage />
            </PermissionRoute>
          } />
          <Route path="/orders/view/:id" element={
            <PermissionRoute module="user_orders">
              <OrderViewPage id={''} />
            </PermissionRoute>
          } />
          
          {/* User payments - requires user_payments permission */}
          <Route path="/my-payments" element={
            <PermissionRoute module="user_payments">
              <UserPaymentsPage />
            </PermissionRoute>
          } />
          
          {/* Settings - requires settings permission */}
          <Route path="/settings" element={
            <PermissionRoute module="settings">
              <div>Settings - Coming Soon</div>
            </PermissionRoute>
          } />
          
          {/* Ebook upload - requires ebook permission */}
          <Route path="/ebook/upload" element={
            <PermissionRoute module="ebook">
              <EbookUploadPage />
            </PermissionRoute>
          } />
          <Route path="/ebook/conversion/:id" element={
            <PermissionRoute module="ebook">
              <EbookConversionPage />
            </PermissionRoute>
          } />
          
          {/* Sell books submission - requires book submission permission */}
          <Route path="/sellbooks/:type" element={
            <PermissionRoute module="shop">
              <BookSubmissionPage />
            </PermissionRoute>
          } />
          
          {/* Offline library - requires library permission */}
          <Route path="/library/offline" element={
            <PermissionRoute module="library">
              <OfflineLibraryPage />
            </PermissionRoute>
          } />

          {/* === ADMIN PAGES - Require specific module permissions === */}
          
          {/* Marketers management - ADMIN ONLY (full CRUD) */}
          <Route path="/marketers" element={
            <PermissionRoute module="marketers">
              <MarketersPage />
            </PermissionRoute>
          } />
          <Route path="/marketers/add" element={
            <PermissionRoute module="marketers" action="add">
              <MarketerAddPage />
            </PermissionRoute>
          } />
          <Route path="/marketers/view/:id" element={
            <PermissionRoute module="marketers">
              <MarketerViewPage />
            </PermissionRoute>
          } />
          <Route path="/marketers/edit/:id" element={
            <PermissionRoute module="marketers" action="edit">
              <MarketerEditPage />
            </PermissionRoute>
          } />
          
          {/* Marketer Wallet - redirect to affiliate dashboard */}
          <Route path="/marketers/wallet" element={
            <Navigate to="/affiliate/dashboard" replace />
          } />
          
          {/* Manage Referrals - redirect to affiliate dashboard */}
          <Route path="/referrals" element={
            <Navigate to="/affiliate/dashboard" replace />
          } />
          
          {/* Books management */}
          <Route path="/books" element={
            <PermissionRoute module="books">
              <AdminBooksPage />
            </PermissionRoute>
          } />
          <Route path="/books/add" element={
            <PermissionRoute module="books" action="add">
              <AdminBooksPage />
            </PermissionRoute>
          } />
          <Route path="/books/edit/:id" element={
            <PermissionRoute module="books" action="edit">
              <AdminBooksPage />
            </PermissionRoute>
          } />
          
          {/* Homepage Sliders - Admin only */}
          <Route path="/admin/sliders" element={
            <PermissionRoute module="sliders">
              <SlidersPage />
            </PermissionRoute>
          } />
          
          {/* Book of the Day - Admin only */}
          <Route path="/admin/featured" element={
            <PermissionRoute module="featured">
              <FeaturedBooksPage />
            </PermissionRoute>
          } />
          
          {/* Stories - Admin only */}
          <Route path="/admin/stories" element={
            <AppLayout>
              <AdminStoriesManagePage />
            </AppLayout>
          } />
          
          {/* User management */}
          <Route path="/admin/users" element={
            <PermissionRoute module="users">
              <UsersPage />
            </PermissionRoute>
          } />
          
          {/* Roles management */}
          <Route path="/admin/roles" element={
            <PermissionRoute module="roles">
              <RolesPage />
            </PermissionRoute>
          } />
          
          {/* Limitless content management - requires auth */}
          <Route path="/admin/limitless" element={
            <PermissionRoute module="settings">
              <LimitlessAdminPage />
            </PermissionRoute>
          } />
          
          {/* Orders management */}
          <Route path="/admin/orders" element={
            <PermissionRoute module="orders">
              <AdminOrdersListPage />
            </PermissionRoute>
          } />
          <Route path="/admin/orders/view/:id" element={
            <PermissionRoute module="orders">
              <AdminOrderViewPage id={''} />
            </PermissionRoute>
          } />
          
          {/* Payments management */}
          <Route path="/admin/payments" element={
            <PermissionRoute module="payments">
              <AdminPaymentsListPage />
            </PermissionRoute>
          } />
          <Route path="/admin/payments/view/:id" element={
            <PermissionRoute module="payments">
              <AdminPaymentViewPage id={''} />
            </PermissionRoute>
          } />
          
          {/* File cleanup */}
          <Route path="/admin/file-cleanup" element={
            <PermissionRoute module="file_cleanup" action="delete">
              <FileCleanupPage />
            </PermissionRoute>
          } />
          
          {/* Permissions management - unified page */}
          <Route path="/admin/permissions" element={
            <PermissionRoute module="roles">
              <AdminPermissionsPage />
            </PermissionRoute>
          } />
          <Route path="/admin/roles/:id/permissions" element={
            <PermissionRoute module="roles">
              <PermissionsPage />
            </PermissionRoute>
          } />

          {/* === PAYMENT STATUS - Public (return from PayPal) === */}
          <Route path="/payments/success" element={<PayPalStatusPage />} />
          <Route path="/payments/failed" element={<PayPalStatusPage />} />
          <Route path="/payments/status" element={<PayPalStatusPage />} />
          <Route path="/payments/cancelled" element={<PayPalStatusPage />} />

          {/* === FALLBACK === */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  )
}