import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { PaymentInitiateOptions, PaymentInitiateResult, PaymentModule } from '../types'
import { useInitiate } from '../useInitiate'
import { usePaymentVerify } from '../usePaymentVerify'

const MODULE: PaymentModule = 'book_purchase'

interface UseBookPurchasePaymentOptions {
  cartItems: Array<{ book_id: number; quantity: number; price: number; format: string }>
  onSuccess?: (result: PaymentInitiateResult) => void
  onFailed?: (error: string) => void
}

export function useBookPurchasePayment(options: UseBookPurchasePaymentOptions) {
  const queryClient = useQueryClient()
  
  const metadata = {
    items: options.cartItems,
    total: options.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }

  const { initiate, ...initiateState } = useInitiate({
    module: MODULE,
    metadata,
  })

  const { verify, startPolling, stopPolling, ...verifyState } = usePaymentVerify({
    module: MODULE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
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
      metadata,
    })

    if (result && !('isPayPal' in result && result.isPayPal)) {
      startPolling(result.checkoutRequestId)
    }

    return result
  }, [initiate, startPolling, metadata])

  const confirmPayment = useCallback(async (checkoutRequestId?: string) => {
    const checkoutId = checkoutRequestId || initiateState.checkoutRequestId
    if (!checkoutId) {
      throw new Error('No checkout request ID available')
    }
    
    const result = await verify(checkoutId)
    return result
  }, [initiateState.checkoutRequestId, verify])

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