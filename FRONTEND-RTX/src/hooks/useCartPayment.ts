import { useCallback } from 'react'
import { useAuthStore } from '@/store/store'
import { useCart } from '@/store/cartStore'
import { usePaymentModule, PaymentModule } from './usePaymentModule'

interface CartPaymentOptions {
  phone?: string
  autoVerify?: boolean
  onSuccess?: () => void
  onFailed?: (error: string) => void
  onPending?: (checkoutRequestId: string) => void
}

export function useCartPayment() {
  const user = useAuthStore(state => state.user)
  const { cartItems, totalPrice, clearCart } = useCart()
  const payment = usePaymentModule()

  const pay = useCallback(async (options?: CartPaymentOptions) => {
    if (!user?.user_id) {
      options?.onFailed?.('Please login first')
      return null
    }

    const phone = options?.phone
    if (!phone) {
      options?.onFailed?.('Phone number required')
      return null
    }

    if (cartItems.length === 0) {
      options?.onFailed?.('Cart is empty')
      return null
    }

    const metadata = {
      items: cartItems.map(item => ({
        book_id: item.book_id,
        format: item.format,
        quantity: item.quantity,
        price: item.price,
      })),
    }

    const result = await payment.initiate({
      module: 'book_purchase',
      amount: totalPrice,
      phone,
      metadata,
      autoVerify: options?.autoVerify,
      onSuccess: () => {
        clearCart()
        options?.onSuccess?.()
      },
      onFailed: options?.onFailed,
      onPending: options?.onPending,
    })

    return result
  }, [user, cartItems, totalPrice, payment, clearCart])

  return {
    ...payment,
    pay,
    cartItems,
    totalPrice,
    isEmpty: cartItems.length === 0,
  }
}

export function useBookPurchasePayment() {
  const user = useAuthStore(state => state.user)
  const payment = usePaymentModule()

  const pay = useCallback(async (params: {
    books: Array<{ book_id: number; format: string; quantity: number; price: number }>
    amount: number
    phone: string
  }, options?: {
    autoVerify?: boolean
    onSuccess?: () => void
    onFailed?: (error: string) => void
    onPending?: (checkoutRequestId: string) => void
  }) => {
    if (!user?.user_id) {
      options?.onFailed?.('Please login first')
      return null
    }

    if (!params.phone) {
      options?.onFailed?.('Phone number required')
      return null
    }

    if (!params.books?.length) {
      options?.onFailed?.('No books to purchase')
      return null
    }

    const result = await payment.initiate({
      module: 'book_purchase',
      amount: params.amount,
      phone: params.phone,
      metadata: { items: params.books },
      autoVerify: options?.autoVerify,
      onSuccess: options?.onSuccess,
      onFailed: options?.onFailed,
      onPending: options?.onPending,
    })

    return result
  }, [user, payment])

  return {
    ...payment,
    pay,
  }
}