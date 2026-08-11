import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/store'
import { libraryApi, api } from '@/lib/api'
import { useCartStore } from '@/store/cartStore'
import { usePaymentModule, PaymentModule } from './usePaymentModule'

const VERIFICATION_INTERVAL = 3000
const MAX_ATTEMPTS = 30

export interface LibraryPlan {
  access_id: number
  access_type: string
  amount_kenya_shillings: string
  duration?: string
  description?: string
}

export interface LibraryPaymentOptions {
  plan?: LibraryPlan
  phone?: string
  autoVerify?: boolean
  onPending?: (checkoutRequestId: string) => void
  onSuccess?: () => void
  onFailed?: (error: string) => void
}

export function useLibraryPayment() {
  const [plans, setPlans] = useState<LibraryPlan[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<LibraryPlan | null>(null)

  const user = useAuthStore(state => state.user)
  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [status, setStatus] = useState<'idle' | 'processing' | 'pending' | 'completed' | 'failed'>('idle')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  const fetchPlans = useCallback(async () => {
    setIsLoadingPlans(true)
    try {
      const res = await libraryApi.getPlans()
      setPlans(res.data.records || res.data || [])
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    } finally {
      setIsLoadingPlans(false)
    }
  }, [])

  const selectPlan = useCallback((plan: LibraryPlan) => {
    setSelectedPlan(plan)
  }, [])

  const initiatePayment = useCallback(async (options?: Omit<LibraryPaymentOptions, 'plan'>) => {
    if (!user?.user_id) {
      const err = 'Please login first'
      options?.onFailed?.(err)
      setError(err)
      return null
    }

    const plan = selectedPlan || options?.plan
    if (!plan) {
      const err = 'Please select a subscription plan'
      options?.onFailed?.(err)
      setError(err)
      return null
    }

    const phone = options?.phone
    if (!phone) {
      const err = 'Phone number required'
      options?.onFailed?.(err)
      setError(err)
      return null
    }

    setStatus('processing')
    setError(null)
    setVerificationAttempts(0)

    try {
      const response = await libraryApi.subscribe({
        user_id: user.user_id,
        access_id: String(plan.access_id),
        phone: phone,
      })

      const data = response.data

      if (!data.checkoutRequestId) {
        const err = data.message || 'Failed to initiate payment'
        setStatus('failed')
        setError(err)
        options?.onFailed?.(err)
        return null
      }

      setCheckoutRequestId(data.checkoutRequestId)
      setStatus('pending')
      options?.onPending?.(data.checkoutRequestId)

      if (options?.autoVerify !== false) {
        startVerification(data.checkoutRequestId, options)
      }

      return { checkoutRequestId: data.checkoutRequestId, paymentId: data.paymentId }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payment failed'
      setStatus('failed')
      setError(errMsg)
      options?.onFailed?.(errMsg)
      return null
    }
  }, [user, selectedPlan])

  const verifyPayment = useCallback(async (reqId: string) => {
    if (verificationAttempts > MAX_ATTEMPTS) {
      setStatus('timeout')
      return { success: false, status: 'timeout', message: 'Verification timed out' }
    }

    setVerificationAttempts(prev => prev + 1)

    try {
      const response = await libraryApi.checkStatus(reqId)
      const data = response.data

      if (data.status === 'completed') {
        setStatus('completed')
        setCheckoutRequestId(null)
        stopVerification()
        return { success: true, status: 'completed' }
      }

      if (data.status === 'cancelled' || data.status === 'failed') {
        setStatus('failed')
        return { success: false, status: data.status, message: data.result }
      }

      return { success: false, status: 'pending', message: data.result }
    } catch (err: any) {
      return { 
        success: false, 
        status: 'pending', 
        message: err.response?.data?.message || err.message 
      }
    }
  }, [verificationAttempts])

  const startVerification = useCallback((reqId: string, options?: Omit<LibraryPaymentOptions, 'plan'>) => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current)
    }

    setStatus('pending')

    verifyIntervalRef.current = setInterval(async () => {
      const result = await verifyPayment(reqId)

      if (result.success || result.status === 'cancelled' || result.status === 'failed' || result.status === 'timeout') {
        if (result.success) {
          options?.onSuccess?.()
        } else if (result.status !== 'pending') {
          options?.onFailed?.(result.message || `Payment ${result.status}`)
        }
        
        if (verifyIntervalRef.current) {
          clearInterval(verifyIntervalRef.current)
          verifyIntervalRef.current = null
        }
      }
    }, VERIFICATION_INTERVAL)
  }, [verifyPayment])

  const stopVerification = useCallback(() => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current)
      verifyIntervalRef.current = null
    }
    setVerificationAttempts(0)
  }, [])

  const confirmPayment = useCallback(async () => {
    const reqId = checkoutRequestId
    if (!reqId) return { success: false, status: 'failed', message: 'No checkout request ID' }

    try {
      const res = await libraryApi.confirmPayment({
        checkoutRequestId: reqId,
        userId: user?.user_id || '',
      })

      const data = res.data

      if (data.success || data.confirmed) {
        setStatus('completed')
        setCheckoutRequestId(null)
        stopVerification()
        return { success: true, status: 'completed' }
      }

      return { success: false, status: 'failed', message: data.message }
    } catch (err: any) {
      return { success: false, status: 'failed', message: err.message }
    }
  }, [checkoutRequestId, user, stopVerification])

  const reset = useCallback(() => {
    stopVerification()
    setStatus('idle')
    setCheckoutRequestId(null)
    setError(null)
    setVerificationAttempts(0)
  }, [stopVerification])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  useEffect(() => {
    return () => {
      if (verifyIntervalRef.current) {
        clearInterval(verifyIntervalRef.current)
      }
    }
  }, [])

  return {
    plans,
    isLoadingPlans,
    selectedPlan,
    selectPlan,
    status,
    checkoutRequestId,
    error,
    isProcessing: status === 'processing',
    isPending: status === 'pending',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    isTimeout: status === 'timeout',
    initiatePayment,
    confirmPayment,
    reset,
    fetchPlans,
  }
}

