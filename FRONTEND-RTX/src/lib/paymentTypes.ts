export type PaymentStatus = 'idle' | 'processing' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout'

export interface PaymentResult {
  success: boolean
  checkoutRequestId?: string
  orderId?: string
  verificationUrl?: string
  payment_id?: string
  message?: string
  error?: {
    status?: string
    message?: string
  }
}

export interface VerificationResult {
  success: boolean
  status: PaymentStatus
  message?: string
  isFinal: boolean
  payment?: any
  error?: string
}

export interface PaymentPayload {
  reference: string
  method: 'mpesa' | 'paypal'
  amount: number
  currency?: string
  module?: string
  metadata?: Record<string, any>
  userId?: number
  phone?: string
}

export interface CaptureResult {
  status: string
  message?: string
  payment?: any
}

export interface PaymentProcessor {
  initiate(payload: PaymentPayload): Promise<PaymentResult>
      verify(verificationUrl: string, checkoutRequestId?: string): Promise<VerificationResult> 
  captureOrder(token: string, payerId: string): Promise<CaptureResult>
  mapStatus(status: string): PaymentStatus
  getStatusMessage(status: PaymentStatus): string
}


export const STATUS_MESSAGES: Record<PaymentStatus, string> = {
  idle: 'Ready',
  processing: 'Processing payment...',
  pending: 'Awaiting confirmation',
  completed: 'Payment successful',
  failed: 'Payment failed',
  cancelled: 'Payment cancelled',
  timeout: 'Payment timed out',
}