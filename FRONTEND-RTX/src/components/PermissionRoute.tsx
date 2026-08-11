import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/store/store'
import { AppLayout } from '@/components/layout'

interface PermissionRouteProps {
  children: ReactNode
  module: string
  action?: string
  actions?: string[]
  requireAll?: boolean
  fallback?: string
  useLayout?: boolean
}

export function PermissionRoute({
  children,
  module,
  action,
  actions,
  requireAll = false,
  fallback = '/dashboard',
  useLayout = true
}: PermissionRouteProps) {
  const auth = useAuth()
  const { isAuthenticated, isLoading, isAdmin, isSuperAdmin, isMarketer, userRole } = auth
  
  console.log('[PermissionRoute] userRole:', userRole, 'isMarketer:', isMarketer, 'module:', module)

  // Allow all logged-in users to access
  if (isAuthenticated) {
    console.log('[PermissionRoute] User authenticated, allowing access')
    if (useLayout) {
      return <AppLayout>{children}</AppLayout>
    }
    return <>{children}</>
  }

  // Redirect to login if not authenticated
  return <Navigate to="/login" replace />
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <PermissionRoute module="users" action="view" useLayout={false}>
      <AppLayout>{children}</AppLayout>
    </PermissionRoute>
  )
}

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return (
    <PermissionRoute module="roles" action="view" useLayout={false}>
      <AppLayout>{children}</AppLayout>
    </PermissionRoute>
  )
}
