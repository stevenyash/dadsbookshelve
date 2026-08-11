import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { IndexedDBStorage } from '@/lib/indexedDB'
import { mpesaProcessor } from '@/lib/mpesaProcessor'
import { paypalProcessor } from '@/lib/paypalProcessor'
import type { PaymentProcessor, PaymentPayload, PaymentStatus } from '@/lib/paymentTypes'

type PaymentMethod = 'mpesa' | 'paypal'

interface ActivePayment {
  id: string
  reference: string
  method: PaymentMethod
  amount: number
  currency: string
  module?: string
  metadata?: Record<string, any>
  createdAt: Date
  userId?: number
  checkoutRequestId?: string
  orderId?: string
  verificationUrl?: string
  paymentId?: string
  statusMessage?: string
}

interface PaymentState {
  status: PaymentStatus
  activePayment: ActivePayment | null
  history: Array<{
    id: string
    reference: string
    method: PaymentMethod
    amount: number
    status: PaymentStatus
    createdAt: Date
  }>
  verificationAttempts: number
  lastVerificationError: string | null
  pollingInterval: Number | null

  // Actions
  initiatePayment: (payload: PaymentPayload) => Promise<{ success: boolean; message?: string }>
  verifyPayment: () => Promise<{ success: boolean; isFinal: boolean; message?: string }>
  startVerificationPolling: () => void
  stopVerificationPolling: () => void
  handlePayPalReturn: (token: string, payerId: string) => Promise<{ success: boolean; status: PaymentStatus }>
  resetPayment: () => void
}

const MAX_VERIFICATION_ATTEMPTS = 30
const VERIFICATION_INTERVAL = 3000

