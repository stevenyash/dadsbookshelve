import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DollarSign, Users, TrendingUp, ShoppingCart } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
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

interface B2HDashboardStats {
  totalEarnings?: number
  totalReferrals?: number
  pendingEarnings?: number
  mySales?: number
}

function useMarketerStats() {
  return useQuery<B2HDashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const res = await api.get('home/dashboardstats')
        return res.data
      } catch {
        return {}
      }
    },
  })
}

export function MarketerDashboard() {
  const { data: stats, isLoading: statsLoading } = useMarketerStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
        <span className="badge badge-primary">Marketer</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Earnings"
          value={statsLoading ? '...' : `KES ${Number(stats?.totalEarnings || 0).toLocaleString()}`}
          color="text-green-500"
        />
        <StatCard
          icon={Users}
          label="Referrals"
          value={statsLoading ? '...' : stats?.totalReferrals || 0}
          color="text-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Pending"
          value={statsLoading ? '...' : `KES ${Number(stats?.pendingEarnings || 0).toLocaleString()}`}
          color="text-yellow-500"
        />
        <StatCard
          icon={ShoppingCart}
          label="My Sales"
          value={statsLoading ? '...' : stats?.mySales || 0}
          color="text-purple-500"
          link="/orders"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/orders" className="btn btn-outline btn-primary">View Orders</Link>
        <Link to="/my-payments" className="btn btn-outline btn-secondary">Earnings</Link>
        <Link to="/referrals" className="btn btn-outline">Manage Referrals</Link>
      </div>
    </div>
  )
}
