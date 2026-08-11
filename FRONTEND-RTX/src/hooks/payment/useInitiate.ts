import { useCallback } from 'react'
import { paymentModuleApi } from '@/lib/api'
import { useAuthStore } from '@/store/store'
import type { PaymentInitiateOptions, PaymentInitiateResult, PaymentModule } from './types'
import { DEFAULT_METHOD, ERROR_MESSAGES } from './constants'
import { usePaymentCore } from './usePaymentCore'

interface UseInitiateOptions {
  module: PaymentModule
  currency?: string
}

function normalizeReferralCode(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePaymentMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...(metadata || {}) }
  const referralCode = normalizeReferralCode(
    normalized.referralCode || normalized.referral_code
  )

  if (referralCode) {
    normalized.referralCode = referralCode
    normalized.referral_code = referralCode
  }

  return normalized
}

export function useInitiate(options: UseInitiateOptions) {
  const user = useAuthStore(state => state.user)
  const {
    state,
    setStatus,
    setCheckoutRequestId,
    setPaymentId,
    setError,
  } = usePaymentCore({ module: options.module })

  const initiate = useCallback(async (initiateOptions: PaymentInitiateOptions) => {
    const method = initiateOptions.method || DEFAULT_METHOD
    
    if (!user?.user_id) {
      const err = ERROR_MESSAGES.USER_NOT_LOGGED_IN
      setError(err)
      setStatus('failed')
      initiateOptions.onFailed?.(err)
      return null
    }

    function formatPhoneNumber(phone: string): string {
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
    return cleanPhone;
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return '254' + cleanPhone.substring(1);
  } else if (cleanPhone.length === 9) {
    return '254' + cleanPhone;
  }
  return cleanPhone;
}

const phone = initiateOptions.phone || user?.telephone
const formattedPhone = phone ? formatPhoneNumber(phone) : undefined
    
    if (method === 'mpesa' && !formattedPhone) {
      const err = ERROR_MESSAGES.PHONE_REQUIRED
      setError(err)
      setStatus('failed')
      initiateOptions.onFailed?.(err)
      return null
    }

    if (!initiateOptions.amount || initiateOptions.amount <= 0) {
      const err = ERROR_MESSAGES.INVALID_AMOUNT
      setError(err)
      setStatus('failed')
      initiateOptions.onFailed?.(err)
      return null
    }

    setStatus('processing')
    setError(null)

    try {
      const paymentMetadata = normalizePaymentMetadata(initiateOptions.metadata)

      const response = await paymentModuleApi.initiate({
        user_id: parseInt(user.user_id),
        amount: initiateOptions.amount,
        currency: initiateOptions.currency || options.currency || 'KES',
        method,
        reference: `${options.module}-${Date.now()}`,
        module: options.module,
        metadata: paymentMetadata,
        phone: formattedPhone,
        description: initiateOptions.description,
      })

      const data = response.data.data || response.data

      if (!data.success && !response.data.success) {
        const err = data.message || ERROR_MESSAGES.INITIATION_FAILED
        setError(err)
        setStatus('failed')
        initiateOptions.onFailed?.(err)
        return null
      }

      const checkoutRequestId = data.checkoutRequestId || response.data.checkoutRequestId
      const paymentId = data.paymentId || response.data.paymentId

      setCheckoutRequestId(checkoutRequestId)
      setPaymentId(paymentId)
      setStatus('pending')

      const result: PaymentInitiateResult = {
        checkoutRequestId,
        paymentId,
        status: 'pending',
        method: method as 'mpesa' | 'paypal',
        accessToken: data.accessToken,
        approveUrl: data.approvalUrl || data.approveUrl,
      }

      initiateOptions.onPending?.(checkoutRequestId)
      
      // For PayPal, redirect to approval URL
      if (method === 'paypal' && (data.approvalUrl || data.approveUrl)) {
        // Store result and let caller handle redirect
        return result
      }

      initiateOptions.onSuccess?.(result)
      return result
    } catch (err: unknown) {
      console.error('[useInitiate] Error:', err)
      let errMsg = 'Payment initiation failed'
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } }
        errMsg = axiosErr.response?.data?.message || errMsg
      } else if (err instanceof Error) {
        errMsg = err.message
      }
      setError(errMsg)
      setStatus('failed')
      initiateOptions.onFailed?.(errMsg)
      return null
    }
  }, [user, options.module, options.currency, setStatus, setError, setCheckoutRequestId, setPaymentId])

  return {
    ...state,
    initiate,
  }
}