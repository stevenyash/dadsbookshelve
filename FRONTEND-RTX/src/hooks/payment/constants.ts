export const VERIFICATION_INTERVAL = 3000
export const MAX_VERIFICATION_ATTEMPTS = 30
export const VERIFICATION_TIMEOUT_MS = VERIFICATION_INTERVAL * MAX_VERIFICATION_ATTEMPTS

export const DEFAULT_CURRENCY = 'KES'
export const DEFAULT_METHOD = 'mpesa' as const

export const PAYMENT_STATUS = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
} as const

export const PAYMENT_METHODS = ['mpesa', 'paypal'] as const
export type PaymentMethodType = typeof PAYMENT_METHODS[number]

export const ERROR_MESSAGES = {
  USER_NOT_LOGGED_IN: 'Please login first',
  PHONE_REQUIRED: 'Phone number required for M-Pesa',
  INVALID_AMOUNT: 'Valid amount required',
  INVALID_MODULE: 'Invalid payment module',
  VERIFICATION_TIMEOUT: 'Payment verification timed out',
  INITIATION_FAILED: 'Payment initiation failed',
} as const