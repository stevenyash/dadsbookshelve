import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ebookPaymentApi } from '@/lib/api'
import { useAuthStore } from '@/store/store'
import { usePermissions } from '@/hooks/usePermissions'
import { Card } from '@/components/Card'

interface Payment {
  id: number
  user_id: number
  amount: number
  currency: string
  payment_method: string
  reference: string
  status: string
  payment_date: string
  users?: {
    name: string
    email: string
  }
}

interface EbookPayment {
  id: number
  user_id: number
  amount: string
  currency: string
  payment_type: string
  reference: string
  status: string
  payment_date: string
  CheckoutRequestID: string
  details: string
}

async function fetchPayments(page = 1, limit = 10) {
  const res = await api.get(`/payments/my?page=${page}&limit=${limit}`)
  return res.data
}

async function fetchEbookPayments(page = 1, limit = 10) {
  const res = await ebookPaymentApi.list({ page, limit })
  return res.data
}

export function UserPaymentsPage() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const { canView } = usePermissions()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'payments' | 'ebook'>('payments')

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => fetchPayments(),
    enabled: !!user && activeTab === 'payments',
  })

  const { data: ebookData, isLoading: ebookLoading } = useQuery({
    queryKey: ['ebook-payments'],
    queryFn: () => fetchEbookPayments(),
    enabled: !!user && activeTab === 'ebook',
  })

  const payments = paymentsData?.records || paymentsData?.data?.records || []
  const ebookPayments = ebookData?.records || ebookData?.data?.records || []

  if (!canView('user_payments')) {
    return (
      <div className="p-4">
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Access Denied</p>
          <p className="text-sm text-gray-400">You don't have permission to view this page.</p>
        </Card>
      </div>
    )
  }

  const isLoading = activeTab === 'payments' ? paymentsLoading : ebookLoading

  if (isLoading) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Payments</h1>

        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${activeTab === 'payments' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Purchases
          </button>
          <button
            className={`tab ${activeTab === 'ebook' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ebook')}
          >
            Ebook Submissions
          </button>
        </div>

        {activeTab === 'payments' && (
          payments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No payments</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {payments.map((payment: Payment) => (
                <Card key={payment.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{payment.reference}</p>
                      <p className="text-sm text-gray-500">
                        {payment.payment_method} • {payment.users?.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(payment.payment_date).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {payment.currency} {payment.amount}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === 'ebook' && (
          ebookPayments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No ebook submissions</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {ebookPayments.map((payment: EbookPayment) => (
                <Card key={payment.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{payment.details || payment.reference}</p>
                      <p className="text-sm text-gray-500">
                        {payment.payment_type} • Ref: {payment.reference}
                      </p>
                      <p className="text-xs text-gray-400">
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {payment.currency} {payment.amount}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}