const paymentProcessors: Record<PaymentMethod, PaymentProcessor> = {
  mpesa: mpesaProcessor,
  paypal: paypalProcessor,
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      activePayment: null,
      history: [],
      verificationAttempts: 0,
      lastVerificationError: null,
      pollingInterval: null,

      initiatePayment: async (payload) => {
        get().resetPayment()
        get().stopVerificationPolling()
        
        set({
          status: 'processing',
          verificationAttempts: 0,
          lastVerificationError: null,
        })

        const activePayment: ActivePayment = {
          id: `pay-${Date.now()}`,
          reference: payload.reference || `PAY-${Date.now()}`,
          method: payload.method,
          amount: payload.amount,
          currency: payload.currency || 'KES',
          module: payload.module,
          metadata: payload.metadata,
          createdAt: new Date(),
          userId: payload.userId,
        }

        set({ activePayment })

        try {
          const processor = paymentProcessors[payload.method]
          const result = await processor.initiate(payload)

          if (result.error) {
            const errorStatus = result.error.status || 'failed'
            const status = processor.mapStatus(errorStatus)
            
            set({
              status,
              activePayment: {
                ...activePayment,
                statusMessage: result.error.message
              },
            })

            return { success: false, message: result.error.message }
          }

          const updatedPayment = {
            ...activePayment,
            checkoutRequestId: result.checkoutRequestId,
            orderId: result.orderId,
            verificationUrl: result.verificationUrl,
            paymentId: result.payment_id,
          }

          set({
            status: 'pending',
            activePayment: updatedPayment,
          })

          // Start polling for verification if this is M-Pesa
          if (payload.method === 'mpesa' && result.verificationUrl) {
            get().startVerificationPolling()
          }

          return { success: true, message: result.message }
        } catch (error: any) {
          set({
            status: 'failed',
            activePayment: {
              ...activePayment,
              statusMessage: error.message
            },
          })

          return { success: false, message: error.message }
        }
      },

      verifyPayment: async () => {
        const { activePayment, status, verificationAttempts } = get()
        
        if (!activePayment?.verificationUrl || status !== 'pending') {
          return { success: false, isFinal: false }
        }

        if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
          get().stopVerificationPolling()
          set({ status: 'timeout' })
          return {
            success: false,
            isFinal: true,
            message: 'Payment verification timed out',
          }
        }

        set({ verificationAttempts: verificationAttempts + 1 })

        try {
          const processor = paymentProcessors[activePayment.method]
          const response = await processor.verify(
            activePayment.verificationUrl, 
            activePayment.checkoutRequestId
          )

          if (response.status === 'cancelled') {
            get().stopVerificationPolling()
            set({
              status: 'cancelled',
              activePayment: {
                ...activePayment,
                statusMessage: response.message
              },
            })
            
            return {
              success: false,
              isFinal: true,
              message: response.message,
            }
          }

          if (response.isFinal) {
            get().stopVerificationPolling()
            set({
              status: response.status,
              activePayment: {
                ...activePayment,
                statusMessage: response.message
              },
            })

            if (response.status === 'completed') {
              set({
                history: [
                  ...get().history,
                  {
                    id: activePayment.id,
                    reference: activePayment.reference,
                    method: activePayment.method,
                    amount: activePayment.amount,
                    status: 'completed',
                    createdAt: new Date(),
                  },
                ],
              })
            }

            return {
              success: response.success,
              isFinal: true,
              message: response.message,
            }
          }

          set({ lastVerificationError: null })
          
          return {
            success: false,
            isFinal: false,
            message: response.message,
          }
        } catch (error: any) {
          set({ lastVerificationError: error.message })
          return {
            success: false,
            isFinal: false,
            message: error.message,
          }
        }
      },

      startVerificationPolling: () => {
        const { pollingInterval, status } = get()
        
        if (pollingInterval) return
        if (status !== 'pending') return
        
        const poll = async () => {
          const { status: currentStatus, verificationAttempts } = get()
          
          if (currentStatus !== 'pending') {
            get().stopVerificationPolling()
            return
          }
          
          if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
            get().stopVerificationPolling()
            return
          }
          
          const result = await get().verifyPayment()
          
          if (!result.isFinal && get().status === 'pending') {
            const interval = setInterval(poll, VERIFICATION_INTERVAL)
            set({ pollingInterval: interval })
          }
        }
        
        const interval = setInterval(poll, VERIFICATION_INTERVAL)
        set({ pollingInterval: interval })
      },

      stopVerificationPolling: () => {
        const { pollingInterval } = get()
        if (pollingInterval) {
          clearInterval(pollingInterval)
          set({ pollingInterval: null })
        }
      },

      handlePayPalReturn: async (token, payerId) => {
        const processor = paypalProcessor
        
        try {
          const response = await processor.captureOrder(token, payerId)
          const status = processor.mapStatus(response.status)

          set({ status })

          if (status === 'completed' && get().activePayment) {
            set({
              history: [
                ...get().history,
                {
                  id: get().activePayment!.id,
                  reference: get().activePayment!.reference,
                  method: 'paypal',
                  amount: get().activePayment!.amount,
                  status: 'completed',
                  createdAt: new Date(),
                },
              ],
            })
          }

          return { success: status === 'completed', status }
        } catch (error: any) {
          set({ status: 'failed' })
          return { success: false, status: 'failed' }
        }
      },

      resetPayment: () => {
        get().stopVerificationPolling()
        set({
          status: 'idle',
          activePayment: null,
          verificationAttempts: 0,
          lastVerificationError: null,
        })
      },
    }),
    {
      name: 'payment-storage',
      storage: createJSONStorage(() => IndexedDBStorage),
      partialize: (state) => ({
        history: state.history.slice(-50),
      }),
    }
  )
)

// Helper hook with reactive selectors
export const usePayment = () => {
  const status = usePaymentStore((state) => state.status)
  const activePayment = usePaymentStore((state) => state.activePayment)
  const history = usePaymentStore((state) => state.history)
  const verificationAttempts = usePaymentStore((state) => state.verificationAttempts)
  const lastVerificationError = usePaymentStore((state) => state.lastVerificationError)
  
  const initiatePayment = usePaymentStore((state) => state.initiatePayment)
  const verifyPayment = usePaymentStore((state) => state.verifyPayment)
  const startVerificationPolling = usePaymentStore((state) => state.startVerificationPolling)
  const stopVerificationPolling = usePaymentStore((state) => state.stopVerificationPolling)
  const handlePayPalReturn = usePaymentStore((state) => state.handlePayPalReturn)
  const resetPayment = usePaymentStore((state) => state.resetPayment)
  
  return {
    status,
    activePayment,
    history,
    checkoutRequestId: activePayment?.checkoutRequestId,
    verificationAttempts,
    lastVerificationError,
    isProcessing: status === 'processing',
    isPending: status === 'pending',
    isCompleted: status === 'completed',
    isCancelled: status === 'cancelled',
    isFailed: status === 'failed',
    isIdle: status === 'idle',
    initiatePayment,
    verifyPayment,
    startVerificationPolling,
    stopVerificationPolling,
    handlePayPalReturn,
    resetPayment,
  }
}