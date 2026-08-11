import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentModuleApi } from '@/lib/api'
import { useAuthStore } from '@/store/store'
import { useCartStore } from '@/store/cartStore'
import { Card } from '@/components/Card'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

export function PayPalStatusPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const clearCart = useCartStore(state => state.clearCart)

  const token = searchParams.get('token') || ''
  const status = searchParams.get('status') || ''
  const urlModule = searchParams.get('module') || ''

  const getResolvedModule = (data: any): string => {
    if (data?.module) return data.module;
    if (data?.metadata) {
      try {
        const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
        return metadata?.module || urlModule;
      } catch {
        return urlModule;
      }
    }
    return urlModule;
  }

  const getRedirectUrl = (resolvedModule?: string) => {
    const mod = resolvedModule || urlModule;
    if (mod === 'ebook' || mod === 'book_purchase') {
      return '/dashboard'
    }
    return '/dbslibrary'
  }

  useEffect(() => {
    async function handlePayPalReturn() {
      console.log('[PayPalStatusPage] PayPal params:', { token })
      
      if (!token) {
        if (status === 'cancelled' || searchParams.get('cancel')) {
          setMessage('Payment was cancelled.')
          setIsLoading(false)
          return
        }
        setMessage('Invalid payment state')
        setTimeout(() => navigate('/'), 2000)
        setIsLoading(false)
        return
      }

      setMessage('Processing PayPal payment...')
      try {
        const verifyRes = await paymentModuleApi.verifyPayPal(token)
        const verifyData = verifyRes?.data?.data || verifyRes?.data || verifyRes
        console.log('[PayPalStatusPage] PayPal verify result:', verifyData)
        
        const isCompleted = verifyData?.status === 'COMPLETED' || verifyData?.success === true
        
        if (isCompleted) {
          setMessage('Payment successful! Activating subscription...')
          const user = useAuthStore.getState()
          if (user.user?.user_id) {
            try {
              await paymentModuleApi.capturePayPal(token, parseInt(user.user.user_id))
              console.log('[PayPalStatusPage] Capture called for completed payment')
              
              // Clear cart for book_purchase
              const mod = getResolvedModule(verifyData?.payment || verifyData)
              if (mod === 'book_purchase') {
                clearCart()
                console.log('[PayPalStatusPage] Cart cleared')
              }
            } catch (e) {
              console.log('[PayPalStatusPage] Capture error:', e)
            }
          }
          const resolvedModule = getResolvedModule(verifyData?.payment || verifyData)
          setTimeout(() => navigate(getRedirectUrl(resolvedModule)), 2000)
          setIsLoading(false)
          return
        }
        
        if (verifyData?.status === 'APPROVED') {
          const user = useAuthStore.getState()
          if (user.user?.user_id) {
            try {
              await paymentModuleApi.capturePayPal(token, parseInt(user.user.user_id))
              console.log('[PayPalStatusPage] Capture called')
              
              // Clear cart for book_purchase
              clearCart()
              console.log('[PayPalStatusPage] Cart cleared')
            } catch (e) {
              console.log('[PayPalStatusPage] Capture error:', e)
            }
            
            setMessage('Processing payment...')
            
            // Wait longer for PayPal to process
            for (let i = 0; i < 3; i++) {
              await new Promise(r => setTimeout(r, 2000))
              const reVerify = await paymentModuleApi.verifyPayPal(token)
              const reData = reVerify?.data?.data || reVerify?.data || reVerify
              console.log('[PayPalStatusPage] Re-verify attempt', i + 1, ':', reData)
              
              if (reData?.status === 'COMPLETED' || reData?.success === true) {
                setMessage('Payment successful! Redirecting...')
                const resolvedModule = getResolvedModule(reData?.payment || reData)
                setTimeout(() => navigate(getRedirectUrl(resolvedModule)), 2000)
                setIsLoading(false)
                return
              }
            }
            
            setMessage('Payment may be complete. Checking...')
            const resolvedModule = getResolvedModule(verifyData?.payment || verifyData)
            setTimeout(() => navigate(getRedirectUrl(resolvedModule)), 2000)
            setIsLoading(false)
            return
          }
          setMessage('Payment approved - please wait...')
        }
        
        setMessage(`Payment ${verifyData?.status || 'processing'}...`)
      } catch (e: any) {
        console.error('[PayPalStatusPage] PayPal verify error:', e)
        setMessage('Verifying payment...')
      }
      setIsLoading(false)
    }
    
    handlePayPalReturn()
  }, [token, status])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md">
        {isLoading ? (
          <div>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Processing payment...</p>
          </div>
        ) : (
          <div>
            {message.includes('successful') ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : message.includes('cancelled') || message.includes('failed') ? (
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            ) : (
              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            )}
            <p className="text-lg">{message}</p>
            {message.includes('cancelled') && (
              <button onClick={() => navigate('/library/subscribe')} className="btn btn-primary mt-4">
                Try Again
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}