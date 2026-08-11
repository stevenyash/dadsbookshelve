import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/store'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface Order {
  order_id: number
  user_id: number
  order_date: string
  status: string
  total_amount: number
  user?: {
    name: string
    email: string
  }
  order_items?: Array<{
    book_id: number
    quantity: number
    price: number
    order_type?: string
    books?: {
      title: string
      image_url?: string
    }
  }>
}

async function fetchOrders(page = 1, limit = 10, status?: string) {
  const statusParam = status && status !== 'all' ? `&status=${status}` : ''
  const res = await api.get(`/orders/index?page=${page}&limit=${limit}${statusParam}`)
  return res.data
}

async function fetchOrder(id: string) {
  const res = await api.get(`/orders/view/${id}`)
  return res.data
}

export function OrdersListPage() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const { canView } = usePermissions()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => fetchOrders(1, 10, statusFilter),
    enabled: !!user?.user_id,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.get(`/orders/delete/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const orders = data?.data?.records || []

  if (!canView('user_orders')) {
    return (
      <div className="p-4">
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Access Denied</p>
          <p className="text-sm text-gray-400">You don't have permission to view this page.</p>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return <div className="p-4 text-center">Loading orders...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading orders</div>
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Button onClick={() => navigate('/shop')}>Continue Shopping</Button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-4">
          {['all', 'pending', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 mb-4">No orders yet</p>
            <Button onClick={() => navigate('/shop')}>Browse Books</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order: Order) => (
              <Card key={order.order_id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      Order #{order.order_id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.order_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-sm ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                    <p className="font-bold mt-1">
                      KES {Number(order.total_amount).toLocaleString()}
                    </p>
                  </div>
                </div>

                {order.order_items && order.order_items.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-500 mb-2">Items:</p>
                    <ul className="space-y-1">
                      {order.order_items.map((item, idx) => (
                        <li key={idx} className="text-sm flex items-center gap-2">
                          <span>{item.books?.title || `Book #${item.book_id}`}</span>
                          <span className="text-xs text-gray-400">x{item.quantity}</span>
                          {item.order_type && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              item.order_type === 'digital' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.order_type}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/orders/view/${order.order_id}`)}
                  >
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {data?.data?.totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: data.data.totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
                className="px-3 py-1 rounded bg-gray-200"
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

export function OrderViewPage({ id }: { id: string }) {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  })

  const order = data?.data

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>
  }

  if (error || !order) {
    return <div className="p-4 text-red-500">Order not found</div>
  }

  return (
    <div className="p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Order #{order.order_id}</h1>
          <Button variant="outline" onClick={() => navigate('/orders')}>
            Back
          </Button>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p>{new Date(order.order_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`px-2 py-1 rounded text-sm ${
                order.status === 'completed' 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {order.status}
              </span>
            </div>
          </div>

          <hr className="my-4" />

          <h2 className="font-semibold mb-3">Items</h2>
          <div className="space-y-3">
            {order.order_items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <div>
                  <p>{item.books?.title || `Book #${item.book_id}`}</p>
                  <p className="text-sm text-gray-500">
                    Qty: {item.quantity}
                  </p>
                </div>
                <p className="font-medium">
                  KES {Number(item.price).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <hr className="my-4" />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>KES {Number(order.total_amount).toLocaleString()}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}