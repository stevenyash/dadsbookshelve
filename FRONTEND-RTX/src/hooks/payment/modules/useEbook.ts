import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { PaymentInitiateOptions, PaymentInitiateResult, PaymentModule } from '../types'
import { useInitiate } from '../useInitiate'
import { usePaymentVerify } from '../usePaymentVerify'

const MODULE: PaymentModule = 'ebook'

interface UseEbookPaymentOptions {
  ebookUploadId: number
  bookTitle?: string
  author?: string
  isbn?: string
  onSuccess?: (result: PaymentInitiateResult) => void
  onFailed?: (error: string) => void
}

export function useEbookPayment(options: UseEbookPaymentOptions) {
  const queryClient = useQueryClient()
  
  const metadata = {
    ebook_upload_id: options.ebookUploadId,
    book_title: options.bookTitle,
    author: options.author,
    isbn: options.isbn,
  }

  const { initiate, ...initiateState } = useInitiate({
    module: MODULE,
    metadata,
  })

  const { verify, startPolling, stopPolling, ...verifyState } = usePaymentVerify({
    module: MODULE,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebook-uploads'] })
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

    // For PayPal, redirect to approval URL
    if (result?.method === 'paypal' && result.approveUrl) {
      console.log('[useEbook] PayPal redirect to:', result.approveUrl)
      window.location.href = result.approveUrl
      return result
    }

    // For M-Pesa, start polling
    if (result && result.checkoutRequestId) {
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