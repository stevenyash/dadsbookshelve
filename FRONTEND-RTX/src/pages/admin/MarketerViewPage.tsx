import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, DollarSign, Users, TrendingUp, Send, Mail, Phone, Calendar, RefreshCw, MessageSquare } from 'lucide-react'
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
    firstName?: string
    lastName?: string
    phone?: string
    createdAt?: string
  }
  customRates?: any[]
  createdAt: string
  updatedAt: string
}

interface Commission {
  id: number
  type: string
  amount: number
  percentage: number
  saleAmount: number
  status: string
  referenceType: string
  referenceId: number
  createdAt: string
  approvedAt: string | null
  paidAt: string | null
}

interface Payout {
  id: number
  amount: number
  method: string
  status: string
  mpesaPhone: string
  transactionId: string
  createdAt: string
  processedAt: string | null
  completedAt: string | null
}

function useMarketer(id: number) {
  return useQuery({
    queryKey: ['marketer', id],
    queryFn: async () => {
      const res = await marketerApi.get(id)
      return res.data as Marketer
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

function useMarketerCommissions(id: number) {
  return useQuery({
    queryKey: ['marketer-commissions', id],
    queryFn: async () => {
      const res = await marketerApi.commissions(id)
      const data = res.data
      return (data?.records || data) as Commission[]
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

function useMarketerPayouts(id: number) {
  return useQuery({
    queryKey: ['marketer-payouts', id],
    queryFn: async () => {
      const res = await marketerApi.payouts(id)
      const data = res.data
      return (data?.records || data) as Payout[]
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

function StatCard({ icon: Icon, label, value, color = '' }: { icon: any, label: string, value: string | number, color?: string }) {
  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <div className="flex items-center gap-3">
          <Icon className={`w-8 h-8 ${color}`} />
          <div>
            <p className="text-sm opacity-70">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MarketerViewPage() {
  const { id } = useParams<{ id: string }>()
  const marketerId = parseInt(id || '0')
  const { canView, canEdit, canDelete, isAdmin } = usePermissions()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'overview' | 'commissions' | 'payouts'>('overview')
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [smsMessage, setSmsMessage] = useState('')
  
  const { data: marketer, isLoading } = useMarketer(marketerId)
  const { data: commissions, isLoading: commissionsLoading } = useMarketerCommissions(marketerId)
  const { data: payouts, isLoading: payoutsLoading } = useMarketerPayouts(marketerId)

  const resendCredentialsMutation = useMutation({
    mutationFn: () => marketerApi.adminResendWelcome(marketerId),
    onSuccess: () => {
      alert('Login credentials sent successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to send credentials')
    }
  })

  const sendSmsMutation = useMutation({
    mutationFn: (message: string) => marketerApi.adminSendSms(marketerId, message),
    onSuccess: () => {
      alert('SMS sent successfully!')
      setShowSmsModal(false)
      setSmsMessage('')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to send SMS')
    }
  })

  if (!canView('marketers') && !isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to view this page.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!marketer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Marketer not found</h2>
        <Link to="/marketers" className="btn btn-primary mt-4">
          Back to Marketers
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/marketers" className="btn btn-ghost">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {marketer.user?.firstName || marketer.user?.name?.split(' ')[0] || 'Marketer'}
            </h1>
            <p className="text-sm opacity-70">
              Referral Code: <code className="bg-base-200 px-2 py-1 rounded">{marketer.referralCode}</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(canEdit('marketers') || isAdmin) && (
            <Link to={`/marketers/edit/${marketerId}`} className="btn btn-primary">
              Edit
            </Link>
          )}
          <button 
            className="btn btn-secondary"
            onClick={() => resendCredentialsMutation.mutate()}
            disabled={resendCredentialsMutation.isPending}
          >
            {resendCredentialsMutation.isPending ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Resend Credentials
          </button>
          <button 
            className="btn btn-accent"
            onClick={() => setShowSmsModal(true)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Send SMS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Earnings" value={`Ksh ${marketer.totalEarnings?.toLocaleString() || 0}`} color="text-green-500" />
        <StatCard icon={TrendingUp} label="Pending Payout" value={`Ksh ${marketer.pendingPayout?.toLocaleString() || 0}`} color="text-yellow-500" />
        <StatCard icon={Users} label="Referrals" value={`${marketer.successfulReferrals}/${marketer.totalReferrals}`} color="text-blue-500" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${marketer.conversionRate || 0}%`} color="text-purple-500" />
      </div>

      <div className="tabs tabs-boxed">
        <button 
          className={`tab ${tab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${tab === 'commissions' ? 'tab-active' : ''}`}
          onClick={() => setTab('commissions')}
        >
          Commissions ({commissions?.length || 0})
        </button>
        <button 
          className={`tab ${tab === 'payouts' ? 'tab-active' : ''}`}
          onClick={() => setTab('payouts')}
        >
          Payouts ({payouts?.length || 0})
        </button>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">Contact Information</h3>
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {marketer.user?.email || '-'}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {marketer.mpesaPhone || '-'}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone: {marketer.user?.phone || '-'}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Created: {marketer.createdAt ? new Date(marketer.createdAt).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Account Status:</span>
                  <span className={`badge ${marketer.isActive ? 'badge-success' : 'badge-error'}`}>
                    {marketer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Paid:</span>
                  <span>Ksh {marketer.totalPaid?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'commissions' && (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Percentage</th>
                <th>Sale Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {commissions?.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.type}</td>
                  <td className="text-green-600">Ksh {c.amount?.toLocaleString()}</td>
                  <td>{c.percentage}%</td>
                  <td>Ksh {c.saleAmount?.toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-sm ${
                      c.status === 'paid' ? 'badge-success' : 
                      c.status === 'approved' ? 'badge-info' : 
                      'badge-warning'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!commissions || commissions.length === 0) && (
            <div className="text-center py-8 opacity-60">No commissions found</div>
          )}
        </div>
      )}

      {tab === 'payouts' && (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Transaction ID</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payouts?.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td className="text-green-600">Ksh {p.amount?.toLocaleString()}</td>
                  <td>{p.method}</td>
                  <td>
                    <span className={`badge badge-sm ${
                      p.status === 'completed' ? 'badge-success' : 
                      p.status === 'processing' ? 'badge-info' : 
                      p.status === 'rejected' ? 'badge-error' :
                      'badge-warning'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td><code className="text-xs">{p.transactionId || '-'}</code></td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!payouts || payouts.length === 0) && (
            <div className="text-center py-8 opacity-60">No payouts found</div>
          )}
        </div>
      )}
    {/* SMS Modal */}
      {showSmsModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Send SMS to Marketer</h3>
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Message</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Enter your message..."
              />
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => { setShowSmsModal(false); setSmsMessage('') }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => sendSmsMutation.mutate(smsMessage)}
                disabled={!smsMessage.trim() || sendSmsMutation.isPending}
              >
                {sendSmsMutation.isPending ? 'Sending...' : 'Send SMS'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setShowSmsModal(false); setSmsMessage('') }}></div>
        </div>
      )}
    </div>
  )
}

export default MarketerViewPage