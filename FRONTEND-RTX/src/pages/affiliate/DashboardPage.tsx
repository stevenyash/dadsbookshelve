import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, Users, TrendingUp, Link as LinkIcon, Copy, ArrowUpRight, Loader2, Wallet, Gift, Settings, LogOut, ArrowLeft, Star } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/store'

interface MarketerStats {
  totalEarnings: number
  pendingPayout: number
  totalPaid: number
  totalReferrals: number
  successfulReferrals: number
  conversionRate: number
  referralCode: string
  tier: string
  isActive: boolean
  total_points: number
}

interface Commission {
  id: number
  type: string
  amount: number
  percentage: number
  saleAmount: number
  status: string
  createdAt: string
}

interface PayoutRequest {
  id: number
  amount: number
  method: string
  status: string
  createdAt: string
}

function useMarketerStats(userId: number | null) {
  return useQuery({
    queryKey: ['marketer-stats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Not logged in')
      const res = await api.get(`marketers/by-user/${userId}`)
      return res.data as MarketerStats
    },
    enabled: !!userId,
  })
}

function useCommissions(marketerId: number | null, limit = 20) {
  return useQuery({
    queryKey: ['marketer-commissions', marketerId],
    queryFn: async () => {
      if (!marketerId) throw new Error('Not logged in')
      const res = await api.get(`marketers/${marketerId}/commissions?limit=${limit}`)
      return res.data.records as Commission[]
    },
    enabled: !!marketerId,
  })
}

function usePayoutRequests(marketerId: number | null, limit = 10) {
  return useQuery({
    queryKey: ['marketer-payouts', marketerId],
    queryFn: async () => {
      if (!marketerId) throw new Error('Not logged in')
      const res = await api.get(`marketers/${marketerId}/payouts?limit=${limit}`)
      return res.data.records as PayoutRequest[]
    },
    enabled: !!marketerId,
  })
}

function useTrackReferral() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      api.get(`/affiliates/track/${refCode}`)
        .then(() => {
          console.log('Referral tracked:', refCode)
        })
        .catch(err => {
          console.error('Failed to track referral:', err)
        })
    }
  }, [searchParams])
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

function CopyLinkButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  
  const copyLink = () => {
    const url = `${window.location.origin}?ref=${code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button onClick={copyLink} className="btn btn-sm btn-outline gap-2">
      <Copy className="w-4 h-4" />
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  )
}

function PayoutModal({ isOpen, onClose, currentBalance }: { isOpen: boolean, onClose: () => void, currentBalance: number }) {
  const [method, setMethod] = useState<'mpesa' | 'bank'>('mpesa')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    
    try {
      const mktId = stats?.id
      const res = await api.post(`marketers/${mktId}/payout`, {
        amount: parseFloat(amount),
        method,
        mpesaPhone: method === 'mpesa' ? phone : undefined,
        bankName: method === 'bank' ? bankName : undefined,
        bankAccountName: method === 'bank' ? accountName : undefined,
        bankAccountNumber: method === 'bank' ? accountNumber : undefined,
      })
      
      if (res.data.success) {
        setMessage('Payout request submitted successfully!')
        setTimeout(() => {
          onClose()
          setMessage('')
        }, 2000)
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to submit payout request')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="font-bold text-lg mb-4">Request Payout</h3>
        <p className="text-sm opacity-70 mb-4">Available balance: Ksh {currentBalance.toLocaleString()}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount (KES)</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input input-bordered"
              placeholder="Enter amount"
              max={currentBalance}
              required
            />
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Payout Method</span>
            </label>
            <select 
              className="select select-bordered"
              value={method}
              onChange={(e) => setMethod(e.target.value as 'mpesa' | 'bank')}
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          
          {method === 'mpesa' ? (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Phone Number</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input input-bordered"
                placeholder="254712345678"
                required
              />
            </div>
          ) : (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Bank Name</span>
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="input input-bordered"
                  placeholder="e.g., Kenya Commercial Bank"
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Account Name</span>
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="input input-bordered"
                  placeholder="Account holder name"
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Account Number</span>
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="input input-bordered"
                  placeholder="Account number"
                  required
                />
              </div>
            </>
          )}
          
          {message && (
            <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AffiliateDashboardPage() {
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const navigate = useNavigate()
  const userId = useAuthStore(state => state.user?.user_id) || parseInt(localStorage.getItem('user_id') || '0')
  
  useTrackReferral()
  
  const { data: stats, isLoading: statsLoading } = useMarketerStats(userId)
  const marketerId = stats?.id || null
  const { data: commissions, isLoading: commissionsLoading } = useCommissions(marketerId)
  const { data: payouts, isLoading: payoutsLoading } = usePayoutRequests(marketerId)
  
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('marketerId')
    navigate('/affiliate/login')
  }
  
  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }
  
  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <p className="mb-4">Please login to view your dashboard</p>
          <Link to="/affiliate/login" className="btn btn-primary">Login</Link>
        </div>
      </div>
    )
  }
  
  const referralLink = `${window.location.origin}?ref=${stats.referralCode}`
  
  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="btn btn-ghost btn-circle">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
              <p className="text-sm opacity-70">Welcome back!</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`badge badge-${stats.tier === 'gold' ? 'warning' : stats.tier === 'silver' ? 'info' : 'neutral'} badge-lg`}>
              {stats.tier?.toUpperCase() || 'BRONZE'} Tier
            </span>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Referral Link Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Your Referral Link
            </h2>
            <p className="text-sm opacity-70 mb-4">Share this link to earn commissions</p>
            
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1 bg-base-200 p-3 rounded-lg font-mono text-sm break-all">
                {referralLink}
              </div>
              <CopyLinkButton code={stats.referralCode} />
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm">Referral Code:</span>
              <code className="bg-base-200 px-3 py-1 rounded-lg font-bold text-lg">{stats.referralCode}</code>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={DollarSign} label="Total Earnings" value={`Ksh ${(stats.totalEarnings || 0).toLocaleString()}`} color="text-green-500" />
          <StatCard icon={Wallet} label="Pending Payout" value={`Ksh ${(stats.pendingPayout || 0).toLocaleString()}`} color="text-yellow-500" />
          <StatCard icon={Users} label="Total Referrals" value={stats.totalReferrals || 0} color="text-blue-500" />
          <StatCard icon={TrendingUp} label="Conversion Rate" value={`${(stats.conversionRate || 0).toFixed(1)}%`} color="text-purple-500" />
          <StatCard icon={Star} label="Points" value={stats.total_points || 0} color="text-orange-500" />
        </div>
        
        {/* Actions */}
        <div className="flex gap-4">
          <button 
            onClick={() => setShowPayoutModal(true)}
            className="btn btn-primary gap-2"
            disabled={!stats.pendingPayout || stats.pendingPayout <= 0}
          >
            <Wallet className="w-4 h-4" />
            Request Payout
          </button>
        </div>
        
        {/* Commissions & Payouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Commissions */}
          <div className="card bg-base-100">
            <div className="card-body">
              <h3 className="card-title text-lg flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Recent Commissions
              </h3>
              {commissionsLoading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner"></span>
                </div>
              ) : commissions && commissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.slice(0, 10).map((c) => (
                        <tr key={c.id}>
                          <td>{c.type.replace(/_/g, ' ')}</td>
                          <td className="text-green-600">Ksh {c.amount?.toLocaleString()}</td>
                          <td><StatusBadge status={c.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 opacity-60">No commissions yet</p>
              )}
            </div>
          </div>
          
          {/* Recent Payouts */}
          <div className="card bg-base-100">
            <div className="card-body">
              <h3 className="card-title text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Recent Payouts
              </h3>
              {payoutsLoading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner"></span>
                </div>
              ) : payouts && payouts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.slice(0, 10).map((p) => (
                        <tr key={p.id}>
                          <td className="text-green-600">Ksh {p.amount?.toLocaleString()}</td>
                          <td className="capitalize">{p.method}</td>
                          <td><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 opacity-60">No payouts yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <PayoutModal 
        isOpen={showPayoutModal} 
        onClose={() => setShowPayoutModal(false)}
        currentBalance={stats.pendingPayout || 0}
      />
    </div>
  )
}

export default AffiliateDashboardPage