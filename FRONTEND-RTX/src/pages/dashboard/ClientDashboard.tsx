import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingCart, Library, CreditCard, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { usePermissions } from '@/hooks/usePermissions'
import api from '@/lib/api'

function StatCard({ icon: Icon, label, value, color, link }: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  link?: string
}) {
  const content = (
    <div className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-base-100 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-base-content/70">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </div>
    </div>
  )

  if (link) {
    return <Link to={link}>{content}</Link>
  }
  return content
}

function useClientStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const res = await api.get('home/dashboardstats')
        return res.data
      } catch {
        return {}
      }
    }
  })
}

export function ClientDashboard() {
  const { canView } = usePermissions()
  const { data: stats, isLoading: statsLoading } = useClientStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <span className="badge badge-primary">Client</span>
      </div>

      {/* Subscription Status */}
      {stats?.membership && (
        <Card className="border-l-4 border-l-success">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="w-5 h-5" />
              Library Subscription Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-base-content/70">Plan</p>
                <p className="font-semibold">{stats.membership.planName}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Started</p>
                <p className="font-semibold">
                  {stats.membership.startDate ? new Date(stats.membership.startDate).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Expires</p>
                <p className="font-semibold">
                  {stats.membership.expiryDate ? new Date(stats.membership.expiryDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No subscription prompt */}
      {!stats?.membership && stats?.hasLibraryAccess === false && (
        <Card className="border-l-4 border-l-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="w-5 h-5" />
              Subscribe to Access Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Get access to thousands of digital books</p>
            <Link to="/dbslibrary" className="btn btn-primary btn-sm">
              View Plans
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {canView('user_orders') && (
          <StatCard
            icon={ShoppingCart}
            label="Orders"
            value={stats?.totalOrders || 0}
            color="text-blue-500"
            link="/orders"
          />
        )}
        {canView('library') && (
          <StatCard
            icon={Library}
            label="Library Access"
            value={stats?.hasLibraryAccess ? 'Active' : 'Inactive'}
            color={stats?.hasLibraryAccess ? 'text-green-500' : 'text-red-500'}
            link="/dbslibrary"
          />
        )}
        {canView('user_payments') && (
          <StatCard
            icon={CreditCard}
            label="Payments"
            value="View"
            color="text-yellow-500"
            link="/my-payments"
          />
        )}
        <StatCard
          icon={FileText}
          label="eBook Conversions"
          value={stats?.ebookConversions || 0}
          color="text-purple-500"
        />
      </div>

      {/* Recent Orders */}
      {stats?.recentOrders?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Order ID</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {stats.recentOrders.map((order: any) => (
                    <tr key={order.order_id}>
                      <td>#{order.order_id}</td>
                      <td>KES {Number(order.total_amount).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          order.status === 'completed' || order.status === 'delivered'
                            ? 'badge-success'
                            : 'badge-warning'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent eBook Conversions */}
      {stats?.recentEbooks?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My eBook Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentEbooks.map((ebook: any) => (
                <div key={ebook.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div>
                    <p className="font-medium">{ebook.book_title}</p>
                    <p className="text-sm text-base-content/70">
                      {ebook.date_uploaded ? new Date(ebook.date_uploaded).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      ebook.status === 'completed' ? 'badge-success' :
                      ebook.status === 'processing' || ebook.status === 'converting' ? 'badge-info' :
                      'badge-warning'
                    }`}>
                      {ebook.status}
                    </span>
                    <span className={`badge ${
                      ebook.payment_status === 'paid' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {ebook.payment_status || 'unpaid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/orders" className="btn btn-outline btn-primary">View All Orders</Link>
        <Link to="/my-payments" className="btn btn-outline btn-secondary">View Payment History</Link>
        <Link to="/ebook" className="btn btn-outline">Convert New eBook</Link>
      </div>
    </div>
  )
}
