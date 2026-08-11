import { useCallback, useState, useEffect } from 'react'
import { useAuthStore } from '@/store/store'
import { usePaymentModule, PaymentModule } from './usePaymentModule'

interface DonationPaymentOptions {
  phone?: string
  amount?: number
  autoVerify?: boolean
  onSuccess?: () => void
  onFailed?: (error: string) => void
  onPending?: (checkoutRequestId: string) => void
}

export function useDonationPayment() {
  const user = useAuthStore(state => state.user)
  const payment = usePaymentModule()

  const donate = useCallback(async (options?: DonationPaymentOptions) => {
    if (!user?.user_id) {
      options?.onFailed?.('Please login first')
      return null
    }

    if (!options?.phone) {
      options?.onFailed?.('Phone number required')
      return null
    }

    if (!options?.amount || options.amount <= 0) {
      options?.onFailed?.('Valid amount required')
      return null
    }

    const result = await payment.initiate({
      module: 'donation',
      amount: options.amount,
      phone: options.phone,
      autoVerify: options?.autoVerify,
      onSuccess: options?.onSuccess,
      onFailed: options?.onFailed,
      onPending: options?.onPending,
    })

    return result
  }, [user, payment])

  return {
    ...payment,
    donate,
  }
}

interface MembershipPaymentOptions {
  phone?: string
  membershipType?: string
  autoVerify?: boolean
  onSuccess?: () => void
  onFailed?: (error: string) => void
  onPending?: (checkoutRequestId: string) => void
}

export function useMembershipPayment() {
  const user = useAuthStore(state => state.user)
  const payment = usePaymentModule()

  const subscribe = useCallback(async (options?: MembershipPaymentOptions) => {
    if (!user?.user_id) {
      options?.onFailed?.('Please login first')
      return null
    }

    if (!options?.phone) {
      options?.onFailed?.('Phone number required')
      return null
    }

    const metadata = {
      membership_type: options?.membershipType || 'standard',
    }

    const result = await payment.initiate({
      module: 'membership',
      amount: options?.amount,
      phone: options?.phone,
      metadata,
      autoVerify: options?.autoVerify,
      onSuccess: options?.onSuccess,
      onFailed: options?.onFailed,
      onPending: options?.onPending,
    })

    return result
  }, [user, payment])

  return {
    ...payment,
    subscribe,
  }
}

interface EbookPaymentOptions {
  phone?: string
  amount?: number
  autoVerify?: boolean
  onSuccess?: () => void
  onFailed?: (error: string) => void
  onPending?: (checkoutRequestId: string) => void
}

export function useEbookPayment() {
  const user = useAuthStore(state => state.user)
  const payment = usePaymentModule()

  const convert = useCallback(async (options?: EbookPaymentOptions) => {
    if (!user?.user_id) {
      options?.onFailed?.('Please login first')
      return null
    }

    if (!options?.phone) {
      options?.onFailed?.('Phone number required')
      return null
    }

    const result = await payment.initiate({
      module: 'ebook',
      amount: options?.amount,
      phone: options?.phone,
      autoVerify: options?.autoVerify,
      onSuccess: options?.onSuccess,
      onFailed: options?.onFailed,
      onPending: options?.onPending,
    })

    return result
  }, [user, payment])

  return {
    ...payment,
    convert,
  }
}