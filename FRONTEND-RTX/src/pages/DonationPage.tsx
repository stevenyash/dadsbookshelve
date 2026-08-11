import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/store'
import api from '@/lib/api'
import { Loader2, Heart, Smartphone, CreditCard, Check, AlertCircle, ArrowLeft, Globe } from 'lucide-react'

interface DonationRecord {
  id: number
  name: string
  amount: string
  phone_number: string
  status: string
  reference: string
  payment_type: string
  created_at?: string
}

interface LimitlessContent {
  id: number
  content: string
}

function useLimitlessContent() {
  return useQuery({
    queryKey: ['limitless', 'current'],
    queryFn: async () => {
      const res = await api.get('limitless/current')
      return res.data as LimitlessContent | null
    },
  })
}

function useDonationSubmit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      amount: string
      phone_number: string
      payment_type: string
      details?: string
    }) => api.post('donations/add', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
  })
}

const AMOUNT_OPTIONS = [
  { value: '100', label: 'Ksh 100', description: 'Small contribution' },
  { value: '250', label: 'Ksh 250', description: 'Coffee & snack' },
  { value: '500', label: 'Ksh 500', description: 'Book donation' },
  { value: '1000', label: 'Ksh 1,000', description: 'Monthly support' },
  { value: '2500', label: 'Ksh 2,500', description: 'Quarterly support' },
  { value: '5000', label: 'Ksh 5,000', description: 'Semester support' },
  { value: '10000', label: 'Ksh 10,000', description: 'Yearly support' },
]

