import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/store'
import { api, ebookUploadApi } from '@/lib/api'
import { useEbookPayment } from '@/hooks/payment/modules'
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Smartphone, 
  CreditCard, 
  Globe,
  BookOpen,
  User,
  Hash,
  Image,
  DollarSign,
  ArrowRight,
  FileCheck,
  Sparkles
} from 'lucide-react'

interface UploadForm {
  book_title: string
  author: string
  isbn: string
  book: File | null
  cover_image: File | null
}

interface Pricing {
  KES: string
  USD: string
  EUR: string
}

const STEPS = [
  { id: 'form', label: 'Book Details', icon: BookOpen },
  { id: 'payment', label: 'Payment', icon: DollarSign },
  { id: 'uploading', label: 'Processing', icon: Loader2 },
  { id: 'success', label: 'Complete', icon: CheckCircle },
]

export function EbookUploadPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const bookInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<UploadForm>({
    book_title: '',
    author: '',
    isbn: '',
    book: null,
    cover_image: null,
  })
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [loadingPricing, setLoadingPricing] = useState(true)
  const [step, setStep] = useState<'form' | 'payment' | 'uploading' | 'success'>('form')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadedBookPath, setUploadedBookPath] = useState('')
  const [uploadedCoverPath, setUploadedCoverPath] = useState('')
  const [paymentInfo, setPaymentInfo] = useState<{ checkoutRequestId: string; paymentId: number } | null>(null)
  const [ebookUploadId, setEbookUploadId] = useState<string | null>(null)
  const [isCreatingRecord, setIsCreatingRecord] = useState(false)
  const [phone, setPhone] = useState('')

  const currentStepIndex = STEPS.findIndex(s => s.id === step)

  useEffect(() => {
    if (user?.telephone) {
      const cleanPhone = user.telephone.replace(/^\+254/, '').replace(/^254/, '')
      setPhone(cleanPhone)
    }
  }, [user])

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-base-300 -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-10" 
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((s, idx) => {
          const Icon = s.icon
          const isActive = idx === currentStepIndex
          const isCompleted = idx < currentStepIndex
          const isPending = idx > currentStepIndex
          
          return (
            <div key={s.id} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-primary text-primary-content' :
                  isActive ? 'bg-primary text-primary-content ring-4 ring-primary/30' :
                  'bg-base-300 text-base-content/50'
                }`}
              >
                {isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs mt-2 font-medium ${isActive || isCompleted ? 'text-primary' : 'text-base-content/50'}`}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const handleProceedToPayment = async () => {
    console.log('handleProceedToPayment called', { user: user?.user_id, step })
    if (!validate()) {
      console.log('Validation failed')
      return
    }
    if (!user?.user_id) {
      console.log('User not logged in, redirecting to login')
      navigate('/login')
      return
    }

    // First upload files and create the record
    setIsCreatingRecord(true)
    try {
      let bookPath = ''
      let coverPath = ''

      // Upload book file
      if (form.book) {
        const bookResult = await ebookUploadApi.uploadFile('book', form.book)
        if (bookResult.data?.success) {
          bookPath = bookResult.data.data
        }
      }

      // Upload cover image
      if (form.cover_image) {
        const coverResult = await ebookUploadApi.uploadFile('cover_image', form.cover_image)
        if (coverResult.data?.success) {
          coverPath = coverResult.data.data
        }
      }

      // Create ebook_uploader record with pending status
      const createResponse = await ebookUploadApi.create({
        book_title: form.book_title,
        author: form.author,
        isbn: form.isbn,
        book: bookPath,
        cover_image: coverPath,
        user_id: Number(user?.user_id),
        date_uploaded: new Date().toISOString(),
        status: 'pending',
        payment_status: 'unpaid',
        payment_id: '',
      })

      // Get the created record ID
      const newId = createResponse.data?.data?.id || createResponse.data?.id
      console.log('Created ebook_uploader with ID:', newId)
      setEbookUploadId(String(newId))

    } catch (err) {
      console.error('Failed to create record:', err)
      setErrors({ submit: 'Failed to prepare upload. Please try again.' })
      setIsCreatingRecord(false)
      return
    }

    setIsCreatingRecord(false)
    console.log('Proceeding to payment step')
    setStep('payment')
  }

  const handleFileChange = (field: 'book' | 'cover_image', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm(prev => ({ ...prev, [field]: file }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.book_title.trim()) newErrors.book_title = 'Book title is required'
    if (!form.author.trim()) newErrors.author = 'Author name is required'
    if (!form.book) newErrors.book = 'Please upload your manuscript'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Fetch pricing on mount
  useEffect(() => {
    console.log('Fetching pricing...')
    const timeoutId = setTimeout(() => {
      console.log('Pricing timeout - using defaults')
      setPricing({ KES: '500', USD: '5', EUR: '4' })
      setLoadingPricing(false)
    }, 5000)

    api.get('/ebookpricing')
      .then(res => {
        console.log('Pricing response:', res.data)
        const pricingData = res.data
        if (pricingData && pricingData.KES && pricingData.KES !== '0') {
          setPricing(pricingData)
        } else {
          console.log('Pricing is 0 or invalid, using defaults')
          setPricing({ KES: '500', USD: '5', EUR: '4' })
        }
      })
      .catch(err => {
        console.error('Pricing fetch error:', err)
      })
      .finally(() => {
        console.log('Pricing fetch complete')
        clearTimeout(timeoutId)
        setLoadingPricing(false)
      })
  }, [])

  // Handle payment success - backend already updates the record!
  const handlePaymentSuccess = async (payment: { checkoutRequestId: string; paymentId: number }) => {
    console.log('Payment successful!', payment)
    setStep('success')
  }

  const handleCreateUpload = async (checkoutRequestId?: string) => {
    setStep('uploading')
    setUploadProgress(10)

    try {
      let bookPath = uploadedBookPath
      let coverPath = uploadedCoverPath

      if (!bookPath && form.book) {
        const bookResult = await ebookUploadApi.uploadFile('book', form.book)
        if (bookResult.data?.success) {
          bookPath = bookResult.data.data
        }
      }

      setUploadProgress(40)

      if (!coverPath && form.cover_image) {
        const coverResult = await ebookUploadApi.uploadFile('cover_image', form.cover_image)
        if (coverResult.data?.success) {
          coverPath = coverResult.data.data
        }
      }

      setUploadProgress(70)

      // Use the real checkoutRequestId from payment, or fallback if not available
      const finalPaymentId = checkoutRequestId || paymentInfo?.checkoutRequestId || `ebook-${Date.now()}-${Math.random().toString(36).substring(7)}`

      console.log('Creating ebook_uploader with payment_id:', finalPaymentId)

      await ebookUploadApi.create({
        book_title: form.book_title,
        author: form.author,
        isbn: form.isbn,
        book: bookPath,
        cover_image: coverPath,
        user_id: String(user?.user_id),
        date_uploaded: new Date().toISOString(),
        status: 'pending',
        payment_status: 'unpaid',
        payment_id: finalPaymentId,
      })

      setUploadProgress(100)
      setStep('success')
    } catch (err) {
      console.error('Upload error:', err)
      setErrors({ submit: 'Failed to submit. Please try again.' })
      setStep('form')
    }
  }

  if (loadingPricing) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-base-content/70">Loading pricing information...</p>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-base-200 py-8 px-4">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold">Conversion Submitted!</h1>
            <p className="text-base-content/60 mt-1">Your eBook is being processed</p>
          </div>

          {renderStepIndicator()}

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-6 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-success" />
              </div>
              
              <div>
                <h2 className="text-xl font-bold mb-2">Success!</h2>
                <p className="text-base-content/70">
                  Your eBook conversion has been submitted and is now processing. You can track the progress in your dashboard.
                </p>
              </div>

              <div className="p-4 bg-base-200 rounded-xl text-left">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Book</span>
                    <span className="font-medium">{form.book_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Author</span>
                    <span className="font-medium">{form.author}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-primary btn-block"
                >
                  View in Dashboard
                </button>
                <button
                  onClick={() => {
                    setStep('form')
                    setForm({ book_title: '', author: '', isbn: '', book: null, cover_image: null })
                  }}
                  className="btn btn-outline btn-block"
                >
                  Convert Another Book
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'uploading') {
    return (
      <div className="min-h-screen bg-base-200 py-8 px-4">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold">Processing</h1>
            <p className="text-base-content/60 mt-1">Submitting your manuscript</p>
          </div>

          {renderStepIndicator()}

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-6 text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-base-300" />
                <div 
                  className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold">Please Wait...</h2>
                <p className="text-base-content/70 mt-2">
                  We're preparing your manuscript for conversion
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-semibold">{uploadProgress}%</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={uploadProgress} 
                  max="100" 
                />
              </div>

              <div className="text-sm text-base-content/50">
                Please don't close this page
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-base-200 py-8 px-4">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Complete Payment</h1>
            <p className="text-base-content/60 mt-1">Choose your preferred payment method</p>
          </div>

          {renderStepIndicator()}

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-6 space-y-6">
              {/* Price Card */}
              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-content/70 text-sm">Total Amount</p>
                    <p className="text-4xl font-bold">KES {pricing ? parseInt(pricing.KES).toLocaleString() : '500'}</p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                    <FileCheck className="w-7 h-7" />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-base-200 rounded-xl">
                <p className="text-sm font-semibold mb-3">Order Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Book Title</span>
                    <span className="font-medium">{form.book_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Author</span>
                    <span className="font-medium">{form.author}</span>
                  </div>
                  {form.isbn && (
                    <div className="flex justify-between">
                      <span className="text-base-content/70">ISBN</span>
                      <span className="font-medium">{form.isbn}</span>
                    </div>
                  )}
                </div>
              </div>

              <EbookPaymentForm
                phone={phone}
                ebookUploadId={ebookUploadId}
                bookTitle={form.book_title}
                author={form.author}
                isbn={form.isbn}
                amount={pricing ? parseInt(pricing.KES) || 500 : 500}
                onSuccess={handlePaymentSuccess}
                onFailed={(err) => {
                  console.error('Payment failed:', err)
                  setErrors({ ...errors, submit: 'Payment failed. Please try again.' })
                  setStep('form')
                }}
              />

              <button
                onClick={() => setStep('form')}
                className="btn btn-outline btn-block"
              >
                ← Back to Book Details
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">eBook Conversion</h1>
          <p className="text-base-content/60 mt-1">Transform your manuscript into a professional eBook</p>
        </div>

        {/* Progress Steps */}
        {renderStepIndicator()}

        {/* Main Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-6">
            
            {step === 'form' && (
              <form onSubmit={(e) => { e.preventDefault(); handleProceedToPayment(); }} className="space-y-6">
                {/* Price Tag */}
                {pricing && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-base-content/70">Conversion Price</p>
                        <p className="text-2xl font-bold text-primary">KES {parseInt(pricing.KES).toLocaleString()}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <FileCheck className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Book Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-base-content/80 uppercase tracking-wider">
                    <BookOpen className="w-4 h-4" />
                    Book Details
                  </div>
                  
                  {/* Book Title */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-base-content/50" />
                        Book Title
                      </span>
                      <span className="label-text-alt text-error">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter the full title of your book"
                        className={`input input-bordered pl-10 ${errors.book_title ? 'input-error' : 'focus:input-primary'}`}
                        value={form.book_title}
                        onChange={e => setForm(prev => ({ ...prev, book_title: e.target.value }))}
                      />
                      <BookOpen className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                    </div>
                    {errors.book_title && (
                      <label className="label">
                        <span className="label-text-alt text-error flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.book_title}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Author */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-base-content/50" />
                        Author Name
                      </span>
                      <span className="label-text-alt text-error">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter author name"
                        className={`input input-bordered pl-10 ${errors.author ? 'input-error' : 'focus:input-primary'}`}
                        value={form.author}
                        onChange={e => setForm(prev => ({ ...prev, author: e.target.value }))}
                      />
                      <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                    </div>
                    {errors.author && (
                      <label className="label">
                        <span className="label-text-alt text-error flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.author}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* ISBN */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <Hash className="w-4 h-4 text-base-content/50" />
                        ISBN
                      </span>
                      <span className="label-text-alt text-base-content/50">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter ISBN if available"
                        className="input input-bordered pl-10 focus:input-primary"
                        value={form.isbn}
                        onChange={e => setForm(prev => ({ ...prev, isbn: e.target.value }))}
                      />
                      <Hash className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                    </div>
                  </div>
                </div>

                <div className="divider" />

                {/* File Uploads Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-base-content/80 uppercase tracking-wider">
                    <Upload className="w-4 h-4" />
                    File Uploads
                  </div>

                  {/* Manuscript Upload */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Manuscript
                      </span>
                      <span className="label-text-alt text-error">* Required</span>
                    </label>
                    <input
                      ref={bookInputRef}
                      type="file"
                      className="hidden"
                      accept=".docx,.doc,.pdf,.epub,.json"
                      onChange={e => handleFileChange('book', e)}
                    />
                    <div
                      className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-300 ${
                        errors.book 
                          ? 'border-error bg-error/5' 
                          : form.book 
                            ? 'border-success bg-success/5' 
                            : 'border-base-300 hover:border-primary hover:bg-primary/5'
                      }`}
                      onClick={() => bookInputRef.current?.click()}
                    >
                      {form.book ? (
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-success" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-success">{form.book.name}</p>
                            <p className="text-sm text-base-content/60">
                              {(form.book.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button 
                            type="button"
                            className="btn btn-sm btn-circle btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setForm(prev => ({ ...prev, book: null }))
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <Upload className="w-10 h-10 mx-auto mb-2 text-base-content/40" />
                          <p className="text-sm font-medium">
                            Click to upload manuscript
                          </p>
                          <p className="text-xs text-base-content/50 mt-1">
                            PDF, DOCX, EPUB (Max 100MB)
                          </p>
                        </div>
                      )}
                    </div>
                    {errors.book && (
                      <label className="label">
                        <span className="label-text-alt text-error flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.book}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Cover Image Upload */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <Image className="w-4 h-4 text-base-content/60" />
                        Cover Image
                      </span>
                      <span className="label-text-alt text-base-content/50">(Optional)</span>
                    </label>
                    <input
                      ref={coverInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={e => handleFileChange('cover_image', e)}
                    />
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                        form.cover_image
                          ? 'border-success bg-success/5'
                          : 'border-base-300 hover:border-primary hover:bg-primary/5'
                      }`}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {form.cover_image ? (
                        <div className="flex items-center gap-4">
                          <img
                            src={URL.createObjectURL(form.cover_image)}
                            alt="Cover preview"
                            className="w-16 h-20 object-cover rounded-lg shadow"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{form.cover_image.name}</p>
                            <p className="text-sm text-base-content/60">
                              {(form.cover_image.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button 
                            type="button"
                            className="btn btn-sm btn-circle btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setForm(prev => ({ ...prev, cover_image: null }))
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3 py-2">
                          <Image className="w-8 h-8 text-base-content/40" />
                          <div className="text-left">
                            <p className="text-sm font-medium">Upload cover image</p>
                            <p className="text-xs text-base-content/50">JPG, PNG (Max 3MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {errors.submit && (
                  <div className="alert alert-error">
                    <AlertCircle className="w-5 h-5" />
                    <span>{errors.submit}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary btn-block text-lg"
                  disabled={isCreatingRecord}
                >
                  {isCreatingRecord ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Preparing Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Proceed to Payment
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EbookPaymentForm({
  phone: initialPhone,
  ebookUploadId,
  bookTitle,
  author,
  isbn,
  amount,
  onSuccess,
  onFailed,
}: {
  phone: string
  ebookUploadId: number
  bookTitle: string
  isbn?: string
  author: string
  amount: number
  onSuccess: () => void
  onFailed: (error: string) => void
}) {
  const [method, setMethod] = useState<'mpesa' | 'paypal'>('mpesa')
  const [phone, setPhone] = useState(initialPhone)
  const [exchangeRate, setExchangeRate] = useState(150)
  const [usdAmount, setUsdAmount] = useState(0)
  const [localStatus, setLocalStatus] = useState<'idle' | 'processing' | 'pending' | 'completed' | 'failed'>('idle')

  const { status, pay, error, confirmPayment } = useEbookPayment({
    ebookUploadId,
    bookTitle,
    author,
    isbn,
    onSuccess: () => {
      setLocalStatus('completed')
      onSuccess()
    },
    onFailed: onFailed,
  })

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await api.get('exchangerates/view/KES/USD')
        if (response.data.success) {
          setExchangeRate(response.data.data?.rate || 150)
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err)
        setExchangeRate(150)
      }
    }
    fetchExchangeRate()
  }, [])

  useEffect(() => {
    if (amount > 0 && exchangeRate > 0) {
      setUsdAmount(amount / exchangeRate)
    }
  }, [amount, exchangeRate])

  const handlePay = async () => {
    setLocalStatus('processing')
    
    const result = await pay({
      amount: method === 'paypal' ? usdAmount : amount,
      phone: method === 'mpesa' ? phone : undefined,
      method,
      description: `eBook Conversion - ${bookTitle}`,
      currency: method === 'paypal' ? 'USD' : 'KES',
    })

    if (result) {
      setLocalStatus('pending')
    } else {
      setLocalStatus('failed')
    }

    if (method === 'paypal' && result?.approveUrl) {
      setTimeout(() => {
        window.location.href = result.approveUrl
      }, 1500)
    }
  }

  const handleManualCheck = async () => {
    if (method === 'mpesa') {
      const result = await confirmPayment()
      if (result.success) {
        onSuccess()
      } else {
        onFailed(result.message || 'Payment not completed yet')
      }
    }
  }

  const isPending = localStatus === 'pending' || status === 'pending'
  const isCompleted = localStatus === 'completed' || status === 'completed'
  const isFailed = localStatus === 'failed' || status === 'failed'
  const isProcessing = localStatus === 'processing' || status === 'processing'

  return (
    <div className="space-y-4">
      {/* Payment Method Tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 ${
            method === 'mpesa' 
              ? 'bg-success/20 border-2 border-success text-success' 
              : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
          }`}
          onClick={() => { setMethod('mpesa'); setLocalStatus('idle'); }}
        >
          <Smartphone className="w-5 h-5" />
          <span className="font-medium">M-Pesa</span>
        </button>
        <button
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 ${
            method === 'paypal' 
              ? 'bg-primary/20 border-2 border-primary text-primary' 
              : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
          }`}
          onClick={() => { setMethod('paypal'); setLocalStatus('idle'); }}
        >
          <CreditCard className="w-5 h-5" />
          <span className="font-medium">PayPal</span>
        </button>
      </div>

      {/* Phone Input for M-Pesa */}
      {method === 'mpesa' && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Phone Number</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">+254</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="712345678"
              className="input input-bordered pl-14 w-full"
            />
          </div>
          <label className="label">
            <span className="label-text-alt text-base-content/50">Enter your M-Pesa registered phone number</span>
          </label>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Pay Button */}
      <button
        className={`btn btn-lg btn-block ${isFailed ? 'btn-error' : 'btn-primary'} ${isProcessing ? 'loading' : ''}`}
        onClick={handlePay}
        disabled={isPending || isCompleted || isFailed || (method === 'mpesa' && !phone)}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isFailed ? (
          'Try Again'
        ) : (
          <div className="flex flex-col items-center">
            <span className="flex items-center gap-2">
              Pay {method === 'mpesa' ? 'KES' : '$'} {method === 'mpesa' ? amount.toLocaleString() : usdAmount.toFixed(2)}
            </span>
            {method === 'paypal' && (
              <span className="text-xs opacity-70">≈ KES {amount.toLocaleString()}</span>
            )}
          </div>
        )}
      </button>

      {/* M-Pesa Pending State */}
      {isPending && method === 'mpesa' && (
        <div className="space-y-4">
          <div className="alert alert-info">
            <Smartphone className="w-5 h-5" />
            <div>
              <p className="font-bold">Payment Initiated!</p>
              <ul className="text-sm list-disc list-inside mt-2 space-y-1 text-base-content/80">
                <li>Check your phone for M-Pesa prompt</li>
                <li>Enter your PIN to authorize</li>
                <li>Wait for confirmation SMS</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleManualCheck}
            className="btn btn-success btn-block"
          >
            <CheckCircle className="w-5 h-5" />
            I've Completed Payment
          </button>
        </div>
      )}

      {/* PayPal Pending State */}
      {isPending && method === 'paypal' && (
        <div className="space-y-4">
          <div className="alert alert-info">
            <CreditCard className="w-5 h-5" />
            <div>
              <p className="font-bold">Redirecting to PayPal</p>
              <p className="text-sm">
                Complete your payment of ${usdAmount.toFixed(2)}
              </p>
              <p className="text-xs opacity-70 mt-1">
                Exchange rate: 1 USD ≈ KES {exchangeRate}
              </p>
            </div>
          </div>
          <div className="alert alert-warning">
            <Globe className="w-4 h-4" />
            <span className="text-sm">
              International payments may take 2-3 minutes
            </span>
          </div>
        </div>
      )}
    </div>
  )
}