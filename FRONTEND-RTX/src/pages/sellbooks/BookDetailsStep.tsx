import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Upload, FileText, AlertCircle, Check, BookOpen, User, Barcode, Image, Tag } from 'lucide-react'
import api from '@/lib/api'
import { BookDetails } from './types'

interface Genre {
  genre_id: number
  genre_name: string
}

interface BookDetailsStepProps {
  formData: BookDetails
  onNext: (data: BookDetails) => void
  format: 'softcopy' | 'hardcopy'
}

export function BookDetailsStep({ formData, onNext, format }: BookDetailsStepProps) {
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [localForm, setLocalForm] = useState<BookDetails>(formData)

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('genres')
      return res.data.records as Genre[]
    },
    staleTime: 60 * 60 * 1000,
  })

  useEffect(() => {
    setLocalForm(prev => ({ ...prev, ...formData }))
  }, [formData])

  const checkIsbnAvailability = async (isbn: string) => {
    if (!isbn.trim()) return true
    try {
      const res = await api.get(`books?isbn=${encodeURIComponent(isbn)}`)
      const existing = res.data.records
      if (existing && existing.length > 0) {
        return false
      }
      return true
    } catch {
      return true
    }
  }

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {}
    
    if (!localForm.book_title.trim()) {
      newErrors.book_title = 'Book title is required'
    }
    if (!localForm.author.trim()) {
      newErrors.author = 'Author name is required'
    }
    if (!localForm.isbn.trim()) {
      newErrors.isbn = 'ISBN is required'
    } else {
      // Check ISBN availability
      const isAvailable = await checkIsbnAvailability(localForm.isbn)
      if (!isAvailable) {
        newErrors.isbn = 'This ISBN is already registered. Please use a different ISBN.'
      }
    }
    if (!localForm.genre_id) {
      newErrors.genre_id = 'Please select a category'
    }
    if (!localForm.image_url && !localForm.image_url_preview) {
      newErrors.image_url = 'Cover image is required'
    }
    
    if (format === 'softcopy' && !localForm.softcopy_price?.trim()) {
      newErrors.softcopy_price = 'Price is required for eBook'
    }
    if (format === 'hardcopy' && !localForm.hardcopy_price?.trim()) {
      newErrors.hardcopy_price = 'Price is required for physical book'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isValid = await validate()
    if (isValid) {
      onNext(localForm)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLocalForm(prev => ({
          ...prev,
          image_url: file,
          image_url_preview: reader.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Basic Information */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-base-200">
            <BookOpen className="w-7 h-7 text-primary" />
            <h2 className="card-title text-2xl font-bold">Basic Information</h2>
          </div>

          <div className="space-y-6">
            {/* Book Title */}
            <div className="form-control">
              <label className="label mb-2">
                <span className="label-text font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Book Title *
                </span>
              </label>
              <input
                type="text"
                placeholder="Enter your book's title"
                className={`input input-bordered input-lg text-lg ${errors.book_title ? 'input-error' : ''}`}
                value={localForm.book_title}
                onChange={e => setLocalForm(prev => ({ ...prev, book_title: e.target.value }))}
              />
              {errors.book_title && (
                <label className="label mt-2">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.book_title}
                  </span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Author */}
              <div className="form-control">
                <label className="label mb-2">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Author Name *
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Enter author's name"
                  className={`input input-bordered input-lg ${errors.author ? 'input-error' : ''}`}
                  value={localForm.author}
                  onChange={e => setLocalForm(prev => ({ ...prev, author: e.target.value }))}
                />
                {errors.author && (
                  <label className="label mt-2">
                    <span className="label-text-alt text-error flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.author}
                    </span>
                  </label>
                )}
              </div>

              {/* ISBN */}
              <div className="form-control">
                <label className="label mb-2">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    ISBN *
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 978-3-16-148410-0"
                  className={`input input-bordered input-lg ${errors.isbn ? 'input-error' : ''}`}
                  value={localForm.isbn}
                  onChange={e => setLocalForm(prev => ({ ...prev, isbn: e.target.value }))}
                />
                {errors.isbn && (
                  <label className="label mt-2">
                    <span className="label-text-alt text-error flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.isbn}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Genre */}
            <div className="form-control">
              <label className="label mb-2">
                <span className="label-text font-semibold flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Category *
                </span>
              </label>
              <select
                className={`select select-bordered select-lg text-lg ${errors.genre_id ? 'select-error' : ''}`}
                value={localForm.genre_id}
                onChange={e => setLocalForm(prev => ({ ...prev, genre_id: e.target.value }))}
              >
                <option value="">Select a category</option>
                {genres?.map(g => (
                  <option key={g.genre_id} value={g.genre_id}>
                    {g.genre_name}
                  </option>
                ))}
              </select>
              {errors.genre_id && (
                <label className="label mt-2">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.genre_id}
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Cover Image & Pricing */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-base-200">
            <Image className="w-7 h-7 text-primary" />
            <h2 className="card-title text-2xl font-bold">Cover & Pricing</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Cover Image */}
            <div className="form-control">
              <label className="label mb-2">
                <span className="label-text font-semibold flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Cover Image *
                </span>
              </label>
              <input
                ref={coverInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleCoverChange}
              />
              <div
                className={`border-3 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-300 ${
                  errors.image_url 
                    ? 'border-error bg-error/5 hover:border-error/70' 
                    : 'border-base-300 hover:border-primary hover:bg-primary/5'
                }`}
                onClick={() => coverInputRef.current?.click()}
              >
                {localForm.image_url_preview ? (
                  <div className="flex items-center gap-6">
                    <img
                      src={localForm.image_url_preview}
                      alt="Cover preview"
                      className="w-32 h-44 object-cover rounded-xl shadow-xl"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-xl">{localForm.image_url?.name}</p>
                      <p className="text-base opacity-70">Click to change image</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Upload className="w-16 h-16 mx-auto mb-4 text-base-content/50" />
                    <p className="text-lg font-semibold text-base-content/70">
                      Click to upload cover image
                    </p>
                    <p className="text-sm text-base-content/50 mt-3">JPG, PNG (Max 5MB)</p>
                  </div>
                )}
              </div>
              {errors.image_url && (
                <label className="label mt-2">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.image_url}
                  </span>
                </label>
              )}
            </div>

            {/* Pricing */}
            <div className="form-control">
              <label className="label mb-2">
                <span className="label-text font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {format === 'softcopy' ? 'eBook Price (KES) *' : 'Physical Book Price (KES) *'}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/70 font-semibold text-lg">
                  KES
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  className={`input input-bordered input-lg pl-16 text-lg ${
                    (format === 'softcopy' ? errors.softcopy_price : errors.hardcopy_price) 
                      ? 'input-error' 
                      : ''
                  }`}
                  value={format === 'softcopy' ? localForm.softcopy_price : localForm.hardcopy_price}
                  onChange={e => setLocalForm(prev => ({ 
                    ...prev, 
                    [format === 'softcopy' ? 'softcopy_price' : 'hardcopy_price']: e.target.value 
                  }))}
                />
              </div>
              {(format === 'softcopy' ? errors.softcopy_price : errors.hardcopy_price) && (
                <label className="label mt-2">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {format === 'softcopy' ? errors.softcopy_price : errors.hardcopy_price}
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Overview */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-base-200">
            <FileText className="w-7 h-7 text-primary" />
            <h2 className="card-title text-2xl font-bold">Book Overview</h2>
          </div>

          <div className="form-control">
            <label className="label mb-2">
              <span className="label-text font-semibold text-lg">Overview (Optional)</span>
              <span className="label-text-alt opacity-70">Write a brief description of your book</span>
            </label>
            <textarea
              className="textarea textarea-bordered textarea-lg text-lg"
              placeholder="Tell readers about your book... What's it about? What makes it special? Who should read it?"
              rows={6}
              value={localForm.overview}
              onChange={e => setLocalForm(prev => ({ ...prev, overview: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary btn-lg text-lg">
          Next Step
          <Check className="w-6 h-6 ml-2" />
        </button>
      </div>
    </form>
  )
}
