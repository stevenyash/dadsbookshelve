import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, DollarSign, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import api from '@/lib/api'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
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
}

function useAuthorStats() {
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

export function AuthorDashboard() {
  const { data: stats } = useAuthorStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Author Dashboard</h1>
        <span className="badge badge-primary">Author</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Published Books"
          value={stats?.publishedBooks || 0}
          color="text-blue-500"
        />
        <StatCard
          icon={DollarSign}
          label="Total Earnings"
          value={`KES ${Number(stats?.totalEarnings || 0).toLocaleString()}`}
          color="text-green-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Pending"
          value={`KES ${Number(stats?.pendingEarnings || 0).toLocaleString()}`}
          color="text-yellow-500"
        />
        <StatCard
          icon={Wallet}
          label="Wallet Balance"
          value={`KES ${Number(stats?.walletBalance || 0).toLocaleString()}`}
          color="text-purple-500"
        />
      </div>

      {/* Recent Published Books */}
      {stats?.recentBooks?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>My Published Books</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Title</th><th>Price</th><th>Copies Sold</th></tr></thead>
                <tbody>
                  {stats.recentBooks.map((book: any) => (
                    <tr key={book.book_id}>
                      <td>{book.title}</td>
                      <td>KES {Number(book.price).toLocaleString()}</td>
                      <td>{book.purchase_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No books prompt */}
      {(!stats?.recentBooks?.length || stats?.publishedBooks === 0) && (
        <Card className="border-l-4 border-l-warning">
          <CardHeader>
            <CardTitle>Start Publishing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Publish your first book and start earning royalties</p>
            <Link to="/sellbooks" className="btn btn-primary btn-sm">
              Submit Book
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/sellbooks" className="btn btn-outline btn-primary">Submit New Book</Link>
        <Link to="/orders" className="btn btn-outline btn-secondary">View Sales</Link>
        <Link to="/my-payments" className="btn btn-outline">Withdrawal</Link>
      </div>
    </div>
  )
}
