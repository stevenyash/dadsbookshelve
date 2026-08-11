import { useCallback, useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/store'
import { paymentModuleApi } from '@/lib/api'
import type { PaymentStatus } from '@/lib/paymentTypes'

interface PayPalPaymentOptions {
  amount: number
  currency?: string
  module: string
  description?: string
  metadata?: Record<string, any>
  autoVerify?: boolean
  onSuccess?: () => void
  onFailed?: (error: string) => void
  onPending?: (orderId: string) => void
}

const VERIFICATION_INTERVAL = 3000
const MAX_ATTEMPTS = 30

export function usePayPalPayment() {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const user = useAuthStore(state => state.user)

  const initiate = useCallback(async (options: PayPalPaymentOptions) => {
    if (!user?.user_id) {
      const err = 'Please login first'
      options.onFailed?.(err)
      setError(err)
      setStatus('failed')
      return null
    }

    setStatus('processing')
    setError(null)

    try {
      const response = await paymentModuleApi.createPayPal({
        user_id: parseInt(user.user_id),
        amount: options.amount,
        currency: options.currency || 'USD',
        module: options.module,
        metadata: options.metadata,
        description: options.description,
      })

      const data = response.data.data || response.data

      if (!data.orderId) {
        const err = data.message || 'Failed to create PayPal order'
        setStatus('failed')
        setError(err)
        options.onFailed?.(err)
        return null
      }

      setOrderId(data.orderId)
      setStatus('pending')
      options.onPending?.(data.orderId)

      // If we got approval, automatically capture
      await capture(data.orderId, options)

      return { orderId: data.orderId }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payment failed'
      setStatus('failed')
      setError(errMsg)
      options.onFailed?.(errMsg)
      return null
    }
  }, [user])

  const capture = useCallback(async (payPalOrderId: string, options?: {
    onSuccess?: () => void
    onFailed?: (error: string) => void
  }) => {
    if (!user?.user_id || !payPalOrderId) return

    try {
      const response = await paymentModuleApi.capturePayPal(payPalOrderId, parseInt(user.user_id))
      const data = response.data.data || response.data

      if (data.status === 'completed') {
        setStatus('completed')
        options?.onSuccess?.()
        return { success: true }
      }

      const err = data.message || 'Payment not completed'
      setStatus('failed')
      setError(err)
      options?.onFailed?.(err)
      return { success: false, message: err }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payment failed'
      setStatus('failed')
      setError(errMsg)
      options?.onFailed?.(errMsg)
      return { success: false, message: errMsg }
    }
  }, [user])

  const verify = useCallback(async (payPalOrderId: string) => {
    if (!payPalOrderId) {
      return { success: false, status: 'failed', message: 'No order ID' }
    }

    if (verificationAttempts > MAX_ATTEMPTS) {
      setStatus('timeout')
      return { success: false, status: 'timeout', message: 'Verification timed out' }
    }

    setVerificationAttempts(prev => prev + 1)

    try {
      const response = await paymentModuleApi.verifyPayPal(payPalOrderId)
      const data = response.data.data || response.data

      if (data.status === 'completed') {
        setStatus('completed')
        return { success: true, status: 'completed' }
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
        message: err.response?.data?.message || err.message,
      }
    }
  }, [verificationAttempts])

  const startVerification = useCallback(async (payPalOrderId: string, options?: {
    onSuccess?: () => void
    onFailed?: (error: string) => void
  }) => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current)
    }

    setStatus('pending')

    verifyIntervalRef.current = setInterval(async () => {
      const result = await verify(payPalOrderId)

      if (result.success || result.status === 'cancelled' || result.status === 'failed' || result.status === 'timeout') {
        if (verifyIntervalRef.current) {
          clearInterval(verifyIntervalRef.current)
          verifyIntervalRef.current = null
        }

        if (result.success) {
          options?.onSuccess?.()
        } else {
          options?.onFailed?.(result.message || `Payment ${result.status}`)
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

  const reset = useCallback(() => {
    stopVerification()
    setStatus('idle')
    setOrderId(null)
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
    status,
    orderId,
    error,
    verificationAttempts,
    isIdle: status === 'idle',
    isProcessing: status === 'processing',
    isPending: status === 'pending',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    initiate,
    capture,
    verify,
    reset,
  }
}

export function useCombinedPayment() {
  const [method, setMethod] = useState<'mpesa' | 'paypal'>('mpesa')

  const mpesaPayment = usePayPalPayment()

  const pay = useCallback(async (options: PayPalPaymentOptions) => {
    if (method === 'paypal') {
      return mpesaPayment.initiate(options)
    }

    setError('Direct M-Pesa not supported in this hook, use usePaymentModule')
    return null
  }, [method, mpesaPayment])

  return {
    method,
    setMethod,
    ...mpesaPayment,
    pay,
  }
}