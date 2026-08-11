/**
 * @deprecated Use @/hooks/payment/modules instead
 * This hook is maintained for backward compatibility
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/store'
import { paymentModuleApi } from '@/lib/api'

type PaymentMethod = 'mpesa' | 'paypal'
type PaymentStatus = 'idle' | 'processing' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout'

interface PaymentResult {
  checkoutRequestId: string
  paymentId?: number
  status: string
}

interface PaymentOptions {
  amount: number
  currency?: string
  phone?: string
  method?: PaymentMethod
  description?: string
  metadata?: Record<string, any>
  onSuccess?: (result: PaymentResult) => void
  onFailed?: (error: string) => void
  onPending?: (checkoutRequestId: string) => void
}

const VERIFICATION_INTERVAL = 5000
const MAX_VERIFICATION_ATTEMPTS = 18 // 1.5 minutes

export function usePayment() {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentMethod = useRef<PaymentMethod>('mpesa')
  
  const user = useAuthStore(state => state.user)

  const executePayment = useCallback(async (
    module: string,
    options: PaymentOptions,
    onPostPayment?: () => void | Promise<void>
  ) => {
    if (!user?.user_id) {
      const err = 'Please login first'
      options.onFailed?.(err)
      setError(err)
      setStatus('failed')
      return null
    }

    const method = options.method || 'mpesa'
    currentMethod.current = method

    if (method === 'mpesa' && !options.phone) {
      const err = 'Phone number required for M-Pesa'
      options.onFailed?.(err)
      setError(err)
      setStatus('failed')
      return null
    }

    setStatus('processing')
    setError(null)
    setVerificationAttempts(0)

    try {
      const response = await paymentModuleApi.initiate({
        user_id: parseInt(user.user_id),
        amount: options.amount,
        currency: options.currency || 'KES',
        method,
        reference: `${module}-${Date.now()}`,
        module,
        metadata: options.metadata,
        phone: options.phone,
        description: options.description,
      })

      const data = response.data.data || response.data

      if (!data.success && !response.data.success) {
        const err = data.message || response.data.message || 'Payment initiation failed'
        setStatus('failed')
        setError(err)
        options.onFailed?.(err)
        return null
      }

      const newCheckoutRequestId = data.checkoutRequestId || response.data.checkoutRequestId
      const newPaymentId = data.paymentId || response.data.paymentId

      setCheckoutRequestId(newCheckoutRequestId)
      setPaymentId(newPaymentId)
      setStatus('pending')
      options.onPending?.(newCheckoutRequestId)

      startVerification(module, newCheckoutRequestId, options, onPostPayment)

      return { checkoutRequestId: newCheckoutRequestId, paymentId: newPaymentId }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payment failed'
      setStatus('failed')
      setError(errMsg)
      options.onFailed?.(errMsg)
      return null
    }
  }, [user])

  const verify = useCallback(async (module: string, checkoutReqId: string) => {
    if (!checkoutReqId) {
      return { success: false, status: 'failed', message: 'No checkout request ID' }
    }

    if (verificationAttempts > MAX_VERIFICATION_ATTEMPTS) {
      setStatus('timeout')
      return { success: false, status: 'timeout', message: 'Verification timed out' }
    }

    setVerificationAttempts(prev => prev + 1)

    try {
      const response = await paymentModuleApi.verify(checkoutReqId, module)
      const data = response.data.data || response.data

      if (data.status === 'completed') {
        setStatus('completed')
        return { success: true, status: 'completed', payment: data.payment }
      }

      if (data.status === 'cancelled' || data.status === 'failed') {
        setStatus(data.status)
        return { success: false, status: data.status, message: data.message }
      }

      return { success: false, status: 'pending', message: data.message }
    } catch (err: any) {
      return { 
        success: false, 
        status: 'pending', 
        message: err.response?.data?.message || err.message 
      }
    }
  }, [verificationAttempts])

  const startVerification = useCallback((
    module: string,
    checkoutReqId: string,
    options: PaymentOptions,
    onPostPayment?: () => void | Promise<void>
  ) => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current)
    }

    setStatus('pending')

    verifyIntervalRef.current = setInterval(async () => {
      const result = await verify(module, checkoutReqId)

      if (result.success) {
        if (verifyIntervalRef.current) {
          clearInterval(verifyIntervalRef.current)
          verifyIntervalRef.current = null
        }
        
        const paymentResult: PaymentResult = {
          checkoutRequestId: checkoutReqId,
          paymentId: result.payment?.id,
          status: result.status,
        }
        
        setStatus('completed')
        options.onSuccess?.(paymentResult)
        
        if (onPostPayment) {
          onPostPayment()
        }
      } else if (result.status === 'cancelled' || result.status === 'failed' || result.status === 'timeout') {
        if (verifyIntervalRef.current) {
          clearInterval(verifyIntervalRef.current)
          verifyIntervalRef.current = null
        }
        
        setStatus(result.status)
        options.onFailed?.(result.message || `Payment ${result.status}`)
      }
    }, VERIFICATION_INTERVAL)
  }, [verify])

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
    setPaymentId(null)
    setError(null)
    setVerificationAttempts(0)
  }, [stopVerification])

  const cancel = useCallback(() => {
    stopVerification()
    setStatus('cancelled')
    setCheckoutRequestId(null)
  }, [stopVerification])

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
    paymentId,
    error,
    verificationAttempts,
    isIdle: status === 'idle',
    isProcessing: status === 'processing',
    isPending: status === 'pending',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    isCancelled: status === 'cancelled',
    isTimeout: status === 'timeout',
    executePayment,
    stopVerification,
    reset,
    cancel,
  }
}

// Decoupled payment hook - just handles payment, caller handles post-payment
export function useDecoupledPayment() {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  const statusRef = useRef(status)
  statusRef.current = status

  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const user = useAuthStore(state => state.user)

  const pay = useCallback(async (
    params: {
      module: string
      amount: number
      currency?: string
      phone?: string
      method?: 'mpesa' | 'paypal'
      description?: string
      metadata?: Record<string, any>
    },
    onSuccess?: () => void | Promise<void>,
    onFailed?: (error: string) => void
  ) => {
    if (!user?.user_id) {
      const err = 'Please login first'
      setError(err)
      setStatus('failed')
      onFailed?.(err)
      return null
    }

    const method = params.method || 'mpesa'
    const module = params.module
    const moduleForPoll = params.module
    
    if (method === 'mpesa' && !params.phone) {
      const err = 'Phone number required'
      setError(err)
      setStatus('failed')
      onFailed?.(err)
      return null
    }

    setStatus('processing')
    setError(null)
    setVerificationAttempts(0)

    try {
      const response = await paymentModuleApi.initiate({
        user_id: parseInt(user.user_id),
        amount: params.amount,
        currency: params.currency || 'KES',
        method,
        reference: `PAY-${Date.now()}`,
        module: params.module,
        metadata: params.metadata,
        phone: params.phone,
        description: params.description,
      })

      const data = response.data.data || response.data

      if (!data.success && !response.data.success) {
        const err = data.message || 'Payment initiation failed'
        setStatus('failed')
        setError(err)
        onFailed?.(err)
        return null
      }

      const newCheckoutRequestId = data.checkoutRequestId || response.data.checkoutRequestId
      const newPaymentId = data.paymentId || data.paymentId || response.data.paymentId
      const accessToken = data.accessToken // For PayPal - this is the orderId
      const approveUrl = data.approveUrl // PayPal approval URL from backend

      setCheckoutRequestId(newCheckoutRequestId)
      setPaymentId(newPaymentId)
      console.log('[usePayment] Payment initiated for:', method, 'checkoutRequestId:', newCheckoutRequestId)

      // For PayPal, don't start polling - return the approval URL for redirect
      if (method === 'paypal' && accessToken) {
        setStatus('pending')
        // Return PayPal-specific data for redirect
        return { 
          checkoutRequestId: newCheckoutRequestId, 
          paymentId: newPaymentId,
          paypalOrderId: accessToken,
          approveUrl: approveUrl,
          isPayPal: true
        }
      }

      // For M-Pesa, start polling
      setStatus('pending')
      console.log('[usePayment] M-Pesa payment initiated, status set to pending')

      return { checkoutRequestId: newCheckoutRequestId, paymentId: newPaymentId }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payment failed'
      setStatus('failed')
      setError(errMsg)
      onFailed?.(errMsg)
      return null
    }
  }, [user])

  // Start polling when status becomes pending for M-Pesa (non-PayPal payments)
  useEffect(() => {
    if (status === 'pending' && checkoutRequestId && !checkoutRequestId.startsWith('PAYPAL-')) {
      console.log('[usePayment] Effect triggered, starting polling for:', checkoutRequestId)
      const timer = setTimeout(() => {
        pollVerification(
          'library_subscription', 
          checkoutRequestId, 
          () => setStatus('completed'),
          () => {}
        )
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [status, checkoutRequestId])

  const pollVerification = useCallback(async (
    module: string,
    checkoutReqId: string,
    onSuccess?: () => void | Promise<void>,
    onFailed?: (error: string) => void
  ) => {
    const check = async (): Promise<boolean> => {
      if (verificationAttempts > MAX_VERIFICATION_ATTEMPTS) {
        console.log('[usePayment] Verification timed out after', verificationAttempts, 'attempts')
        setStatus('timeout')
        onFailed?.('Payment verification timed out. Please click "I\'ve completed payment" to check manually.')
        return true
      }

      setVerificationAttempts(prev => prev + 1)
      console.log('[usePayment] Verification check attempt:', verificationAttempts, 'for:', checkoutReqId)

      try {
        const response = await paymentModuleApi.verify(checkoutReqId, module)
        const data = response.data.data || response.data
        const currentStatus = data.status
        console.log('[usePayment] Verification response:', currentStatus, data)

        if (currentStatus === 'completed') {
          setStatus('completed')
          onSuccess?.()
          return true
        }

        // PayPal specific statuses
        if (currentStatus === 'CREATED' || currentStatus === 'PENDING') {
          // PayPal order created but not yet paid - keep polling
          return false
        }

        if (currentStatus === 'cancelled' || currentStatus === 'failed') {
          setStatus(currentStatus)
          onFailed?.(data.message || `Payment ${currentStatus}`)
          return true
        }

        return false
      } catch (err: any) {
        return false
      }
    }

    const poll = async () => {
      const done = await check()
      // Use ref to always get current status value
      if (!done && statusRef.current === 'pending') {
        verifyIntervalRef.current = setTimeout(poll, VERIFICATION_INTERVAL)
      }
    }

    // Start polling immediately
    poll()
  }, [verificationAttempts]) // Removed 'status' from deps since we use ref

  const stop = useCallback(() => {
    if (verifyIntervalRef.current) {
      clearTimeout(verifyIntervalRef.current)
      verifyIntervalRef.current = null
    }
    setVerificationAttempts(0)
  }, [])

  const reset = useCallback(() => {
    stop()
    setStatus('idle')
    setCheckoutRequestId(null)
    setPaymentId(null)
    setError(null)
    setVerificationAttempts(0)
  }, [stop])

  useEffect(() => {
    return () => {
      if (verifyIntervalRef.current) {
        clearTimeout(verifyIntervalRef.current)
      }
    }
  }, [])

  return {
    status,
    checkoutRequestId,
    paymentId,
    error,
    verificationAttempts,
    isProcessing: status === 'processing',
    isPending: status === 'pending',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    isTimeout: status === 'timeout',
    setStatus,
    pay,
    stop,
    reset,
    verify: pollVerification,
  }
}