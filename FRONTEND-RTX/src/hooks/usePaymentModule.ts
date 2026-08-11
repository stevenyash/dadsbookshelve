/**
 * @deprecated Use @/hooks/payment/modules instead
 * This hook is maintained for backward compatibility
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/store'
import { paymentModuleApi, libraryApi } from '@/lib/api'
import type { PaymentStatus } from '@/lib/paymentTypes'

export type PaymentModule = 
  | 'library_subscription' 
  | 'book_purchase' 
  | 'donation' 
  | 'membership'
  | 'ebook'
  | 'custom'

export interface PaymentModuleOptions {
  module: PaymentModule
  amount?: number
  phone?: string
  metadata?: Record<string, any>
  description?: string
  autoVerify?: boolean
  onSuccess?: (result: PaymentCompleteResult) => void
  onFailed?: (error: string) => void
  onPending?: (checkoutRequestId: string) => void
}

export interface PaymentCompleteResult {
  checkoutRequestId: string
  paymentId?: number
  status: string
}

const VERIFICATION_INTERVAL = 3000
const MAX_VERIFICATION_ATTEMPTS = 30

export function usePaymentModule() {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentModule = useRef<PaymentModule | null>(null)

  const user = useAuthStore(state => state.user)

  const initiate = useCallback(async (options: PaymentModuleOptions) => {
    if (!user?.user_id) {
      const err = 'Please login first'
      options.onFailed?.(err)
      setError(err)
      setStatus('failed')
      return null
    }

    if (!options.module) {
      const err = 'Payment module is required'
      options.onFailed?.(err)
      setError(err)
      setStatus('failed')
      return null
    }

    setStatus('processing')
    setError(null)
    currentModule.current = options.module

    try {
      const response = await paymentModuleApi.initiate({
        user_id: parseInt(user.user_id),
        amount: options.amount || 0,
        method: 'mpesa',
        reference: `${options.module}-${Date.now()}`,
        module: options.module,
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
      setVerificationAttempts(0)

      options.onPending?.(newCheckoutRequestId)

      if (options.autoVerify !== false) {
        startVerification(options.module, newCheckoutRequestId, options)
      }

      return { checkoutRequestId: newCheckoutRequestId, paymentId: newPaymentId }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payment failed'
      setStatus('failed')
      setError(errMsg)
      options.onFailed?.(errMsg)
      return null
    }
  }, [user])

  const verify = useCallback(async (
    module: PaymentModule,
    checkoutReqId: string,
    options?: Pick<PaymentModuleOptions, 'onSuccess' | 'onFailed'>
  ) => {
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
        options?.onSuccess?.({
          checkoutRequestId: checkoutReqId,
          paymentId: data.payment?.id,
          status: data.status,
        })
        return { success: true, status: 'completed', payment: data.payment }
      }

      if (data.status === 'cancelled' || data.status === 'failed') {
        setStatus(data.status)
        options?.onFailed?.(data.message || `Payment ${data.status}`)
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
    module: PaymentModule,
    checkoutReqId: string,
    options?: Pick<PaymentModuleOptions, 'onSuccess' | 'onFailed'>
  ) => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current)
    }

    setStatus('pending')

    verifyIntervalRef.current = setInterval(async () => {
      const result = await verify(module, checkoutReqId, options)

      if (result.success || result.status === 'cancelled' || result.status === 'failed' || result.status === 'timeout') {
        if (verifyIntervalRef.current) {
          clearInterval(verifyIntervalRef.current)
          verifyIntervalRef.current = null
        }
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

  const confirmPayment = useCallback(async (module: PaymentModule) => {
    if (!checkoutRequestId) {
      return { success: false, message: 'No checkout request ID' }
    }

    try {
      const response = await paymentModuleApi.verify(checkoutRequestId, module)
      const data = response.data.data || response.data

      if (data.status === 'completed') {
        setStatus('completed')
        return { success: true, status: 'completed', payment: data.payment }
      }

      return { success: false, status: data.status, message: data.message }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }, [checkoutRequestId])

  const reset = useCallback(() => {
    stopVerification()
    setStatus('idle')
    setCheckoutRequestId(null)
    setPaymentId(null)
    setError(null)
    setVerificationAttempts(0)
    currentModule.current = null
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
    initiate,
    verify,
    confirmPayment,
    startVerification,
    stopVerification,
    reset,
  }
}

export function createPaymentModuleHook(defaultModule: PaymentModule) {
  return function useModulePayment(options?: Omit<PaymentModuleOptions, 'module'>) {
    const payment = usePaymentModule()
    
    return {
      ...payment,
      pay: (opts?: Omit<PaymentModuleOptions, 'module' | 'onSuccess' | 'onFailed' | 'onPending'>) => {
        const finalOptions: PaymentModuleOptions = {
          module: defaultModule,
          ...options,
          ...opts,
        }
        return payment.initiate(finalOptions)
      },
    }
  }
}