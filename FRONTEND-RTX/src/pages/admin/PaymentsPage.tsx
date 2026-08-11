import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/Card'
import { usePermissions } from '@/hooks/usePermissions'

interface Payment {
  id: number
  user_id: number
  amount: number
  currency: string
  payment_method: string
  reference: string
  checkout_request_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  payment_date: string
  date_updated?: string
  users?: {
    name: string
    email: string
    telephone: string
  }
  payment_items?: Array<{
    id: number
    amount: number
    payment_types?: {
      name: string
    }
  }>
}

async function fetchPayments(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.status) query.set('status', params.status)
  if (params?.search) query.set('search', params.search)
  
  const res = await api.get(`/payments/index?${query}`)
  return res.data
}

async function fetchPayment(id: string) {
  const res = await api.get(`/payments/view/${id}`)
  return res.data
}

export function AdminPaymentsListPage() {
  const { canView, canEdit } = usePermissions()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-payments', page, status, search],
    queryFn: () => fetchPayments({ page, limit: 20, status: status || undefined, search: search || undefined }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      api.post(`/payments/edit/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
    },
  })

  const payments = data?.data?.records || []
  const totalPages = data?.data?.totalPages || 1

  if (!canView('payments')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to view payments.</p>
      </div>
    )
  }

  if (isLoading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-500">Error loading payments</div>

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Payments Management</h1>
        </div>

        <Card className="p-4 mb-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-2 max-w-xs"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </Card>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">ID</th>
                <th className="border p-3 text-left">Reference</th>
                <th className="border p-3 text-left">Customer</th>
                <th className="border p-3 text-left">Method</th>
                <th className="border p-3 text-left">Date</th>
                <th className="border p-3 text-right">Amount</th>
                <th className="border p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment: Payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="border p-3">#{payment.id}</td>
                  <td className="border p-3">
                    <p className="font-mono text-sm">{payment.reference}</p>
                  </td>
                  <td className="border p-3">
                    <p className="font-medium">{payment.users?.name}</p>
                    <p className="text-sm text-gray-500">{payment.users?.email}</p>
                  </td>
                  <td className="border p-3 capitalize">{payment.payment_method}</td>
                  <td className="border p-3">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </td>
                  <td className="border p-3 text-right font-medium">
                    {payment.currency} {payment.amount}
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      payment.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : payment.status === 'failed' || payment.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Grid View */}
        <div className="md:hidden grid grid-cols-1 gap-3">
          {payments.map((payment: Payment) => (
            <div key={payment.id} className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold">#{payment.id}</span>
                    <p className="font-mono text-xs opacity-60">{payment.reference}</p>
                  </div>
                  <span className={`badge badge-sm ${
                    payment.status === 'completed' ? 'badge-success' 
                    : payment.status === 'pending' ? 'badge-warning'
                    : payment.status === 'failed' || payment.status === 'cancelled' ? 'badge-error'
                    : 'badge-info'
                  }`}>
                    {payment.status}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-medium">{payment.users?.name}</p>
                  <p className="text-xs opacity-60">{payment.users?.email}</p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs opacity-50">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </span>
                  <span className="font-semibold">
                    {payment.currency} {payment.amount}
                  </span>
                </div>
                {canEdit('payments') && (
                  <select
                    value={payment.status}
                    onChange={(e) => updateStatusMutation.mutate({ 
                      id: payment.id, 
                      status: e.target.value 
                    })}
                    className="select select-xs select-bordered mt-2"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded ${
                  page === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminPaymentViewPage({ id }: { id: string }) {
  const { canView, canEdit } = usePermissions()
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-payment', id],
    queryFn: () => fetchPayment(id),
    enabled: !!id,
  })

  const queryClient = useQueryClient()
  
  const updateMutation = useMutation({
    mutationFn: (status: string) => api.post(`/payments/edit/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment', id] })
    },
  })

  const payment = data?.data

  if (!canView('payments')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to view payments.</p>
      </div>
    )
  }

  if (isLoading) return <div className="p-4">Loading...</div>
  if (error || !payment) return <div className="p-4">Payment not found</div>

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Payment #{payment.id}</h1>
          {canEdit('payments') && (
            <select
              value={payment.status}
              onChange={(e) => updateMutation.mutate(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h2 className="font-bold mb-3">Payment Details</h2>
            <div className="space-y-2">
              <p><span className="text-gray-500">Reference:</span> {payment.reference}</p>
              <p><span className="text-gray-500">Method:</span> {payment.payment_method}</p>
              <p><span className="text-gray-500">Amount:</span> {payment.currency} {payment.amount}</p>
              <p><span className="text-gray-500">Date:</span> {new Date(payment.payment_date).toLocaleString()}</p>
              {payment.checkout_request_id && (
                <p><span className="text-gray-500">Checkout ID:</span> {payment.checkout_request_id}</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-bold mb-3">Customer</h2>
            <p className="font-medium">{payment.users?.name}</p>
            <p className="text-gray-500">{payment.users?.email}</p>
            <p className="text-gray-500">{payment.users?.telephone}</p>
          </Card>
        </div>

        {payment.metadata && (
          <Card className="p-4 mt-4">
            <h2 className="font-bold mb-3">Metadata</h2>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(payment.metadata, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  )
}