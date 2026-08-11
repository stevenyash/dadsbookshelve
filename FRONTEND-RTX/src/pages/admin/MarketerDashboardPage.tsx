import { useQuery } from '@tanstack/react-query'
import { DollarSign, Users, TrendingUp, CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

function useMarketerDashboard() {
  return useQuery({
    queryKey: ['marketer-dashboard'],
    queryFn: async () => {
      const res = await api.get('marketer/dashboard/stats')
      return res.data
    },
    staleTime: 60 * 1000,
  })
}

function useRecentCommissions(limit = 10) {
  return useQuery({
    queryKey: ['recent-commissions', limit],
    queryFn: async () => {
      const res = await api.get(`marketer/dashboard/recent-commissions?limit=${limit}`)
      return res.data as any[]
    },
    staleTime: 60 * 1000,
  })
}

function useRecentPayouts(limit = 10) {
  return useQuery({
    queryKey: ['recent-payouts', limit],
    queryFn: async () => {
      const res = await api.get(`marketer/dashboard/recent-payouts?limit=${limit}`)
      return res.data as any[]
    },
    staleTime: 60 * 1000,
  })
}

function useTopMarketers(limit = 5) {
  return useQuery({
    queryKey: ['top-marketers', limit],
    queryFn: async () => {
      const res = await api.get(`marketer/dashboard/top-marketers?limit=${limit}`)
      return res.data as any[]
    },
    staleTime: 60 * 1000,
  })
}

function StatCard({ icon: Icon, label, value, color = '' }: { icon: any, label: string, value: string | number, color?: string }) {
  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-8 h-8 ${color}`} />
          <div>
            <p className="text-xs opacity-70">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'badge-warning',
    approved: 'badge-info',
    paid: 'badge-success',
    completed: 'badge-success',
    processing: 'badge-info',
    rejected: 'badge-error',
    cancelled: 'badge-error'
  }
  return (
    <span className={`badge badge-sm ${styles[status] || ''}`}>
      {status}
    </span>
  )
}

export function MarketerDashboardPage() {
  const { data: stats, isLoading } = useMarketerDashboard()
  const { data: commissions } = useRecentCommissions(10)
  const { data: payouts } = useRecentPayouts(10)
  const { data: topMarketers } = useTopMarketers(5)

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Marketer Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Marketers" value={stats?.totalMarketers || 0} color="text-blue-500" />
        <StatCard icon={CheckCircle} label="Active Marketers" value={stats?.activeMarketers || 0} color="text-green-500" />
        <StatCard icon={DollarSign} label="Total Earnings" value={`Ksh ${(stats?.totalEarnings || 0).toLocaleString()}`} color="text-green-600" />
        <StatCard icon={Clock} label="Pending Payouts" value={`Ksh ${(stats?.pendingPayouts || 0).toLocaleString()}`} color="text-yellow-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg">Top Marketers</h3>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Referral Code</th>
                    <th>Earnings</th>
                    <th>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {topMarketers?.map((m: any, i: number) => (
                    <tr key={m.id}>
                      <td>{i + 1}</td>
                      <td>{m.name}</td>
                      <td><code className="text-xs">{m.referralCode}</code></td>
                      <td className="text-green-600">Ksh {m.totalEarnings?.toLocaleString()}</td>
                      <td><span className={`badge badge-sm badge-${m.tier === 'gold' ? 'warning' : m.tier === 'silver' ? 'info' : 'neutral'}`}>{m.tier}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!topMarketers || topMarketers.length === 0) && (
                <p className="text-center py-4 opacity-60">No data</p>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg">Pending Actions</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-base-300 rounded">
                <span>Pending Commissions</span>
                <span className="badge badge-warning">{stats?.pendingCommissions || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-base-300 rounded">
                <span>Pending Payouts</span>
                <span className="badge badge-warning">{stats?.pendingPayoutsCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg">Recent Commissions</h3>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Marketer</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions?.map((c: any) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.marketerName}</td>
                      <td>{c.type}</td>
                      <td className="text-green-600">Ksh {c.amount?.toLocaleString()}</td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!commissions || commissions.length === 0) && (
                <p className="text-center py-4 opacity-60">No commissions</p>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg">Recent Payouts</h3>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Marketer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts?.map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.marketerName}</td>
                      <td className="text-green-600">Ksh {p.amount?.toLocaleString()}</td>
                      <td>{p.method}</td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!payouts || payouts.length === 0) && (
                <p className="text-center py-4 opacity-60">No payouts</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarketerDashboardPage