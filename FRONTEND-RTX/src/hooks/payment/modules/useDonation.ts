import { useCallback } from 'react'
import type { PaymentInitiateOptions, PaymentInitiateResult, PaymentModule } from '../types'
import { useInitiate } from '../useInitiate'
import { usePaymentVerify } from '../usePaymentVerify'

const MODULE: PaymentModule = 'donation'

interface UseDonationPaymentOptions {
  onSuccess?: (result: PaymentInitiateResult) => void
  onFailed?: (error: string) => void
}

export function useDonationPayment(options: UseDonationPaymentOptions) {
  const { initiate, ...initiateState } = useInitiate({
    module: MODULE,
  })

  const { verify, startPolling, stopPolling, ...verifyState } = usePaymentVerify({
    module: MODULE,
    onSuccess: options.onSuccess,
    onFailed: options.onFailed,
  })

  const donate = useCallback(async (payOptions?: PaymentInitiateOptions) => {
    const result = await initiate(payOptions)

    if (result && !('isPayPal' in result && result.isPayPal)) {
      startPolling(result.checkoutRequestId)
    }

    return result
  }, [initiate, startPolling])

  return {
    ...initiateState,
    ...verifyState,
    donate,
    verify,
    startPolling,
    stopPolling,
  }
}