export function useLibrarySubscriptionPayment(userId: string | undefined, options?: {
  onSuccess?: () => void
  onFailed?: (error: string) => void
}) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const subscribe = useCallback(async (accessId: string, phone: string, amount: string) => {
    if (!userId || !phone || !accessId) {
      const err = 'Missing required fields'
      setError(err)
      options?.onFailed?.(err)
      return
    }

    setStatus('processing')
    setError(null)

    try {
      const res = await libraryApi.subscribe({
        user_id: userId,
        access_id: accessId,
        phone,
      })

      const data = res.data

      if (!data.checkoutRequestId) {
        const err = data.message || 'Failed to initiate payment'
        setStatus('failed')
        setError(err)
        options?.onFailed?.(err)
        return
      }

      setCheckoutRequestId(data.checkoutRequestId)
      setStatus('pending')
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payment failed'
      setStatus('failed')
      setError(errMsg)
      options?.onFailed?.(errMsg)
    }
  }, [userId, options])

  const checkStatus = useCallback(async (reqId?: string) => {
    const id = reqId || checkoutRequestId
    if (!id) return

    const res = await libraryApi.checkStatus(id)
    const data = res.data

    if (data.status === 'completed') {
      setStatus('completed')
      setCheckoutRequestId(null)
      if (verifyIntervalRef.current) {
        clearInterval(verifyIntervalRef.current)
        verifyIntervalRef.current = null
      }
      options?.onSuccess?.()
    } else if (data.status === 'cancelled' || data.status === 'failed') {
      setStatus('failed')
      options?.onFailed?.(data.result || 'Payment failed')
    }
  }, [checkoutRequestId, options])

  const startVerification = useCallback((reqId?: string) => {
    const id = reqId || checkoutRequestId
    if (!id || verifyIntervalRef.current) return

    verifyIntervalRef.current = setInterval(() => {
      checkStatus(id)
    }, VERIFICATION_INTERVAL)
  }, [checkoutRequestId, checkStatus])

  const stopVerification = useCallback(() => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current)
      verifyIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (verifyIntervalRef.current) {
        clearInterval(verifyIntervalRef.current)
      }
    }
  }, [])

  return {
    status,
    checkoutRequestId,
    error,
    isPending: status === 'pending',
    isProcessing: status === 'processing',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    subscribe,
    checkStatus,
    startVerification,
    stopVerification,
  }
}

