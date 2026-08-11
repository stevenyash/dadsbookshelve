import { ERROR_MESSAGES, DEFAULT_CURRENCY, DEFAULT_METHOD, PaymentMethodType } from './constants'

export type PaymentModule = 
  | 'library_subscription' 
  | 'book_purchase' 
  | 'donation' 
  | 'membership'
  | 'ebook'
  | 'custom'

export type PaymentStatus = 
  | 'idle' 
  | 'processing' 
  | 'pending' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'timeout'

export interface PaymentRequest {
  user_id: number
  amount: number
  method: PaymentMethodType
  reference: string
  module: PaymentModule
  metadata?: Record<string, unknown>
  phone?: string
  description?: string
  currency?: string
  idempotency_key?: string
}

export interface PaymentResponse {
  success: boolean
  checkoutRequestId?: string
  paymentId?: number
  status: string
  message?: string
  accessToken?: string
  approveUrl?: string
}

export interface PaymentVerifyResponse {
  success: boolean
  status: PaymentStatus
  message?: string
  payment?: unknown
  isFinal: boolean
}

export interface PaymentInitiateOptions {
  amount: number
  currency?: string
  phone?: string
  method?: PaymentMethodType
  description?: string
  metadata?: Record<string, unknown>
  idempotency_key?: string
  onSuccess?: (result: PaymentInitiateResult) => void
  onFailed?: (error: string) => void
  onPending?: (checkoutRequestId: string) => void
}

export interface PaymentInitiateResult {
  checkoutRequestId: string
  paymentId?: number
  status: PaymentStatus
  method: PaymentMethodType
  accessToken?: string
  approveUrl?: string
}

export interface PaymentState {
  status: PaymentStatus
  checkoutRequestId: string | null
  paymentId: number | null
  error: string | null
  verificationAttempts: number
}

export const VALID_MODULES: PaymentModule[] = [
  'library_subscription',
  'book_purchase',
  'donation',
  'membership',
  'ebook',
  'custom',
]

export const STATUS_MESSAGES: Record<PaymentStatus, string> = {
  idle: 'Ready',
  processing: 'Processing payment...',
  pending: 'Awaiting confirmation',
  completed: 'Payment successful',
  failed: 'Payment failed',
  cancelled: 'Payment cancelled',
  timeout: 'Payment timed out',
}