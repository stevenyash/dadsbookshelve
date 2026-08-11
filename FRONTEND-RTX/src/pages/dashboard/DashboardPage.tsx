import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Users, BookOpen, DollarSign, TrendingUp, Settings, Shield, UserCog, FileText, AlertCircle, Store, ArrowLeft, User } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { useAuthStore, useAuth } from '@/store/store'
import { usePermissions } from '@/hooks/usePermissions'
import { ebookUploadApi } from '@/lib/api'

import api from '@/lib/api'

import { LucideIcon } from 'lucide-react'

interface EbookConversion {
  id: number
  book_title: string
  author: string
  status: string
  payment_status: string
  final_copy: string
  date_uploaded: string
  users?: { name: string }
  user_id: string
}

interface Order {
  order_id: number
  total_amount: number
  status: string
  order_date: string
  users?: { name: string }
}

interface DashboardStats {
  totalUsers?: number
  totalBooks?: number
  totalRevenue?: number
  monthlyRevenue?: number
}

function StatCard({ icon: Icon, label, value, color, link }: { icon: LucideIcon, label: string, value?: string | number, color: string, link?: string }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <Link to={link || '#'} className="block">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <Icon className={`w-4 h-4 ${color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value || '-'}</div>
        </CardContent>
      </Link>
    </Card>
  )
}

function MenuCard({ icon: Icon, label, description, link, color }: { icon: LucideIcon, label: string, description: string, link: string, color: string }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <Link to={link || '#'} className="block p-4">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold">{label}</h3>
        <p className="text-sm opacity-70">{description}</p>
      </Link>
    </Card>
  )
}

function useStats(): UseQueryResult<DashboardStats, Error> {
  return useQuery({ 
    queryKey: ['dashboard-stats'], 
    queryFn: async () => { 
      try {
        const res = await api.get('home/dashboardstats'); 
        return (res.data.data || res.data) as DashboardStats
      } catch {
        return {} as DashboardStats
      }
    } 
  })
}

function useRecentOrders(): UseQueryResult<Order[], Error> {
  return useQuery({ 
    queryKey: ['recent-orders'], 
    queryFn: async () => { 
      try {
        const res = await api.get('orders/index?limit=5')
        return (res.data?.records || []) as Order[]
      } catch {
        return []
      }
    }
  })
}

function usePendingConversions(): UseQueryResult<EbookConversion[], Error> {
  return useQuery({
    queryKey: ['pending-conversions'],
    queryFn: async () => {
      try {
        const res = await ebookUploadApi.list({ status: ['pending', 'converting', 'processing'], limit: 100 })
        return (res.data?.records || []) as EbookConversion[]
      } catch {
        return []
      }
    },
    refetchInterval: 5000,
  })
}

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const userRole = useAuthStore(state => state.userRole)
  const { canView } = usePermissions()
  const { isProfileComplete } = useAuth()
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: recentOrdersArray, isLoading: ordersLoading } = useRecentOrders()
  const { data: pendingConversionsData, isLoading: pendingLoading } = usePendingConversions()

  const pendingConversionsArray = pendingConversionsData || []
  const isSuperAdmin = userRole === 'super_admin'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'User'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/profile" className="btn btn-ghost btn-sm">
            <User className="w-4 h-4" />
          </Link>
          <span className="badge badge-primary capitalize">{userRole}</span>
        </div>
      </div>

      {/* Profile Incomplete Warning */}
      {!isProfileComplete && !isSuperAdmin && (
        <Card className="border-l-4 border-l-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="w-5 h-5" />
              Complete Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your profile is incomplete. Please add your phone number and national ID to continue.</p>
            <Link to="/profile" className="btn btn-warning btn-sm mt-2">
              Complete Profile
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid - permission-based */}
      {(canView('users') || canView('books') || canView('payments')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {canView('users') && (
            <StatCard icon={Users} label="Total Users" value={statsLoading ? '...' : stats?.totalUsers || 0} color="text-blue-500" link="/admin/users" />
          )}
          {canView('books') && (
            <StatCard icon={BookOpen} label="Total Books" value={statsLoading ? '...' : stats?.totalBooks || 0} color="text-green-500" link="/books" />
          )}
          {canView('payments') && (
            <StatCard icon={DollarSign} label="Total Revenue" value={statsLoading ? '...' : `KES ${Number(stats?.totalRevenue || 0).toLocaleString()}`} color="text-yellow-500" link="/admin/payments" />
          )}
          {canView('payments') && (
            <StatCard icon={TrendingUp} label="This Month" value={statsLoading ? '...' : `KES ${Number(stats?.monthlyRevenue || 0).toLocaleString()}`} color="text-purple-500" />
          )}
        </div>
      )}

      {/* System Management - permission-based */}
      {(canView('users') || canView('marketers') || canView('books') || canView('payments') || canView('orders') || canView('settings') || canView('roles')) && (
        <div>
          <h2 className="text-lg font-bold mb-4">System Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {canView('users') && (
              <MenuCard icon={Users} label="User Management" description="Manage users, roles & permissions" link="/admin/users" color="bg-blue-100 text-blue-600" />
            )}
            {canView('marketers') && (
              <MenuCard icon={UserCog} label="Marketers" description="Manage marketers & referrals" link="/marketers" color="bg-purple-100 text-purple-600" />
            )}
            {canView('books') && (
              <MenuCard icon={Store} label="Books" description="Manage books & inventory" link="/books" color="bg-green-100 text-green-600" />
            )}
            {canView('payments') && (
              <MenuCard icon={DollarSign} label="Payments" description="View all transactions" link="/admin/payments" color="bg-yellow-100 text-yellow-600" />
            )}
            {canView('orders') && (
              <MenuCard icon={FileText} label="Orders" description="Manage orders" link="/admin/orders" color="bg-indigo-100 text-indigo-600" />
            )}
            {canView('settings') && (
              <MenuCard icon={Settings} label="Settings" description="System configuration" link="/settings" color="bg-gray-100 text-gray-600" />
            )}
            {canView('roles') && (
              <MenuCard icon={Shield} label="Roles & Permissions" description="Access control" link="/admin/permissions" color="bg-red-100 text-red-600" />
            )}
          </div>
        </div>
      )}

      {/* Pending eBook Conversions - permission-based */}
      {canView('ebook') && (
        <Card className="border-l-4 border-l-error">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-error" />
              Pending eBook Conversions
              {pendingConversionsArray && pendingConversionsArray.length > 0 && (
                <span className="badge badge-error">{pendingConversionsArray.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : pendingConversionsArray?.length === 0 ? (
              <div className="text-center py-4 text-base-content/60">
                No pending conversions
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Author</th>
                      <th>User</th>
                      <th>Submitted</th>
                      <th>Payment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingConversionsArray.map(c => (
                      <tr key={c.id}>
                        <td className="font-medium">{c.book_title}</td>
                        <td>{c.author}</td>
                        <td>{c.users?.name || c.user_id}</td>
                        <td>{c.date_uploaded ? new Date(c.date_uploaded).toLocaleDateString() : '-'}</td>
                        <td>
                          <span className={`badge ${c.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {c.payment_status || 'unpaid'}
                          </span>
                        </td>
                        <td>
                          <Link to={`/ebook/conversion/${c.id}`} className="btn btn-primary btn-xs">
                            Process
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Orders - permission-based */}
      {canView('orders') && (
        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent>
            {ordersLoading ? <div className="text-center py-4">Loading...</div> : recentOrdersArray?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {recentOrdersArray.map((order) => (
                      <tr key={order.order_id}>
                        <td>#{order.order_id}</td>
                        <td>{order.users?.name || 'N/A'}</td>
                        <td>KES {Number(order.total_amount).toLocaleString()}</td>
                        <td><span className={`badge ${order.status === 'completed' || order.status === 'delivered' ? 'badge-success' : 'badge-warning'}`}>{order.status}</span></td>
                        <td>{order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="text-center py-4 text-base-content/60">No recent orders</div>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