export function useCartPayment() {
  const { items, totalPrice, clearCart, customer, setCustomer } = useCartStore()
  const user = useAuthStore(state => state.user)

  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [status, setStatus] = useState<'idle' | 'processing' | 'pending' | 'completed' | 'failed'>('idle')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  const initiatePayment = useCallback(async (options?: {
    phone?: string
    autoVerify?: boolean
    onSuccess?: () => void
    onFailed?: (error: string) => void
    onPending?: (checkoutRequestId: string) => void
  }) => {
    if (!user?.user_id) {
      const err = 'Please login first'
      options?.onFailed?.(err)
      setError(err)
      return null
    }

    const phone = options?.phone || customer.phone
    if (!phone) {
      const err = 'Phone number required'
      options?.onFailed?.(err)
      setError(err)
      return null
    }

    if (items.length === 0) {
      const err = 'Cart is empty'
      options?.onFailed?.(err)
      setError(err)
      return null
    }

    setStatus('processing')
    setError(null)
    setVerificationAttempts(0)

    try {
      const response = await api.post('payments/add', {
        user_id: user.user_id,
        amount: totalPrice,
        currency: 'KES',
        payment_method: 'mpesa',
        reference: `CART-${Date.now()}`,
        metadata: {
          items: items.map(item => ({
            book_id: item.book_id,
            format: item.format,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      })

      const data = response.data

      if (!data.success && !data.data?.checkoutRequestId) {
        const err = data.message || 'Failed to initiate payment'
        setStatus('failed')
        setError(err)
        options?.onFailed?.(err)
        return null
      }

      const newCheckoutRequestId = data.data?.checkoutRequestId || data.data?.id?.toString()
      setCheckoutRequestId(newCheckoutRequestId)
      setStatus('pending')
      options?.onPending?.(newCheckoutRequestId)

      if (options?.autoVerify !== false) {
        startVerification(newCheckoutRequestId, options)
      }

      return { checkoutRequestId: newCheckoutRequestId }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payment failed'
      setStatus('failed')
      setError(errMsg)
      options?.onFailed?.(errMsg)
      return null
    }
  }, [user, customer.phone, items, totalPrice])

  const verifyPayment = useCallback(async (reqId: string) => {
    if (verificationAttempts > MAX_ATTEMPTS) {
      setStatus('timeout')
      return { success: false, status: 'timeout', message: 'Verification timed out' }
    }

    setVerificationAttempts(prev => prev + 1)

    try {
      const response = await api.post('payments/check-status', { checkoutRequestId: reqId })
      const data = response.data

      if (data.status === 'completed') {
        setStatus('completed')
        setCheckoutRequestId(null)
        stopVerification()
        clearCart()
        return { success: true, status: 'completed' }
      }

      if (data.status === 'cancelled' || data.status === 'failed') {
        setStatus('failed')
        return { success: false, status: data.status, message: data.result }
      }

      return { success: false, status: 'pending', message: data.result }
    } catch (err: any) {
      return { 
        success: false, 
        status: 'pending', 
        message: err.response?.data?.message || err.message 
      }
    }
  }, [verificationAttempts, clearCart])

  const startVerification = useCallback((reqId: string, options?: {
    onSuccess?: () => void
    onFailed?: (error: string) => void
  }) => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current)
    }

    setStatus('pending')

    verifyIntervalRef.current = setInterval(async () => {
      const result = await verifyPayment(reqId)

      if (result.success || result.status === 'cancelled' || result.status === 'failed' || result.status === 'timeout') {
        if (result.success) {
          options?.onSuccess?.()
        } else if (result.status !== 'pending') {
          options?.onFailed?.(result.message || `Payment ${result.status}`)
        }
        
        if (verifyIntervalRef.current) {
          clearInterval(verifyIntervalRef.current)
          verifyIntervalRef.current = null
        }
      }
    }, VERIFICATION_INTERVAL)
  }, [verifyPayment])

  const stopVerification = useCallback(() => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current)
      verifyIntervalRef.current = null
    }
    setVerificationAttempts(0)
  }, [])

  const reset = useCallback(() => {
    stopVerification()
    setStatus('idle')
    setCheckoutRequestId(null)
    setError(null)
    setVerificationAttempts(0)
  }, [stopVerification])

  useEffect(() => {
    return () => {
      if (verifyIntervalRef.current) {
        clearInterval(verifyIntervalRef.current)
      }
    }
  }, [])

  return {
    items,
    totalPrice,
    customer,
    status,
    checkoutRequestId,
    error,
    isProcessing: status === 'processing',
    isPending: status === 'pending',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    isTimeout: status === 'timeout',
    isEmpty: items.length === 0,
    setCustomer,
    clearCart,
    initiatePayment,
    reset,
  }
}