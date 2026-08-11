import { useAuthStore } from '@/store/store'
import { Navigate } from 'react-router-dom'
import { ClientDashboard } from './ClientDashboard'
import { AuthorDashboard } from './AuthorDashboard'
import { MarketerDashboard } from './MarketerDashboard'
import { DashboardPage } from './DashboardPage'

export function DashboardRouter() {
  const userRole = useAuthStore(state => state.userRole)
  
  switch (userRole) {
    case 'client':
      return <ClientDashboard />
    case 'author':
      return <AuthorDashboard />
    case 'marketer':
      return <MarketerDashboard />
    case 'admin':
    case 'super_admin':
    case 'developer':
      // Admin dashboards use permission-based rendering
      return <DashboardPage />
    default:
      // Fallback to main dashboard
      return <DashboardPage />
  }
}
