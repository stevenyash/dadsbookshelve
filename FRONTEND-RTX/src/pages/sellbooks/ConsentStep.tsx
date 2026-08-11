import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ArrowLeft, Loader2, AlertCircle, FileText, Percent, PenTool, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { ConsentData, BookDetails, FileDetails } from './types'

interface ConsentStepProps {
  formData: ConsentData
  onNext: (data: ConsentData) => void
  onBack: () => void
  bookDetails: BookDetails
  fileDetails?: FileDetails
  submitData: (consent: ConsentData, bookDetails: BookDetails, fileDetails?: FileDetails) => Promise<void>
  isSubmitting: boolean
  format: 'softcopy' | 'hardcopy'
}

export function ConsentStep({ 
  formData, 
  onNext, 
  onBack, 
  bookDetails, 
  fileDetails,
  submitData,
  isSubmitting,
  format 
}: ConsentStepProps) {
  const [localForm, setLocalForm] = useState<ConsentData>(formData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showAgreement, setShowAgreement] = useState(false)
  const [showDeclaration, setShowDeclaration] = useState(false)
  const signatureRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setLocalForm(prev => ({ ...prev, ...formData }))
  }, [formData])

  useEffect(() => {
    if (!showAgreement) {
      api.get('components_data/publisher-agreement')
        .then(res => {
          if (res.data) {
            setLocalForm(prev => ({ ...prev, agreement: res.data }))
          }
        })
        .catch(console.error)
    }
  }, [showAgreement])

  useEffect(() => {
    if (!showDeclaration) {
      api.get('components_data/publisher-declaration')
        .then(res => {
          if (res.data) {
            setLocalForm(prev => ({ ...prev, declaration: res.data }))
          }
        })
        .catch(console.error)
    }
  }, [showDeclaration])

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = signatureRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const point = getCanvasPoint(e)
    if (!point) return

    const canvas = signatureRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    lastPointRef.current = point
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return

    const point = getCanvasPoint(e)
    if (!point || !lastPointRef.current) return

    const canvas = signatureRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1a1a1a'
    
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    
    lastPointRef.current = point
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    lastPointRef.current = null
    if (signatureRef.current && hasDrawn) {
      const signature = signatureRef.current.toDataURL('image/png')
      setLocalForm(prev => ({ ...prev, e_signature: signature }))
    }
  }

  const clearSignature = () => {
    const canvas = signatureRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    setLocalForm(prev => ({ ...prev, e_signature: '' }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!localForm.agreement_confirmation) {
      newErrors.agreement_confirmation = 'You must agree to the terms'
    }
    if (!localForm.ownership_declaration) {
      newErrors.ownership_declaration = 'You must declare ownership'
    }
    if (!localForm.user_details_confirmation) {
      newErrors.user_details_confirmation = 'You must confirm your details'
    }
    if (!localForm.e_signature || !hasDrawn) {
      newErrors.e_signature = 'Signature is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      await submitData(localForm, bookDetails, fileDetails || undefined)
      onNext(localForm)
    }
  }

  const price = format === 'softcopy' 
    ? Number(bookDetails.softcopy_price || 0)
    : Number(bookDetails.hardcopy_price || 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Revenue Sharing Info */}
      <div className="card bg-gradient-to-r from-primary/10 to-primary/5 shadow">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Percent className="w-6 h-6 text-primary-content" />
            </div>
            <div>
              <p className="font-bold text-lg">Revenue Sharing</p>
              <p className="text-sm opacity-80">
                You keep <span className="font-bold text-primary text-xl">{localForm.revenue_sharing_percentage}%</span> of all sales
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-xl mb-6">
            Agreement &amp; Signature
          </h2>

          {/* Book Summary */}
          <div className="bg-base-200 rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Book Details:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p><span className="opacity-60 font-medium">Title:</span> <span className="font-medium">{bookDetails.book_title}</span></p>
              <p><span className="opacity-60 font-medium">Author:</span> <span className="font-medium">{bookDetails.author}</span></p>
              <p><span className="opacity-60 font-medium">ISBN:</span> <span className="font-medium">{bookDetails.isbn}</span></p>
              <p><span className="opacity-60 font-medium">Price:</span> <span className="font-bold text-primary">KES {price.toLocaleString()}</span></p>
            </div>
            {format === 'softcopy' && <p className="text-xs opacity-50 mt-2">File: {fileDetails?.soft_copy_name}</p>}
          </div>

          {/* Agreement */}
          <div className="form-control mb-4">
            <div className="flex items-start gap-3 p-4 bg-base-200/50 rounded-lg">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mt-0.5"
                checked={localForm.agreement_confirmation}
                onChange={e => setLocalForm(prev => ({ 
                  ...prev, 
                  agreement_confirmation: e.target.checked 
                }))}
              />
              <label className="label cursor-pointer">
                <span className="label-text">
                  I have read and agree to the{' '}
                  <button 
                    type="button"
                    className="link link-primary font-semibold"
                    onClick={() => setShowAgreement(true)}
                  >
                    Publishing Agreement
                  </button>
                </span>
              </label>
            </div>
            {errors.agreement_confirmation && (
              <label className="label">
                <span className="label-text-alt text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.agreement_confirmation}
                </span>
              </label>
            )}
          </div>

          {/* Ownership Declaration */}
          <div className="form-control mb-4">
            <div className="flex items-start gap-3 p-4 bg-base-200/50 rounded-lg">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mt-0.5"
                checked={localForm.ownership_declaration}
                onChange={e => setLocalForm(prev => ({ 
                  ...prev, 
                  ownership_declaration: e.target.checked 
                }))}
              />
              <label className="label cursor-pointer">
                <span className="label-text">
                  I declare that I own the rights to this work and it does not infringe on any copyright
                </span>
              </label>
            </div>
            {errors.ownership_declaration && (
              <label className="label">
                <span className="label-text-alt text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.ownership_declaration}
                </span>
              </label>
            )}
          </div>

          {/* User Details Confirmation */}
          <div className="form-control mb-6">
            <div className="flex items-start gap-3 p-4 bg-base-200/50 rounded-lg">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mt-0.5"
                checked={localForm.user_details_confirmation}
                onChange={e => setLocalForm(prev => ({ 
                  ...prev, 
                  user_details_confirmation: e.target.checked 
                }))}
              />
              <label className="label cursor-pointer">
                <span className="label-text">
                  I confirm that the author details provided are accurate
                </span>
              </label>
            </div>
            {errors.user_details_confirmation && (
              <label className="label">
                <span className="label-text-alt text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.user_details_confirmation}
                </span>
              </label>
            )}
          </div>

          {/* Signature */}
          <div className="form-control">
            <label className="label mb-2">
              <span className="label-text font-bold text-lg flex items-center gap-2">
                <PenTool className="w-5 h-5" />
                Electronic Signature *
              </span>
              <span className="label-text-alt opacity-70">Draw your signature in the box below</span>
            </label>
            
            <div className={`border-2 rounded-xl bg-gradient-to-b from-base-100 to-base-200/50 overflow-hidden transition-all ${
              errors.e_signature ? 'border-error shadow-error/20' : 'border-base-300 hover:border-primary'
            }`}>
              <canvas
                ref={signatureRef}
                width={800}
                height={250}
                className="w-full cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            
            <div className="flex justify-between items-center mt-2">
              {errors.e_signature && (
                <label className="label">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.e_signature}
                  </span>
                </label>
              )}
              <button 
                type="button"
                className="btn btn-ghost btn-sm gap-2 ml-auto"
                onClick={clearSignature}
              >
                <Trash2 className="w-4 h-4" />
                Clear Signature
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-8 pt-4 border-t border-base-200">
            <button 
              type="button" 
              className="btn btn-ghost btn-lg"
              onClick={onBack}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <button 
              type="submit" 
              className="btn btn-primary btn-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit for Review
                  <Check className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Agreement Modal */}
      {showAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-base-200 flex justify-between items-center">
              <h3 className="font-bold text-2xl">Publishing Agreement</h3>
              <button 
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setShowAgreement(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-line flex-1">
              {localForm.agreement || 'Loading agreement...'}
            </div>
          </div>
        </div>
      )}

      {/* Declaration Modal */}
      {showDeclaration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-base-200 flex justify-between items-center">
              <h3 className="font-bold text-2xl">Ownership Declaration</h3>
              <button 
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setShowDeclaration(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-line flex-1">
              {localForm.declaration || 'Loading declaration...'}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
