import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { PaymentInitiateOptions, PaymentInitiateResult, PaymentModule } from '../types'
import { useInitiate } from '../useInitiate'
import { usePaymentVerify } from '../usePaymentVerify'

const MODULE: PaymentModule = 'membership'

interface UseMembershipPaymentOptions {
  onSuccess?: (result: PaymentInitiateResult) => void
  onFailed?: (error: string) => void
}

export function useMembershipPayment(options: UseMembershipPaymentOptions) {
  const queryClient = useQueryClient()
  
  const { initiate, ...initiateState } = useInitiate({
    module: MODULE,
  })

  const { verify, startPolling, stopPolling, ...verifyState } = usePaymentVerify({
    module: MODULE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership'] })
      options.onSuccess?.({
        checkoutRequestId: initiateState.checkoutRequestId || '',
        paymentId: initiateState.paymentId || undefined,
        status: 'completed',
        method: 'mpesa',
      })
    },
    onFailed: options.onFailed,
  })

  const pay = useCallback(async (payOptions?: PaymentInitiateOptions) => {
    const result = await initiate(payOptions)

    if (result && !('isPayPal' in result && result.isPayPal)) {
      startPolling(result.checkoutRequestId)
    }

    return result
  }, [initiate, startPolling])

  return {
    ...initiateState,
    ...verifyState,
    pay,
    verify,
    startPolling,
    stopPolling,
  }
}