import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/store'
import { usePayPalPayment } from '@/hooks/usePayPalPayment'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'

interface PayPalButtonProps {
  amount: number
  currency?: string
  module: string
  description?: string
  metadata?: Record<string, any>
  onSuccess?: () => void
  onFailed?: (error: string) => void
  children?: React.ReactNode
}

export function PayPalButton({
  amount,
  currency = 'USD',
  module,
  description,
  metadata,
  onSuccess,
  onFailed,
  children,
}: PayPalButtonProps) {
  const user = useAuthStore(state => state.user)
  const payment = usePayPalPayment()

  const handlePay = useCallback(async () => {
    if (!user?.user_id) {
      onFailed?.('Please login first')
      return
    }

    await payment.initiate({
      amount,
      currency,
      module,
      description,
      metadata,
      onSuccess,
      onFailed,
    })
  }, [user, payment, amount, currency, module, description, metadata, onSuccess, onFailed])

  if (!user) {
    return null
  }

  return (
    <Button
      onClick={handlePay}
      disabled={payment.isProcessing || payment.isPending}
      variant="secondary"
      className="w-full"
    >
      {payment.isProcessing || payment.isPending ? (
        <Spinner className="w-4 h-4 mr-2" />
      ) : (
        children || (
          <span className="flex items-center justify-center">
            Pay with PayPal (${amount.toFixed(2)})
          </span>
        )
      )}
    </Button>
  )
}

interface PaymentMethodSelectorProps {
  selectedMethod: 'mpesa' | 'paypal'
  onMethodChange: (method: 'mpesa' | 'paypal') => void
  mpesaComponent?: React.ReactNode
  paypalComponent?: React.ReactNode
}

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  mpesaComponent,
  paypalComponent,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onMethodChange('mpesa')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
            selectedMethod === 'mpesa'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="block font-medium">M-Pesa</span>
          <span className="text-xs text-gray-500">Pay with mobile money</span>
        </button>

        <button
          type="button"
          onClick={() => onMethodChange('paypal')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
            selectedMethod === 'paypal'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="block font-medium">PayPal</span>
          <span className="text-xs text-gray-500">Pay with PayPal</span>
        </button>
      </div>

      {selectedMethod === 'mpesa' && mpesaComponent}
      {selectedMethod === 'paypal' && paypalComponent}
    </div>
  )
}