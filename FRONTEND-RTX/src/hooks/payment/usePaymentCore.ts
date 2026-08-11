import { useState, useCallback, useRef, useEffect } from 'react'
import type { PaymentState, PaymentStatus, PaymentInitiateResult } from './types'
import { DEFAULT_CURRENCY } from './constants'

interface UsePaymentCoreOptions {
  module: string
  currency?: string
  onSuccess?: (result: PaymentInitiateResult) => void
  onFailed?: (error: string) => void
  onPending?: (checkoutRequestId: string) => void
}

export function usePaymentCore(options: UsePaymentCoreOptions) {
  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    checkoutRequestId: null,
    paymentId: null,
    error: null,
    verificationAttempts: 0,
  })

  const statusRef = useRef(state.status)
  statusRef.current = state.status

  const setStatus = useCallback((status: PaymentStatus) => {
    setState(prev => ({ ...prev, status }))
  }, [])

  const setCheckoutRequestId = useCallback((checkoutRequestId: string | null) => {
    setState(prev => ({ ...prev, checkoutRequestId }))
  }, [])

  const setPaymentId = useCallback((paymentId: number | null) => {
    setState(prev => ({ ...prev, paymentId }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const setVerificationAttempts = useCallback((attempts: number) => {
    setState(prev => ({ ...prev, verificationAttempts: attempts }))
  }, [])

  const incrementVerificationAttempts = useCallback(() => {
    setState(prev => ({ ...prev, verificationAttempts: prev.verificationAttempts + 1 }))
  }, [])

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      checkoutRequestId: null,
      paymentId: null,
      error: null,
      verificationAttempts: 0,
    })
  }, [])

  const getCurrency = useCallback(() => {
    return options.currency || DEFAULT_CURRENCY
  }, [options.currency])

  return {
    state,
    statusRef,
    setStatus,
    setCheckoutRequestId,
    setPaymentId,
    setError,
    setVerificationAttempts,
    incrementVerificationAttempts,
    reset,
    getCurrency,
  }
}