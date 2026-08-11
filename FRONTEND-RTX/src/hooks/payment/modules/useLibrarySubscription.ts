import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/store'
import { api } from '@/lib/api'
import type { PaymentInitiateOptions, PaymentInitiateResult, PaymentModule } from '../types'
import { useInitiate } from '../useInitiate'
import { usePaymentVerify } from '../usePaymentVerify'

const MODULE: PaymentModule = 'library_subscription'

interface UseLibrarySubscriptionPaymentOptions {
  accessId: number
  referralCode?: string
  onSuccess?: (result: PaymentInitiateResult) => void
  onFailed?: (error: string) => void
}

export function useLibrarySubscriptionPayment(options: UseLibrarySubscriptionPaymentOptions) {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  const userId = user?.user_id
  
  const { initiate, ...initiateState } = useInitiate({
    module: MODULE,
    metadata: { access_id: options.accessId, referralCode: options.referralCode, referral_code: options.referralCode },
  })

  const { verify, startPolling, stopPolling, ...verifyState } = usePaymentVerify({
    module: MODULE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-subscription'] })
      options.onSuccess?.({
        checkoutRequestId: initiateState.checkoutRequestId || '',
        paymentId: initiateState.paymentId || undefined,
        status: 'completed',
        method: 'mpesa',
      })
    },
    onFailed: options.onFailed,
  })

  const pay = useCallback(async (payOptions?: Omit<PaymentInitiateOptions, 'metadata'>) => {
    const result = await initiate({
      ...payOptions,
      metadata: { access_id: options.accessId, referralCode: options.referralCode, referral_code: options.referralCode },
    })

    if (result && !('isPayPal' in result && result.isPayPal)) {
      startPolling(result.checkoutRequestId)
    }

    return result
  }, [initiate, startPolling, options.accessId, options.referralCode])

  const confirmPayment = useCallback(async (checkoutRequestId?: string) => {
    const checkoutId = checkoutRequestId || initiateState.checkoutRequestId
    if (!checkoutId) {
      throw new Error('No checkout request ID available')
    }
    
    if (!userId) {
      throw new Error('User not logged in')
    }
    
    try {
      const response = await api.post('payments/confirm-payment', {
        checkoutRequestId: checkoutId,
        userId: userId,
      })
      
      const data = response.data.data || response.data
      
      if (data.success || data.alreadyConfirmed) {
        queryClient.invalidateQueries({ queryKey: ['library-subscription'] })
        options.onSuccess?.({
          checkoutRequestId: checkoutId,
          paymentId: data.paymentId || initiateState.paymentId || undefined,
          status: 'completed',
          method: 'mpesa',
        })
        return { success: true, status: 'completed', message: data.message }
      } else {
        return { success: false, status: 'failed', message: data.message || 'Payment confirmation failed' }
      }
    } catch (error: any) {
      console.error('[useLibrarySubscription] Manual confirmation error:', error)
      return { success: false, status: 'failed', message: error.message || 'Payment confirmation failed' }
    }
  }, [initiateState.checkoutRequestId, initiateState.paymentId, userId, options.accessId, options.referralCode])

  return {
    ...initiateState,
    ...verifyState,
    pay,
    verify,
    confirmPayment,
    startPolling,
    stopPolling,
  }
}