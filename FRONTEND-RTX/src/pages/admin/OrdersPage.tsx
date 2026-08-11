import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { usePermissions } from '@/hooks/usePermissions'

interface Order {
  order_id: number
  user_id: number
  order_date: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  total_amount: number
  users?: {
    name: string
    email: string
    telephone: string
  }
  order_items?: Array<{
    book_id: number
    quantity: number
    price: number
    books?: {
      title: string
      cover_image?: string
    }
  }>
}

async function fetchOrders(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.status) query.set('status', params.status)
  if (params?.search) query.set('search', params.search)
  
  const res = await api.get(`/orders/index?${query}`)
  return res.data
}

async function fetchOrder(id: string) {
  const res = await api.get(`/orders/view/${id}`)
  return res.data
}

export function AdminOrdersListPage() {
  const { canView, canEdit } = usePermissions()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders', page, status, search],
    queryFn: () => fetchOrders({ page, limit: 20, status: status || undefined, search: search || undefined }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      api.post(`/orders/edit/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })

  const orders = data?.data?.records || []
  const totalPages = data?.data?.totalPages || 1

  if (!canView('orders')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to view orders.</p>
      </div>
    )
  }

  if (isLoading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-500">Error loading orders</div>

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Orders Management</h1>
        </div>

        <Card className="p-4 mb-4">
          <div className="flex gap-4 flex-wrap">
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
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
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </Card>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">Order ID</th>
                <th className="border p-3 text-left">Customer</th>
                <th className="border p-3 text-left">Date</th>
                <th className="border p-3 text-left">Items</th>
                <th className="border p-3 text-right">Total</th>
                <th className="border p-3 text-center">Status</th>
                <th className="border p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Order) => (
                <tr key={order.order_id} className="hover:bg-gray-50">
                  <td className="border p-3">#{order.order_id}</td>
                  <td className="border p-3">
                    <p className="font-medium">{order.users?.name}</p>
                    <p className="text-sm text-gray-500">{order.users?.email}</p>
                  </td>
                  <td className="border p-3">
                    {new Date(order.order_date).toLocaleDateString()}
                  </td>
                  <td className="border p-3">
                    {order.order_items?.length || 0} items
                  </td>
                  <td className="border p-3 text-right font-medium">
                    KES {Number(order.total_amount).toLocaleString()}
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    {canEdit('orders') && (
                      <select
                        value={order.status}
                        onChange={(e) => updateStatusMutation.mutate({ 
                          id: order.order_id, 
                          status: e.target.value 
                        })}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Grid View */}
        <div className="md:hidden grid grid-cols-1 gap-3">
          {orders.map((order: Order) => (
            <div key={order.order_id} className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold">#{order.order_id}</span>
                    <p className="text-sm font-medium">{order.users?.name}</p>
                    <p className="text-xs opacity-60">{order.users?.email}</p>
                  </div>
                  <span className={`badge badge-sm ${
                    order.status === 'completed' ? 'badge-success' 
                    : order.status === 'pending' ? 'badge-warning'
                    : order.status === 'cancelled' ? 'badge-error'
                    : 'badge-info'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs opacity-50">
                    {new Date(order.order_date).toLocaleDateString()}
                  </span>
                  <span className="font-semibold">
                    KES {Number(order.total_amount).toLocaleString()}
                  </span>
                </div>
                {canEdit('orders') && (
                  <select
                    value={order.status}
                    onChange={(e) => updateStatusMutation.mutate({ 
                      id: order.order_id, 
                      status: e.target.value 
                    })}
                    className="select select-xs select-bordered mt-2"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
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

export function AdminOrderViewPage({ id }: { id: string }) {
  const { canView, canEdit } = usePermissions()
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  })

  const queryClient = useQueryClient()
  
  const updateMutation = useMutation({
    mutationFn: (status: string) => api.post(`/orders/edit/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] })
    },
  })

  const order = data?.data

  if (!canView('orders')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to view orders.</p>
      </div>
    )
  }

  if (isLoading) return <div className="p-4">Loading...</div>
  if (error || !order) return <div className="p-4">Order not found</div>

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Order #{order.order_id}</h1>
          {canEdit('orders') && (
            <select
              value={order.status}
              onChange={(e) => updateMutation.mutate(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h2 className="font-bold mb-3">Customer Info</h2>
            <p className="font-medium">{order.users?.name}</p>
            <p className="text-gray-500">{order.users?.email}</p>
            <p className="text-gray-500">{order.users?.telephone}</p>
          </Card>

          <Card className="p-4">
            <h2 className="font-bold mb-3">Order Info</h2>
            <p>Date: {new Date(order.order_date).toLocaleString()}</p>
            <p>Status: {order.status}</p>
          </Card>
        </div>

        <Card className="p-4 mt-4">
          <h2 className="font-bold mb-3">Items</h2>
          <div className="space-y-3">
            {order.order_items?.map((item: any, idx: number) => (
              <div key={idx} className="flex gap-4 border-b pb-3">
                {item.books?.cover_image && (
                  <img 
                    src={item.books.cover_image} 
                    alt=""
                    className="w-12 h-16 object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.books?.title || `Book #${item.book_id}`}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium">
                  KES {Number(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>KES {Number(order.total_amount).toLocaleString()}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}