import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, ArrowLeft, Book, Star, Calendar, Tag, Check, Loader2, Smartphone, Download, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'
import { useCart } from '@/store/cartStore'
import { usePaymentModule } from '@/hooks/payment'
import { useAuthStore } from '@/store/store'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { hasOfflineBook, saveOfflineBook, saveBookKey, deleteOfflineBook, deleteBookKey } from '@/lib/offlineBooks'
import { decryptEpub } from '@/lib/epubCrypto'

interface Book {
  book_id: number
  title: string
  author: string
  price_digital?: number
  price_physical?: number
  stock_digital: number
  stock_physical: number
  image_url: string
  overview?: string
  genre_id?: number
  genre?: { genre_id: number; genre_name: string }
  published_date?: string
  rate?: number
  available?: number
  isbn?: string
  librarybooks?: {
    soft_copy?: string
    book_key?: string
    book_keysignature?: string
  }
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addBookToCart, cartItems } = useCart()
  const user = useAuthStore(state => state.user)
  const [selectedFormat, setSelectedFormat] = useState<'digital' | 'physical'>('digital')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [buyingNow, setBuyingNow] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState('')
  const [isDownloaded, setIsDownloaded] = useState(false)

  const { data: book, isLoading, error } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      const res = await api.get(`books/view/${id}`)
      return res.data as Book
    },
    enabled: !!id,
  })

  const payment = usePaymentModule()

  const isPurchased = cartItems.some(item => item.book_id === Number(id))

  useQuery({
    queryKey: ['offline-status', id],
    queryFn: async () => {
      if (!id) return false
      const hasIt = await hasOfflineBook(Number(id))
      setIsDownloaded(hasIt)
      return hasIt
    },
    enabled: !!id && isPurchased,
  })

  const handleDownloadForOffline = async () => {
    if (!book || !user?.user_id || !book.librarybooks) return

    const { soft_copy: encryptedFile, book_key: encryptionKey, book_keysignature: ivSignature } = book.librarybooks

    if (!encryptedFile || !encryptionKey || !ivSignature) {
      setPaymentError('This book does not support offline download')
      return
    }

    setDownloading(true)
    setDownloadProgress('Preparing download...')
    setPaymentError('')

    try {
      setDownloadProgress('Downloading encrypted book file...')

      const filePath = encryptedFile.startsWith('uploads/')
        ? encryptedFile.slice('uploads/'.length)
        : encryptedFile

      const response = await api.get(`books/download/${book.book_id}`, {
        params: { userId: user.user_id },
        responseType: 'arraybuffer',
      })

      setDownloadProgress('Saving for offline reading...')

      await saveOfflineBook({
        bookId: book.book_id,
        title: book.title,
        author: book.author,
        coverImage: book.image_url,
        encryptedData: response.data,
        downloadedAt: new Date().toISOString(),
      })

      await saveBookKey({
        bookId: book.book_id,
        key: encryptionKey,
        iv: ivSignature,
      })

      setIsDownloaded(true)
      setDownloadProgress('Book saved for offline reading!')
      setTimeout(() => setDownloadProgress(''), 3000)
    } catch (err: any) {
      console.error('Download failed:', err)
      setPaymentError(err.response?.data?.message || 'Failed to download book')
    } finally {
      setDownloading(false)
    }
  }

  const handleRemoveOffline = async () => {
    if (!book) return

    try {
      await deleteOfflineBook(book.book_id)
      await deleteBookKey(book.book_id)
      setIsDownloaded(false)
      setDownloadProgress('Removed from offline storage')
      setTimeout(() => setDownloadProgress(''), 2000)
    } catch (err) {
      console.error('Failed to remove:', err)
    }
  }

  const handleAddToCart = async (format?: 'digital' | 'physical') => {
    if (!book) return

    // Use provided format or fall back to selected format
    const cartFormat = format || selectedFormat

    // Check if format is available (based on stock) - ensure numeric comparison
    const digitalStock = Number(book.stock_digital ?? 999)
    const physicalStock = Number(book.stock_physical ?? 0)
    const stock = cartFormat === 'digital' ? digitalStock : physicalStock
    
    if (stock <= 0) {
      setAdding(false)
      return
    }

    // Get price for the format
    const price = cartFormat === 'digital' 
      ? book.price_digital
      : book.price_physical
    
    if (!price) {
      setAdding(false)
      return
    }
    
    setAdding(true)
    const success = addBookToCart({
      book_id: book.book_id,
      title: book.title,
      author: book.author,
      price: price,
      cover_image: book.image_url,
      format: cartFormat,
    })
    
    if (success) {
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    }
    setAdding(false)
  }

  const handleBuyNow = async () => {
    if (!book || !user?.user_id) {
      navigate('/login')
      return
    }

    // Validate selected format is available (based on stock)
    const digitalStock = book.stock_digital ?? 999
    const physicalStock = book.stock_physical ?? 0
    
    if (selectedFormat === 'digital' && digitalStock <= 0) {
      setPaymentError('Digital format not available (out of stock)')
      return
    }
    if (selectedFormat === 'physical' && physicalStock <= 0) {
      setPaymentError('Physical format not available (out of stock)')
      return
    }

    setBuyingNow(true)
    setPaymentError('')

    const phone = user?.telephone
    if (!phone) {
      setPaymentError('Please update your phone number in your profile first')
      setBuyingNow(false)
      return
    }

    // Get price based on format selected
    const amount = selectedFormat === 'digital' 
      ? book.price_digital
      : book.price_physical

    await payment.initiate({
      module: 'book_purchase',
      amount: amount,
      phone: user.telephone,
      metadata: { 
        book_id: book.book_id,
        format: selectedFormat,
        title: book.title,
        author: book.author,
        price: amount,
      },
      description: `${selectedFormat === 'digital' ? 'Digital' : 'Physical'} Book: ${book.title}`,
      autoVerify: true,
      onSuccess: () => {
        navigate('/orders')
      },
      onFailed: (msg) => {
        setPaymentError(msg)
        setBuyingNow(false)
      },
      onPending: () => {
        // STK push sent - user needs to enter PIN
      },
    })
  }

  // Buy Now with specific format (for books with both formats)
  const handleBuyNowWithFormat = async (format: 'digital' | 'physical') => {
    if (!book || !user?.user_id) {
      navigate('/login')
      return
    }

    // Validate format is available (based on stock)
    const stock = format === 'digital' ? (book.stock_digital ?? 999) : (book.stock_physical ?? 0)
    
    if (stock <= 0) {
      setPaymentError(`${format === 'digital' ? 'Digital' : 'Physical'} format not available (out of stock)`)
      return
    }

    setBuyingNow(true)
    setPaymentError('')

    const phone = user?.telephone
    if (!phone) {
      setPaymentError('Please update your phone number in your profile first')
      setBuyingNow(false)
      return
    }

    // Get price for the specified format
    const amount = format === 'digital' ? book.price_digital : book.price_physical

    await payment.initiate({
      module: 'book_purchase',
      amount: amount,
      phone: user.telephone,
      metadata: { 
        book_id: book.book_id,
        format: format,
        title: book.title,
        author: book.author,
        price: amount,
      },
      description: `${format === 'digital' ? 'Digital' : 'Physical'} Book: ${book.title}`,
      autoVerify: true,
      onSuccess: () => {
        navigate('/orders')
      },
      onFailed: (msg) => {
        setPaymentError(msg)
        setBuyingNow(false)
      },
      onPending: () => {},
    })
  }

  const handleConfirmManually = async (format?: 'digital' | 'physical') => {
    if (!payment.checkoutRequestId || !user?.user_id || !book) {
      return
    }

    const confirmFormat = format || selectedFormat

    try {
      const res = await api.post('payments/confirm-payment', {
        checkoutRequestId: payment.checkoutRequestId,
        userId: user.user_id,
        bookId: book.book_id,
        format: confirmFormat,
        amount: confirmFormat === 'digital' 
          ? book.price_digital
          : book.price_physical,
      })

      if (res.data.success || res.data?.confirmed) {
        navigate('/orders')
      }
    } catch (err: any) {
      console.error('Confirm payment error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-500">Loading book details...</p>
        </div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Book not found</p>
          <Button onClick={() => navigate('/books/shop')}>Back to Shop</Button>
        </div>
      </div>
    )
  }

  const imageUrl = book.image_url ? setImgUrl(book.image_url, 'large') : '/no-image.png'

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-primary mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Shop
        </button>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Book Cover */}
          <div className="md:col-span-1">
            <Card className="p-4 sticky top-4">
              <img 
                src={imageUrl} 
                alt={book.title}
                className="w-full rounded-lg shadow-lg"
              />
            </Card>
          </div>

          {/* Book Details */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
                  <p className="text-lg text-gray-600 mt-1">by {book.author}</p>
                </div>
                {book.rate && book.rate > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{book.rate}/5</span>
                  </div>
                )}
              </div>

              {/* Price - shows both formats */}
              <div className="mt-6">
                <div className="flex flex-col gap-2">
                  {(book.stock_digital ?? 999) > 0 && book.price_digital && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${selectedFormat === 'digital' ? 'text-primary' : 'text-purple-600'}`}>
                          KES {book.price_digital?.toLocaleString()}
                        </span>
                        {selectedFormat === 'digital' && (
                          <span className="badge badge-primary">Selected</span>
                        )}
                      </div>
                      <span className="text-sm text-purple-600 font-medium">Digital</span>
                    </div>
                  )}
                  {(book.stock_physical ?? 0) > 0 && book.price_physical && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${selectedFormat === 'physical' ? 'text-primary' : 'text-blue-600'}`}>
                          KES {book.price_physical?.toLocaleString()}
                        </span>
                        {selectedFormat === 'physical' && (
                          <span className="badge badge-primary">Selected</span>
                        )}
                      </div>
                      <span className="text-sm text-blue-600 font-medium">Physical</span>
                    </div>
                  )}
                  {(book.stock_digital ?? 999) <= 0 && (book.stock_physical ?? 0) <= 0 && (
                    <span className="text-xl text-red-500">Out of Stock</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedFormat === 'digital' 
                    ? `Instant download after payment`
                    : `Physical delivery within 3-5 business days`}
                </p>
              </div>

              {/* Format Selection */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Format
                </label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 cursor-pointer ${(book.stock_digital ?? 999) <= 0 ? 'opacity-50' : ''}`}>
                    <input
                      type="radio"
                      name="format"
                      value="digital"
                      checked={selectedFormat === 'digital'}
                      onChange={() => setSelectedFormat('digital')}
                      disabled={(book.stock_digital ?? 999) <= 0}
                      className="radio radio-primary"
                    />
                    <span className="flex items-center gap-2">
                      <Book className="w-4 h-4" />
                      Digital 
                      {(book.stock_digital ?? 999) > 0 && book.price_digital ? (
                        <span className="text-green-600 text-sm">(KES {book.price_digital.toLocaleString()})</span>
                      ) : (
                        <span className="text-red-500 text-sm">(Out of Stock)</span>
                      )}
                    </span>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer ${(book.stock_physical ?? 0) <= 0 ? 'opacity-50' : ''}`}>
                    <input
                      type="radio"
                      name="format"
                      value="physical"
                      checked={selectedFormat === 'physical'}
                      onChange={() => setSelectedFormat('physical')}
                      disabled={(book.stock_physical ?? 0) <= 0}
                      className="radio radio-primary"
                    />
                    <span className="flex items-center gap-2">
                      <Book className="w-4 h-4" />
                      Physical
                      {(book.stock_physical ?? 0) > 0 && book.price_physical ? (
                        <span className="text-green-600 text-sm">(KES {book.price_physical.toLocaleString()})</span>
                      ) : (
                        <span className="text-red-500 text-sm">(Out of Stock)</span>
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {/* Add to Cart Button */}
              <div className="mt-6 space-y-3">
                {paymentError && (
                  <div className="text-red-500 text-sm">{paymentError}</div>
                )}

                {/* Payment Success Message */}
                {payment.isCompleted && (
                  <div className="alert alert-success">
                    <Check className="w-5 h-5" />
                    <div>
                      <p className="font-bold">Payment Received!</p>
                      <p className="text-sm">Order created. Check your orders page.</p>
                    </div>
                    <button onClick={() => navigate('/orders')} className="btn btn-sm">
                      View Orders
                    </button>
                  </div>
                )}

                {/* Payment Pending - STK Push Sent */}
                {payment.isPending && (
                  <div className="space-y-4">
                    <div className="alert alert-warning">
                      <Smartphone className="w-5 h-5" />
                      <div>
                        <p className="font-bold">STK Push Sent!</p>
                        <p className="text-sm">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                      </div>
                    </div>
                    
                    {payment.checkoutRequestId && (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">
                          If you already completed the payment, click below to confirm:
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleConfirmManually}
                          disabled={payment.isProcessing}
                        >
                          I Already Paid - Confirm Now
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {added ? (
                  <Button className="w-full bg-green-500 hover:bg-green-600" disabled>
                    <Check className="w-5 h-5 mr-2" />
                    Added to Cart
                  </Button>
                ) : !payment.isPending && !payment.isCompleted && (
                  <div className="space-y-3">
                  {/* When both formats available, show separate buttons */}
                  {Number(book.stock_digital ?? 999) > 0 && Number(book.stock_physical ?? 0) > 0 ? (
                    <>
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => handleAddToCart('digital')}
                          disabled={adding || isPurchased}
                          className="flex-1 bg-purple-500 hover:bg-purple-600"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add Digital
                        </Button>
                        <Button 
                          onClick={() => handleAddToCart('physical')}
                          disabled={adding || isPurchased}
                          className="flex-1 bg-blue-500 hover:bg-blue-600"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add Physical
                        </Button>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => handleBuyNowWithFormat('digital')}
                          disabled={buyingNow || payment.isProcessing}
                          className="flex-1"
                          variant="outline"
                        >
                          Buy Digital
                          </Button>
                          <Button 
                            onClick={() => handleBuyNowWithFormat('physical')}
                            disabled={buyingNow || payment.isProcessing}
                            className="flex-1"
                            variant="outline"
                          >
                            Buy Physical
                          </Button>
                        </div>
                      </>
                    ) : (
                      /* When only one format available */
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleAddToCart}
                          disabled={adding || isPurchased}
                          className="flex-1"
                          variant="outline"
                        >
                          {adding ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          ) : (
                            <ShoppingCart className="w-5 h-5 mr-2" />
                          )}
                          {isPurchased ? 'In Cart' : 'Add to Cart'}
                        </Button>
                        <Button 
                          onClick={handleBuyNow}
                          disabled={buyingNow || payment.isProcessing}
                          className="flex-1"
                        >
                          {buyingNow || payment.isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          ) : null}
                          {payment.isPending ? 'Awaiting...' : 'Buy Now'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Offline Download Section - Only show for purchased digital books */}
              {isPurchased && selectedFormat === 'digital' && book?.librarybooks?.soft_copy && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Offline Reading
                  </h3>
                  
                  {downloadProgress && (
                    <div className="text-sm text-green-600 mb-3">{downloadProgress}</div>
                  )}
                  
                  {paymentError && (
                    <div className="text-sm text-red-500 mb-3">{paymentError}</div>
                  )}

                  {isDownloaded ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Available offline</span>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => navigate(`/library/read/${book.book_id}`)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Book className="w-4 h-4 mr-2" />
                          Read Offline
                        </Button>
                        <Button 
                          onClick={handleRemoveOffline}
                          variant="outline"
                          className="btn-outline"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Download this book to read offline without internet connection.
                        The book file is stored securely on your device.
                      </p>
                      <Button 
                        onClick={handleDownloadForOffline}
                        disabled={downloading}
                        className="w-full"
                        variant="outline"
                      >
                        {downloading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            {downloadProgress || 'Downloading...'}
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download for Offline
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Book Info Tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                {book.genre && (
                  <span className="badge badge-outline flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {book.genre.genre_name}
                  </span>
                )}
                {book.published_date && (
                  <span className="badge badge-outline flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(book.published_date).getFullYear()}
                  </span>
                )}
                {book.isbn && (
                  <span className="badge badge-outline">
                    ISBN: {book.isbn}
                  </span>
                )}
              </div>
            </Card>

            {/* Description */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">About this Book</h2>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: book.overview || '<p class="text-gray-500">No description available.</p>' 
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
