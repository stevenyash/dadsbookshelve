import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/store'
import { useLibrarySubscription } from '@/hooks/useLibrarySubscription'
import { useLibrarySubscriptionPayment } from '@/hooks/payment/modules'
import { ArrowLeft, User, Loader2, Smartphone, CreditCard, Check, X, AlertCircle, Globe } from 'lucide-react'
import api from '@/lib/api'

interface LibraryPackage {
  access_id: number
  access_type: string
  is_member?: boolean
  amount_kenya_shillings: number
  amount_usd: number
  amount_eur: number
  duration: string
  allowed_devices: number
}

function useLibraryPackages() {
  return useQuery({
    queryKey: ['library-packages'],
    queryFn: async () => {
      const res = await api.get('components_data/libraryaccess')
      return res.data.records as LibraryPackage[]
    },
  })
}

export function SubscribePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dbslibrary'
  const urlReferralCode = searchParams.get('ref') || ''
  // Check both URL param and localStorage (set from home page)
  const referralCode = urlReferralCode || localStorage.getItem('referralCode') || ''
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const packageId = id ? parseInt(id) : null
  const [activeTab, setActiveTab] = useState<'individual' | 'institution'>('individual')
  
  const { data: packages, isLoading: packagesLoading } = useLibraryPackages()
  const pkg = packageId ? packages?.find(p => p.access_id === packageId) : null
  const isLoading = packagesLoading
  const { refetchSubscription } = useLibrarySubscription(user?.user_id)

  const handlePaymentSuccess = () => {
    refetchSubscription()
    setTimeout(() => navigate(redirectTo), 1500)
  }

  const handlePaymentFailed = (error: string) => {
    console.error('Payment failed:', error)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Login Required</h2>
          <p className="mb-6">Please login to subscribe to the library.</p>
          <div className="flex gap-4 justify-center">
            <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="btn btn-primary">Login</Link>
            <Link to="/register" className="btn btn-outline">Register</Link>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!pkg) {
    const filteredPackages = activeTab === 'individual' 
      ? packages?.filter(p =>  p.is_member === true) || []
      : packages?.filter(p =>  p.is_member === false) || []
    
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <button onClick={() => navigate(-1)} className="btn btn-ghost mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <h2 className="text-2xl font-bold mb-6 text-center">Choose a Package</h2>
          
          <div className="tabs tabs-boxed justify-center mb-6">
            <button 
              className={`tab ${activeTab === 'individual' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('individual')}
            >
              👤 Individual
            </button>
            <button 
              className={`tab ${activeTab === 'institution' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('institution')}
            >
              🏢 Institution
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPackages.map((p) => (
              <div key={p.access_id} className="card bg-base-100 shadow-xl border-2 border-primary/20 hover:border-primary transition-colors">
                <div className="card-body">
                  <h3 className="font-bold text-lg">{p.access_type}</h3>
                  <p className="text-sm opacity-70">{p.duration} • {p.allowed_devices} device(s)</p>
                  <p className="text-2xl font-bold text-primary">Ksh {Number(p.amount_kenya_shillings).toLocaleString()}</p>
                  <div className="card-actions justify-end mt-4">
                    <Link to={`/library/subscribe/${p.access_id}?redirect=${encodeURIComponent(redirectTo)}`} className="btn btn-primary">
                      Select
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredPackages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-lg opacity-70">No packages available in this category</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="btn btn-ghost mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl font-bold text-center mb-6">
              Complete Your Subscription
            </h2>

            {user && (
              <div className="bg-base-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">{user.name}</p>
                    <p className="text-sm opacity-70">{user.email}</p>
                    {user.telephone && <p className="text-sm opacity-70">{user.telephone}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-base-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{pkg.access_type}</h3>
                  <p className="text-sm opacity-70">{pkg.duration} • {pkg.allowed_devices} device(s)</p>
                </div>
                <div className="text-2xl font-bold text-primary">
                  Ksh {Number(pkg.amount_kenya_shillings).toLocaleString()}
                </div>
              </div>
            </div>

            {isAuthenticated && packageId && pkg && (
              <div className="mt-6">
                <LibraryPaymentForm
                  accessId={packageId}
                  amount={Number(pkg.amount_kenya_shillings)}
                  description={`Library Subscription - ${pkg.access_type}`}
                  referralCode={referralCode}
                  onSuccess={handlePaymentSuccess}
                  onFailed={handlePaymentFailed}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
)
}

function LibraryPaymentForm({
  accessId,
  amount,
  description,
  referralCode,
  onSuccess,
  onFailed,
}: {
  accessId: number
  amount: number
  description: string
  referralCode?: string
  onSuccess: () => void
  onFailed: (error: string) => void
}) {
  const user = useAuthStore(state => state.user)
  const [method, setMethod] = useState<'mpesa' | 'paypal'>('mpesa')
  const [phone, setPhone] = useState(user?.telephone || '')
  const [exchangeRate, setExchangeRate] = useState(150) // Default rate
  const [usdAmount, setUsdAmount] = useState(0)
  const [localStatus, setLocalStatus] = useState<'idle' | 'processing' | 'pending' | 'completed' | 'failed'>('idle')

  const { status, checkoutRequestId, error, pay, reset, confirmPayment } = useLibrarySubscriptionPayment({
    accessId,
    referralCode,
    onSuccess: () => {
      onSuccess()
    },
    onFailed: onFailed,
  })

  // Fetch exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await api.get('exchangerates/view/KES/USD')
        const rate = response.data?.data?.rate
        if (rate) {
          setExchangeRate(Number(rate) || 150)
        } else {
          setExchangeRate(150)
        }
      } catch (err) {
        setExchangeRate(150)
      }
    }
    
    fetchExchangeRate()
  }, [])

  // Calculate USD amount
  useEffect(() => {
    if (amount > 0 && exchangeRate > 0) {
      setUsdAmount(amount / exchangeRate)
    }
  }, [amount, exchangeRate])

  const handlePay = async () => {
    const result = await pay({
      amount: method === 'paypal' ? usdAmount : amount,
      phone: method === 'mpesa' ? phone : undefined,
      method,
      description,
      currency: method === 'paypal' ? 'USD' : 'KES',
    })

    // Set status based on result
    if (result) {
      setLocalStatus('pending')
    } else {
      setLocalStatus('failed')
    }

    // Handle PayPal redirect with brief delay to show message
    if (method === 'paypal' && result?.approveUrl) {
      setTimeout(() => {
        window.location.href = result.approveUrl
      }, 1500) // 1.5 seconds to see the message
    }
  }

  const handleManualCheck = async () => {
    const result = await confirmPayment()
    if (result.success) {
      onSuccess()
    } else {
      onFailed(result.message || 'Payment not completed yet')
    }
  }

  const isPending = localStatus === 'pending' || status === 'pending'
  const isCompleted = localStatus === 'completed' || status === 'completed'
  const isFailed = localStatus === 'failed' || status === 'failed'

  // Reset local status when switching methods
  useEffect(() => {
    setLocalStatus('idle')
  }, [method])
  const isProcessing = localStatus === 'processing' || status === 'processing'

  return (
    <div className="space-y-4">
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${method === 'mpesa' ? 'tab-active' : ''}`}
          onClick={() => setMethod('mpesa')}
        >
          <Smartphone className="w-4 h-4 mr-2" />
          M-Pesa
        </button>
        <button
          className={`tab ${method === 'paypal' ? 'tab-active' : ''}`}
          onClick={() => setMethod('paypal')}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          PayPal
        </button>
      </div>

      {method === 'mpesa' && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Phone Number</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712345678"
            className="input input-bordered"
          />
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {isCompleted && (
        <div className="alert alert-success">
          <Check className="w-5 h-5" />
          <span>Payment successful! Redirecting...</span>
        </div>
      )}

      <button
        className={`btn w-full ${isFailed ? 'btn-error' : 'btn-primary'} ${isProcessing ? 'loading' : ''}`}
        onClick={handlePay}
        disabled={isPending || isCompleted || isFailed || (method === 'mpesa' && !phone)}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isFailed ? (
          'Try Again'
        ) : (
          <div className="flex flex-col items-center">
            <span>Pay {method === 'mpesa' ? 'Ksh' : '$$'} {method === 'mpesa' ? amount.toLocaleString() : usdAmount.toFixed(2)}</span>
            {method !== 'mpesa' && (
              <span className="text-xs opacity-70">≈ Ksh {amount.toLocaleString()}</span>
            )}
          </div>
        )}
      </button>

      {isPending && method === 'mpesa' && (
        <div className="space-y-3">
          <div className="alert alert-info">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5" />
              <div>
                <p className="font-medium">Payment Initiated!</p>
                <ul className="text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Check your phone for M-Pesa prompt</li>
                  <li>Enter your M-Pesa PIN to approve payment</li>
                  <li>Wait for confirmation SMS from M-Pesa</li>
                  <li>Payment will auto-complete in 1-2 minutes</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleManualCheck}
            className="btn btn-outline w-full"
          >
            <Check className="w-4 h-4 mr-2" />
            I've Completed Payment
          </button>
        </div>
      )}

      {isPending && method === 'paypal' && (
        <div className="space-y-3">
          <div className="alert alert-info">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5" />
              <div>
                <p className="font-medium">Redirecting to PayPal</p>
                <p className="text-sm">
                  You will be redirected to PayPal to complete your payment of ${usdAmount.toFixed(2)}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  Exchange rate: 1 USD ≈ Ksh {exchangeRate}
                </p>
              </div>
            </div>
          </div>
          <div className="alert alert-warning">
            <Globe className="w-4 h-4" />
            <span className="text-sm">
              International payments may take 2-3 minutes to process
            </span>
          </div>
        </div>
      )}
    </div>
  )
}