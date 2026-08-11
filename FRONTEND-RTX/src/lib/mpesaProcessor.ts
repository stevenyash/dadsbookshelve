import { api } from './api'
import type { PaymentProcessor, PaymentResult, VerificationResult, CaptureResult, PaymentPayload, PaymentStatus } from './paymentTypes'
import { STATUS_MESSAGES } from './paymentTypes'

export const mpesaProcessor: PaymentProcessor = {
  async initiate(payload: PaymentPayload): Promise<PaymentResult> {
    try {
      const response = await api.post('/payments/add', {
        user_id: payload.userId,
        amount: payload.amount,
        currency: payload.currency || 'KES',
        payment_method: 'mpesa',
        reference: payload.reference,
        metadata: payload.metadata,
      })

      const data = response.data

      if (data.success === false) {
        return {
          success: false,
          error: {
            status: data.status || 'failed',
            message: data.message || 'Payment initiation failed',
          },
        }
      }

      const paymentData = data.data
      const checkoutRequestId = paymentData?.checkoutRequestId || paymentData?.id?.toString()
      const paymentId = paymentData?.id
      
      return {
        success: true,
        checkoutRequestId,
        verificationUrl: `/payments/check-status`,
        payment_id: String(paymentId),
        message: 'STK push sent to your phone',
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to initiate payment'
      return {
        success: false,
        error: {
          status: 'failed',
          message,
        },
      }
    }
  },

  async verify(verificationUrl: string, checkoutRequestId?: string): Promise<VerificationResult> {
    try {
      // Use POST with checkoutRequestId in body (matches dslibrary pattern)
      const response = await api.post(verificationUrl, { checkoutRequestId })
      const data = response.data

      if (data.status === 'cancelled') {
        return {
          success: false,
          status: 'cancelled',
          message: data.message || 'Payment was cancelled',
          isFinal: true,
        }
      }

      if (data.isFinal || data.status === 'completed') {
        return {
          success: data.success || false,
          status: data.status || 'completed',
          message: data.message || data.result,
          isFinal: true,
          payment: data.payment,
        }
      }

      return {
        success: false,
        status: 'pending',
        message: data.message || data.result,
        isFinal: false,
      }
    } catch (error: any) {
      return {
        success: false,
        status: 'pending',
        isFinal: false,
        error: error.message,
      }
    }
  },

  async captureOrder(_token: string, _payerId: string): Promise<CaptureResult> {
    return {
      status: 'failed',
      message: 'M-Pesa does not use order capture',
    }
  },

  mapStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      completed: 'completed',
      successful: 'completed',
      success: 'completed',
      pending: 'pending',
      processing: 'processing',
      failed: 'failed',
      failed_001: 'failed',
      failed_002: 'failed',
      cancelled: 'cancelled',
      timeout: 'timeout',
    }
    return statusMap[status] || 'failed'
  },

  getStatusMessage(status: PaymentStatus): string {
    return STATUS_MESSAGES[status]
  },
}