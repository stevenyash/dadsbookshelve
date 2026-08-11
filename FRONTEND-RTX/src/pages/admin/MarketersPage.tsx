import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Pencil, Eye, DollarSign, Users, TrendingUp, Send } from 'lucide-react'
import { marketerApi } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface Marketer {
  id: number
  referralCode: string
  isActive: boolean
  mpesaPhone: string
  totalEarnings: number
  pendingPayout: number
  totalPaid: number
  totalReferrals: number
  successfulReferrals: number
  conversionRate: number
  user: {
    id: number
    email: string
    name: string
    phone: string
    createdAt?: string
  }
  customRates?: any[]
  createdAt: string
  updatedAt: string

}
 function useMarketers(page = 1, limit = 20, search = '', isActive?: boolean) {
  return useQuery({
    queryKey: ['marketers', page, limit, search, isActive],
    queryFn: async () => {
      const res = await marketerApi.list({ page, limit, search, isActive })
      return res.data as { records: Marketer[]; page: number; limit: number; total: number; totalPages: number }
    },
    staleTime: 60 * 1000,
  })
}

function useCommissionRates() {
  return useQuery({
    queryKey: ['commission-rates'],
    queryFn: async () => {
      const res = await marketerApi.rates()
      return res.data as any[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function MarketersPage() {
  const { canView, canAdd, canEdit, canDelete } = usePermissions()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, refetch } = useMarketers(page, 20, search)
  
  const marketers = data?.records || []
  const pagination = data

  if (!canView('marketers') ) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Marketers Management</h1>
        {(canAdd('marketers') ) && (
          <Link to="/marketers/add" className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Marketer
          </Link>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            className="input input-bordered w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn" onClick={() => refetch()}>
          <Search className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="hidden md:block overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Referral Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Earnings</th>
                <th>Pending</th>
                <th>Referrals</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {marketers.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>
                    <code className="bg-base-200 px-2 py-1 rounded text-xs">{m.referralCode}</code>
                  </td>
                  <td>{m.user?.name}</td>
                  <td className="text-sm opacity-70">{m.user?.email}</td>
                  <td className="text-green-600 font-medium">Ksh {m.totalEarnings?.toLocaleString() || 0}</td>
                  <td className="text-yellow-600">Ksh {m.pendingPayout?.toLocaleString() || 0}</td>
                  <td>{m.successfulReferrals}/{m.totalReferrals}</td>
                  <td>
                    <span className={`badge ${m.isActive ? 'badge-success' : 'badge-error'}`}>
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Link to={`/marketers/view/${m.id}`} className="btn btn-ghost btn-xs">
                        <Eye className="w-3 h-3" />
                      </Link>
                      {(canEdit('marketers') ) && (
                        <Link to={`/marketers/edit/${m.id}`} className="btn btn-ghost btn-xs">
                          <Pencil className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Grid View */}
      {marketers && marketers.length > 0 && (
        <div className="md:hidden grid grid-cols-1 gap-3">
          {marketers.map((m) => (
            <div key={m.id} className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <code className="text-xs bg-base-200 px-2 py-1 rounded">{m.referralCode}</code>
                    <p className="font-semibold mt-1">{m.user?.name}</p>
                    <p className="text-xs opacity-60">{m.user?.email}</p>
                  </div>
                  <span className={`badge badge-sm ${m.isActive ? 'badge-success' : 'badge-error'}`}>
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <div>
                    <span className="text-xs opacity-50">Earnings</span>
                    <p className="text-green-600 font-medium">Ksh {m.totalEarnings?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <span className="text-xs opacity-50">Pending</span>
                    <p className="text-yellow-600">Ksh {m.pendingPayout?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <span className="text-xs opacity-50">Referrals</span>
                    <p>{m.successfulReferrals}/{m.totalReferrals}</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Link to={`/marketers/view/${m.id}`} className="btn btn-ghost btn-xs flex-1">
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Link>
                  {(canEdit('marketers') ) && (
                    <Link to={`/marketers/edit/${m.id}`} className="btn btn-ghost btn-xs flex-1">
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button 
            className="btn btn-sm" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="btn btn-sm disabled">
            Page {page} of {pagination.totalPages}
          </span>
          <button 
            className="btn btn-sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {(!marketers || marketers.length === 0) && !isLoading && (
        <div className="text-center py-12 opacity-60">
          No marketers found
        </div>
      )}
    </div>
  )
}

export default MarketersPage