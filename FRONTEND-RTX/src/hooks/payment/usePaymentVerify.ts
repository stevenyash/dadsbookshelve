import { useCallback, useRef, useEffect } from 'react'
import { paymentModuleApi } from '@/lib/api'
import type { PaymentModule, PaymentVerifyResponse, PaymentInitiateResult } from './types'
import { 
  VERIFICATION_INTERVAL, 
  MAX_VERIFICATION_ATTEMPTS, 
  ERROR_MESSAGES 
} from './constants'
import { usePaymentCore } from './usePaymentCore'

interface UsePaymentVerifyOptions {
  module: PaymentModule
  onSuccess?: (result: PaymentInitiateResult) => void
  onFailed?: (error: string) => void
}

export function usePaymentVerify(options: UsePaymentVerifyOptions) {
  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const {
    state,
    statusRef,
    setStatus,
    setError,
    incrementVerificationAttempts,
    reset,
  } = usePaymentCore({ module: options.module })

  const verify = useCallback(async (checkoutRequestId: string): Promise<PaymentVerifyResponse> => {
    if (!checkoutRequestId) {
      return { success: false, status: 'failed', message: 'No checkout request ID', isFinal: true }
    }

    if (state.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      setStatus('timeout')
      const err = ERROR_MESSAGES.VERIFICATION_TIMEOUT
      setError(err)
      onFailed?.(err)
      return { success: false, status: 'timeout', message: err, isFinal: true }
    }

    incrementVerificationAttempts()

    try {
      const response = await paymentModuleApi.verify(checkoutRequestId, options.module)
      const data = response.data.data || response.data

      if (data.status === 'completed') {
        setStatus('completed')
        
        const result: PaymentInitiateResult = {
          checkoutRequestId,
          paymentId: data.payment?.id,
          status: 'completed',
          method: 'mpesa',
        }
        
        options.onSuccess?.(result)
        return { success: true, status: 'completed', payment: data.payment, isFinal: true }
      }

      if (data.status === 'cancelled' || data.status === 'failed') {
        setStatus(data.status)
        options.onFailed?.(data.message || `Payment ${data.status}`)
        return { success: false, status: data.status, message: data.message, isFinal: true }
      }

      return { success: false, status: 'pending', message: data.message, isFinal: false }
    } catch (err) {
      return { success: false, status: 'pending', message: 'Verification error', isFinal: false }
    }
  }, [state.verificationAttempts, options.module, incrementVerificationAttempts, setStatus, setError])

  const startPolling = useCallback(async (
    checkoutRequestId: string,
    onSuccess?: () => void,
    onFailed?: (error: string) => void
  ) => {
    const check = async (): Promise<boolean> => {
      if (state.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        setStatus('timeout')
        const err = ERROR_MESSAGES.VERIFICATION_TIMEOUT
        setError(err)
        onFailed?.(err)
        return true
      }

      const result = await verify(checkoutRequestId)
      
      if (result.success) {
        onSuccess?.()
        return true
      }

      if (result.status === 'cancelled' || result.status === 'failed' || result.status === 'timeout') {
        onFailed?.(result.message || `Payment ${result.status}`)
        return true
      }

      return false
    }

    const poll = async () => {
      const done = await check()
      if (!done && statusRef.current === 'pending') {
        verifyIntervalRef.current = setTimeout(poll, VERIFICATION_INTERVAL)
      }
    }

    poll()
  }, [verify, state.verificationAttempts, setStatus, setError, statusRef])

  const stopPolling = useCallback(() => {
    if (verifyIntervalRef.current) {
      clearTimeout(verifyIntervalRef.current)
      verifyIntervalRef.current = null
    }
  }, [])

  const onSuccess = options.onSuccess
  const onFailed = options.onFailed

  useEffect(() => {
    return () => {
      if (verifyIntervalRef.current) {
        clearTimeout(verifyIntervalRef.current)
      }
    }
  }, [])

  return {
    ...state,
    verify,
    startPolling,
    stopPolling,
    reset,
  }
}