export default function DonationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [paymentType, setPaymentType] = useState<'mpesa' | 'paypal' | 'manual'>('mpesa')
  const [status, setStatus] = useState<'idle' | 'initiated' | 'pending' | 'completed' | 'failed'>('idle')
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [error, setError] = useState('')
  const [donationId, setDonationId] = useState<number | null>(null)
  const [exchangeRate] = useState(150)
  
  const selectedAmount = customAmount || ''
  const usdAmount = selectedAmount ? (parseInt(selectedAmount) / exchangeRate).toFixed(2) : '0'

  const { data: limitless } = useLimitlessContent()
  const submitMutation = useDonationSubmit()

  // Auto-fill from logged in user
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setPhone(user.telephone || '')
    }
  }, [user])

  const handleInitiate = async () => {
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!selectedAmount || parseInt(selectedAmount) < 10) {
      setError('Please enter a valid amount')
      return
    }
    if (paymentType === 'mpesa' && !phone) {
      setError('Please enter your phone number')
      return
    }

    setError('')
    setStatus('initiated')

    try {
      // Create donation record first
      const res = await api.post('donations/add', {
        name: name.trim(),
        amount: selectedAmount,
        phone_number: phone.trim(),
        payment_type: paymentType,
        details: 'Limitless Initiative donation',
      })
      
      const donationData = res.data
      setDonationId(donationData.id)
      
      if (paymentType === 'mpesa' && phone) {
        // Initiate M-Pesa STK push
        const mpesaRes = await api.post('mpesa/stk-push', {
          phone: phone.replace(/^0/, '254'),
          amount: parseInt(selectedAmount),
          accountReference: 'LIMITLESS',
          description: 'Limitless Initiative donation',
        })
        
        const mpesaData = mpesaRes.data
        if (mpesaData.checkoutRequestId) {
          setCheckoutRequestId(mpesaData.checkoutRequestId)
          setStatus('pending')
          
          // Update donation with checkout request ID
          await api.post(`donations/edit/${donationData.id}`, {
            CheckoutRequestID: mpesaData.checkoutRequestId,
          })
          
          // Auto-check for completion after 30 seconds
          setTimeout(async () => {
            if (status === 'pending') {
              await handleVerify()
            }
          }, 30000)
        } else {
          setStatus('completed')
        }
      } else if (paymentType === 'paypal') {
        // Initiate PayPal donation
        const usdAmount = parseInt(selectedAmount) / 150 // Approximate rate
        
        const paypalRes = await api.post('payments/create-paypal', {
          user_id: user?.user_id || 0,
          amount: parseFloat(usdAmount.toFixed(2)),
          currency: 'USD',
          module: 'donations',
          metadata: {
            module: 'donations',
            donationId: donationData.id,
            name: name.trim(),
          },
          description: 'Donation to Limitless Initiative',
        })
        
        const paypalData = paypalRes.data
        console.log('PayPal response:', paypalData)
        const paypalResult = paypalData.data || paypalData
        if (!paypalResult.approveUrl) {
          const errorMsg = paypalData.message || paypalResult.message || 'Failed to create PayPal order'
          setError(errorMsg)
          setStatus('failed')
        } else if (paypalResult.approveUrl) {
          // Update donation with reference
          await api.post(`donations/edit/${donationData.id}`, {
            reference: paypalResult.orderId,
          })
          
          // Redirect to PayPal
          setTimeout(() => {
            window.location.href = paypalResult.approveUrl
          }, 1500)
          
          setStatus('pending')
        } else {
          setError('Failed to create PayPal order')
          setStatus('failed')
        }
      } else {
        // Manual donation - mark as pending
        setStatus('pending')
      }
    } catch (err: any) {
      console.error('Donation error:', err)
      setError(err.response?.data?.message || err.message || 'Failed to process donation')
      setStatus('failed')
    }
  }

  const handleVerify = async () => {
    if (!checkoutRequestId) return
    
    try {
      const res = await api.post('mpesa/stk-query', {
        checkoutRequestId,
      })
      
      if (res.data.responseCode === '0') {
        setStatus('completed')
        // Update donation status
        await api.post(`donations/edit/${donationId}`, {
          status: 'completed',
        })
      }
    } catch (err) {
      console.error('Verify error:', err)
    }
  }

  const handleManualConfirm = async () => {
    await handleVerify()
    if (status === 'completed') {
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    }
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body items-center text-center">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h2 className="card-title text-2xl font-bold text-success mb-2">
              Thank You!
            </h2>
            <p className="opacity-70 mb-6">
              Your donation of Ksh {selectedAmount} has been received. 
              May God bless you abundantly for your generosity!
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/limitlessintiative')}
                className="btn btn-primary"
              >
                Back to Initiative
              </button>
              <button
                onClick={() => {
                  setStatus('idle')
                  setDonationId(null)
                }}
                className="btn btn-outline"
              >
                Make Another Donation
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <button
          onClick={() => navigate('/limitlessintiative')}
          className="btn btn-ghost mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl font-bold text-center mb-2">
              <Heart className="w-6 h-6 inline mr-2 text-error" />
              Support the Limitless Initiative
            </h1>
            <p className="text-center opacity-70 mb-6">
              Your donation helps provide education access for all
            </p>

            {/* Limitless Content */}
            {limitless?.content && (
              <div className="mb-6 p-4 bg-base-200 rounded-lg">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: limitless.content.substring(0, 300) + '...' }}
                />
              </div>
            )}

            {/* Amount Selection */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-bold">Select Amount</span>
              </label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {AMOUNT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setCustomAmount(opt.value)
                      setStatus('idle')
                    }}
                    className={`btn btn-sm ${
                      selectedAmount === opt.value
                        ? 'btn-primary'
                        : 'btn-outline'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="number"
                  placeholder="Or enter custom amount"
                  className="input input-bordered w-full"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value)
                    setStatus('idle')
                  }}
                />
              </div>
            </div>

            {/* Name */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Your Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input input-bordered"
              />
            </div>

            {/* Payment Method */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Payment Method</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentType('mpesa')}
                  className={`btn flex-1 ${
                    paymentType === 'mpesa' ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  M-Pesa
                </button>
                <button
                  onClick={() => setPaymentType('paypal')}
                  className={`btn flex-1 ${
                    paymentType === 'paypal' ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  PayPal
                </button>
              </div>
            </div>

            {/* Phone (for M-Pesa) */}
            {paymentType === 'mpesa' && (
              <div className="form-control mb-4">
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
                <label className="label">
                  <span className="label-text-alt">
                    We'll send an STK prompt to this number
                  </span>
                </label>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="alert alert-error mb-4">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Status Messages */}
            {status === 'pending' && paymentType === 'mpesa' && (
              <div className="alert alert-info mb-4">
                <div>
                  <p className="font-bold">Check your phone!</p>
                  <p className="text-sm">
                    Enter your M-Pesa PIN to confirm payment of Ksh {selectedAmount}
                  </p>
                </div>
              </div>
            )}
            {status === 'pending' && paymentType === 'paypal' && (
              <div className="alert alert-info mb-4">
                <div>
                  <p className="font-bold">Redirecting to PayPal...</p>
                  <p className="text-sm">
                    You will be redirected to PayPal to complete your donation of ${usdAmount}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleInitiate}
              disabled={status === 'initiated' || submitMutation.isPending}
              className={`btn btn-block ${
                status === 'failed' ? 'btn-error' : 'btn-primary'
              } ${submitMutation.isPending ? 'loading' : ''}`}
            >
              {status === 'initiated' || submitMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : status === 'failed' ? (
                'Try Again'
              ) : (
                <>
                  {paymentType === 'mpesa' ? (
                    <>Donate Ksh {selectedAmount || '0'} via M-Pesa</>
                  ) : paymentType === 'paypal' ? (
                    <>Donate ${usdAmount} via PayPal (≈Ksh {selectedAmount || '0'})</>
                  ) : (
                    <>Donate Ksh {selectedAmount || '0'}</>
                  )}
                </>
              )}
            </button>

            {/* Manual Confirm */}
            {status === 'pending' && paymentType === 'mpesa' && (
              <button
                onClick={handleManualConfirm}
                className="btn btn-outline btn-block mt-2"
              >
                I've Completed Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}