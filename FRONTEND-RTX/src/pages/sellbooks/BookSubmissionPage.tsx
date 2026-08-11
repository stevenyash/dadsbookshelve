import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Loader2, AlertCircle, FileText, ArrowLeft, Book, ArrowRight, Sparkles, FileCheck, PenTool } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/store'
import { BookDetailsStep } from './BookDetailsStep'
import { FileUploadStep } from './FileUploadStep'
import { ConsentStep } from './ConsentStep'
import {
  BookDetails,
  FileDetails,
  ConsentData,
  initialBookDetails,
  initialFileDetails,
  initialConsent,
} from './types'

type Format = 'softcopy' | 'hardcopy'

interface SettingsData {
  publishing_rate?: string
  publisher_agreement?: string
  publisher_declaration?: string
}

const STEPS_CONFIG = [
  { id: 1, label: 'Book Details', icon: Book },
  { id: 2, label: 'Upload File', icon: FileText },
  { id: 3, label: 'Agreement', icon: PenTool },
]

export function BookSubmissionPage() {
  const { type } = useParams<{ type: Format }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const format: Format = type === 'hardcopy' ? 'hardcopy' : 'softcopy'
  const isSoftcopy = format === 'softcopy'
  const totalSteps = isSoftcopy ? 3 : 2
  
  const [step, setStep] = useState(1)
  const [bookDetails, setBookDetails] = useState<BookDetails>(initialBookDetails)
  const [fileDetails, setFileDetails] = useState<FileDetails>(initialFileDetails)
  const [consent, setConsent] = useState<ConsentData>(initialConsent)
  const [settings, setSettings] = useState<SettingsData>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const getActiveSteps = () => {
    if (isSoftcopy) {
      return STEPS_CONFIG
    }
    return [
      { id: 1, label: 'Book Details', icon: Book },
      { id: 2, label: 'Agreement', icon: PenTool },
    ]
  }
  
  const activeSteps = getActiveSteps()
  const currentStepIndex = activeSteps.findIndex(s => s.id === step)

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-base-300 -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-10" 
          style={{ width: `${(currentStepIndex / (activeSteps.length - 1)) * 100}%` }}
        />
        {activeSteps.map((s, idx) => {
          const Icon = s.icon
          const isActive = idx === currentStepIndex
          const isCompleted = idx < currentStepIndex
          
          return (
            <div key={s.id} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-primary text-primary-content' :
                  isActive ? 'bg-primary text-primary-content ring-4 ring-primary/30' :
                  'bg-base-300 text-base-content/50'
                }`}
              >
                {isActive && step < totalSteps ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
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

  useQuery({
    queryKey: ['publishing-settings'],
    queryFn: async () => {
      const res = await api.get('settings')
      const data = res.data
      if (data) {
        setSettings({
          publishing_rate: data.publishing_rate || '70',
          publisher_agreement: data.publisher_agreement || '',
          publisher_declaration: data.publisher_declaration || '',
        })
        setConsent(prev => ({
          ...prev,
          revenue_sharing_percentage: data.publishing_rate || '70',
          agreement: data.publisher_agreement || '',
          declaration: data.publisher_declaration || '',
        }))
      }
      return data
    },
  })

  const handleBookDetailsNext = (data: BookDetails) => {
    setBookDetails(data)
    setStep(format === 'softcopy' ? 2 : 2)
  }

  const handleFileDetailsNext = (data: FileDetails) => {
    setFileDetails(data)
    setStep(3)
  }

  const handleConsentNext = (data: ConsentData) => {
    // Don't advance - submission happens on consent step
  }

  const submitData = async (
    consentData: ConsentData, 
    bookData: BookDetails, 
    fileData?: FileDetails
  ) => {
    if (!user?.user_id) {
      navigate('/login')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Upload cover image if exists
      let coverImageUrl = ''
      if (bookData.image_url) {
        const coverFormData = new FormData()
        coverFormData.append('files', bookData.image_url)
        const coverRes = await api.post('file/upload/cover_image', coverFormData, {
          headers: {
            'Content-Type': undefined,
          },
        })
        if (coverRes.data?.data) {
          coverImageUrl = coverRes.data
        }
      }

      // Upload eBook file for softcopy
      let softCopyUrl = ''
      if (format === 'softcopy' && fileData?.soft_copy) {
        const bookFormData = new FormData()
        bookFormData.append('files', fileData.soft_copy)
        const fileRes = await api.post('file/upload/book', bookFormData, {
          headers: {
            'Content-Type': undefined,
          },
        })
        if (fileRes.data?.data) {
          softCopyUrl = fileRes.data
        }
      }

      const payload = {
        consent: {
          user_id: user.user_id,
          user_name: user.name,
          user_email: user.email,
          user_phone: user.telephone || '',
          agreement_confirmation: consentData.agreement_confirmation,
          ownership_declaration: consentData.ownership_declaration,
          user_details_confirmation: consentData.user_details_confirmation,
          e_signature: consentData.e_signature,
          agreement: settings.publisher_agreement || consentData.agreement,
          declaration: settings.publisher_declaration || consentData.declaration,
          revenue_sharing_percentage: consentData.revenue_sharing_percentage,
        },
        publishingBooks: [
          {
            book_title: bookData.book_title,
            author: bookData.author,
            isbn: bookData.isbn,
            genre_id: bookData.genre_id,
            image_url: coverImageUrl,
            ...(format === 'softcopy'
              ? { softcopy_price: bookData.softcopy_price }
              : { hardcopy_price: bookData.hardcopy_price }),
            overview: bookData.overview,
            comments: bookData.overview || bookData.comments,
          }
        ],
        ...(format === 'softcopy' && softCopyUrl
          ? {
              libraryBooks: [
                { soft_copy: softCopyUrl }
              ]
            }
          : {})
      }

      const endpoint = format === 'softcopy'
        ? 'salesbooks/submit-softcopy-publication'
        : 'salesbooks/submit-hardcopy-publication'

      await api.post(endpoint, payload)

      setIsSubmitted(true)
    } catch (err: any) {
      console.error('Submission error:', err)
      setError(err.response?.data?.message || 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold">Submission Successful!</h2>
            <p className="text-base-content/70 mb-4">
              Your book has been submitted for review. You'll receive a notification once it's approved and listed in the shop.
            </p>
            <div className="mt-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary btn-block"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/sellbooks')}
                className="btn btn-ghost btn-block mt-2"
              >
                Submit Another Book
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Steps indicator
  const steps = [
    { num: 1, label: 'Book Details', icon: Book },
    ...(format === 'softcopy' ? [{ num: 2, label: 'Upload File', icon: FileText }] : []),
    { num: format === 'softcopy' ? 3 : 2, label: 'Agreement', icon: CheckCircle },
  ]

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/sellbooks')}
            className="btn btn-ghost btn-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold">
            Submit {format === 'softcopy' ? 'eBook' : 'Physical Book'} for Sale
          </h1>
          <p className="text-base-content/70">
            {format === 'softcopy'
              ? 'Sell your digital book on DADS Bookshelves'
              : 'Sell printed copies on DADS Bookshelves'}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s.num
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-300'
                }`}
              >
                {step > s.num ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    step > s.num ? 'bg-primary' : 'bg-base-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step content */}
        {step === 1 && (
          <BookDetailsStep
            formData={bookDetails}
            onNext={handleBookDetailsNext}
            format={format}
          />
        )}

        {step === 2 && format === 'softcopy' && (
          <FileUploadStep
            formData={fileDetails}
            onNext={handleFileDetailsNext}
            onBack={() => setStep(1)}
            bookTitle={bookDetails.book_title}
          />
        )}

        {step === 3 && format === 'softcopy' && (
          <ConsentStep
            formData={consent}
            onNext={handleConsentNext}
            onBack={() => setStep(2)}
            bookDetails={bookDetails}
            fileDetails={fileDetails}
            submitData={submitData}
            isSubmitting={isSubmitting}
            format={format}
          />
        )}

        {step === 2 && format === 'hardcopy' && (
          <ConsentStep
            formData={consent}
            onNext={handleConsentNext}
            onBack={() => setStep(1)}
            bookDetails={bookDetails}
            submitData={submitData}
            isSubmitting={isSubmitting}
            format={format}
          />
        )}
      </div>
    </div>
  )
}