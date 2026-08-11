import { api } from './api'
import type { PaymentProcessor, PaymentResult, VerificationResult, CaptureResult, PaymentPayload, PaymentStatus } from './paymentTypes'
import { STATUS_MESSAGES } from './paymentTypes'

export const paypalProcessor: PaymentProcessor = {
  async initiate(payload: PaymentPayload): Promise<PaymentResult> {
    try {
      const response = await api.post('/payments/add', {
        user_id: payload.userId,
        amount: payload.amount,
        currency: payload.currency || 'USD',
        payment_method: 'paypal',
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

      return {
        success: true,
        orderId: data.data?.orderId,
        verificationUrl: `/payments/verify-paypal`,
        payment_id: String(data.data?.id),
        message: 'PayPal order created',
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

  async verify(verificationUrl: string): Promise<VerificationResult> {
    try {
      const response = await api.get(verificationUrl)
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
          message: data.message,
          isFinal: true,
          payment: data.payment,
        }
      }

      return {
        success: false,
        status: 'pending',
        message: data.message,
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

  async captureOrder(token: string, payerId: string): Promise<CaptureResult> {
    try {
      const response = await api.post('/payments/capture-paypal', {
        token,
        payerId,
      })

      const data = response.data

      if (data.success) {
        return {
          status: 'completed',
          message: 'PayPal payment completed!',
          payment: data.data,
        }
      }

      return {
        status: data.status || 'failed',
        message: data.message || 'Failed to capture payment',
      }
    } catch (error: any) {
      return {
        status: 'failed',
        message: error.message || 'Failed to capture payment',
      }
    }
  },

  mapStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      completed: 'completed',
      successful: 'completed',
      success: 'completed',
      approved: 'completed',
      pending: 'pending',
      created: 'pending',
      processing: 'processing',
      failed: 'failed',
      declined: 'failed',
      cancelled: 'cancelled',
    }
    return statusMap[status] || 'failed'
  },

  getStatusMessage(status: PaymentStatus): string {
    return STATUS_MESSAGES[status]
  },
}