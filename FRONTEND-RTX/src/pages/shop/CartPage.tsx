import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart, useCartStore } from '@/store/cartStore'
import { useBookPurchasePayment } from '@/hooks/payment/modules'
import { useAuth } from '@/store/store'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Check, Smartphone, Loader2, CreditCard, Globe, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

export default function CartPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { canView } = usePermissions()
  const { 
    cartItems, 
    totalPrice, 
    totalItems, 
    hasDigitalItems, 
    hasPhysicalItems,
    removeItem, 
    updateQuantity, 
    clearCart,
    isEmpty 
  } = useCart()
  const { customer, setCustomer } = useCartStore()

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [exchangeRate, setExchangeRate] = useState(150)
  const [usdAmount, setUsdAmount] = useState(0)

  if (!canView('cart')) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-6">You don't have permission to access the cart.</p>
          <Button onClick={() => navigate('/books/shop')}>Browse Shop</Button>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!customer.phone && user.telephone) {
        setCustomer({ phone: user.telephone })
      }
      if (!customer.email && user.email) {
        setCustomer({ email: user.email })
      }
    }
  }, [isAuthenticated, user, customer.phone, customer.email, setCustomer])

  const { status, pay, error: paymentError, checkoutRequestId, reset, confirmPayment } = useBookPurchasePayment({
    cartItems: cartItems.map(item => ({
      book_id: item.book_id,
      format: item.format || 'digital',
      quantity: item.quantity,
      price: item.price,
    })),
    onSuccess: () => {
      clearCart()
      navigate('/orders')
    },
    onFailed: (msg) => {
      setError(msg)
      setProcessing(false)
    },
  })

  // Fetch exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await api.get('exchangerates/view/KES/USD')
        if (response.data.success) {
          setExchangeRate(response.data?.rate || 150)
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err)
        setExchangeRate(150)
      }
    }
    fetchExchangeRate()
  }, [])

  // Calculate USD amount
  useEffect(() => {
    if (totalPrice > 0 && exchangeRate > 0) {
      setUsdAmount(totalPrice / exchangeRate)
    }
  }, [totalPrice, exchangeRate])

  const paymentMethod = customer.paymentMethod || 'mpesa'

  const handleCheckout = async () => {
    if (paymentMethod === 'mpesa' && !customer.phone) {
      setError('Phone number is required for M-Pesa')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const result = await pay({
        amount: paymentMethod === 'paypal' ? usdAmount : totalPrice,
        phone: paymentMethod === 'mpesa' ? customer.phone : undefined,
        method: paymentMethod,
        description: 'Cart Checkout',
        currency: paymentMethod === 'paypal' ? 'USD' : 'KES',
      })

      if (!result) {
        setProcessing(false)
      }

      // Handle PayPal redirect
      if (paymentMethod === 'paypal' && result?.approveUrl) {
        setTimeout(() => {
          window.location.href = result.approveUrl
        }, 1500)
      }
    } catch (err: any) {
      console.error('[CartPage] Checkout error:', err)
      setError(err.message || 'Payment failed')
      setProcessing(false)
    }
  }

  const handleConfirmManually = async () => {
    if (paymentMethod === 'mpesa') {
      try {
        const result = await confirmPayment()
        if (result.success) {
          clearCart()
          navigate('/orders')
        } else {
          setError(result.message || 'Payment not completed yet')
        }
      } catch (err: any) {
        console.error('Confirm payment error:', err)
      }
    } else {
      // For PayPal, try the API approach
      if (!checkoutRequestId || !user?.user_id) {
        return
      }
      try {
        const res = await api.post('payments/confirm-payment', {
          checkoutRequestId: checkoutRequestId,
          userId: user.user_id,
        })
        if (res.data.success || res.data?.confirmed) {
          clearCart()
          navigate('/orders')
        }
      } catch (err: any) {
        console.error('Confirm payment error:', err)
      }
    }
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Your Cart is Empty</h1>
          <p className="text-gray-500 mb-6">Browse our books and add them to your cart</p>
          {!isAuthenticated && (
            <p className="text-sm text-gray-400 mb-4">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Login to save your orders
              </Button>
            </p>
          )}
          <Button onClick={() => navigate('/books/shop')}>Browse Books</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Shopping Cart ({totalItems} items)
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="md:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={`${item.book_id}-${item.format}`} className="p-4">
                <div className="flex gap-4">
                  {item.cover_image && (
                    <img 
                      src={item.cover_image} 
                      alt={item.title}
                      className="w-20 h-28 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.author}</p>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.format === 'digital' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.format === 'digital' ? 'Digital' : 'Physical'}
                      </span>
                    </div>
                    <div className="mt-2 font-bold text-lg">
                      KES {item.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => removeItem(item.book_id, item.format)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Remove
                    </button>
                    {item.format === 'physical' && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.book_id, item.format, item.quantity - 1)}
                          className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.book_id, item.format, item.quantity + 1)}
                          className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            <button
              onClick={clearCart}
              className="text-red-500 text-sm hover:underline"
            >
              Clear Cart
            </button>
          </div>

          {/* Checkout Summary */}
          <div>
            <Card className="p-4 sticky top-4">
              <h2 className="font-bold text-lg mb-4">Checkout</h2>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>KES {totalPrice.toLocaleString()}</span>
                </div>
                {hasPhysicalItems && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>KES {totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                {isAuthenticated && user && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-500">Ordering as</p>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                  <Input
                    type="tel"
                    value={customer.phone || user?.telephone || ''}
                    onChange={(e) => setCustomer({ phone: e.target.value })}
                    placeholder="254712345678"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                  <Select
                    value={customer.paymentMethod}
                    onChange={(e) => setCustomer({ paymentMethod: e.target.value as 'mpesa' | 'paypal' })}
                    options={[
                      { value: 'mpesa', label: 'M-Pesa' },
                      { value: 'paypal', label: 'PayPal' },
                    ]}
                  />
                </div>

                {(paymentError || error) && (
                  <div className="text-red-500 text-sm">{paymentError || error}</div>
                )}

                {status === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="w-5 h-5" />
                      <p className="font-medium">Payment Received!</p>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Order created. Check your orders page.
                    </p>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/orders')}
                    >
                      View Orders
                    </Button>
                  </div>
                )}

                {status === 'processing' && (
                  <div className="space-y-3">
                    <div className="text-center py-3">
                      <div className="loading loading-spinner loading-md mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Initiating payment... Please wait.</p>
                    </div>
                    <Button className="w-full" disabled>
                      Processing...
                    </Button>
                  </div>
                )}

                {/* Show current status for debugging */}
                {status !== 'idle' && (
                  <div className={`text-center py-2 px-3 rounded-lg text-sm ${
                    status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    <strong>Payment Status: {status.toUpperCase()}</strong>
                    {checkoutRequestId && <div className="text-xs mt-1">ID: {checkoutRequestId.substring(0, 20)}...</div>}
                    {paymentError && <div className="text-xs mt-1 text-red-600">Error: {paymentError}</div>}
                  </div>
                )}

                {paymentMethod === 'mpesa' && status === 'pending' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Smartphone className="w-5 h-5" />
                        <p className="font-medium">Payment Initiated!</p>
                      </div>
                      <ul className="text-sm text-blue-600 mt-2 space-y-1">
                        <li>• Check your phone for M-Pesa prompt</li>
                        <li>• Enter your M-Pesa PIN to approve payment</li>
                        <li>• Wait for confirmation SMS from M-Pesa</li>
                        <li>• Payment will auto-complete in 1-2 minutes</li>
                      </ul>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-2">
                        If you already completed the payment, click below to confirm:
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleConfirmManually}
                        disabled={status === 'processing'}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        I've Completed Payment
                      </Button>
                    </div>
                  </div>
                )}

                {paymentMethod === 'paypal' && status === 'pending' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-800">
                        <CreditCard className="w-5 h-5" />
                        <p className="font-medium">Redirecting to PayPal</p>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        You will be redirected to PayPal to complete your payment of ${usdAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-blue-500 mt-1">
                        Exchange rate: 1 USD ≈ Ksh {exchangeRate}
                      </p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm text-yellow-800">
                          International payments may take 2-3 minutes to process
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {status !== 'processing' && status !== 'pending' && status !== 'completed' && (
                  <Button 
                    onClick={handleCheckout}
                    className="w-full"
                    disabled={processing || isEmpty || (paymentMethod === 'mpesa' && !customer.phone)}
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span>Pay {paymentMethod === 'mpesa' ? 'Ksh' : '$'} {paymentMethod === 'mpesa' ? totalPrice.toLocaleString() : usdAmount.toFixed(2)}</span>
                        {paymentMethod !== 'mpesa' && (
                          <span className="text-xs opacity-70">≈ Ksh {totalPrice.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </Button>
                )}

                {(status === 'failed' || status === 'cancelled' || status === 'timeout') && (
                  <div className="text-center">
                    <p className="text-red-500 text-sm mb-2">
                      Payment failed. Please try again.
                    </p>
                    <Button 
                      onClick={() => {
                        reset()
                        setProcessing(false)
                      }}
                      className="w-full"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}