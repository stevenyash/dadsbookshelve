import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, AlertCircle, Check, ArrowLeft } from 'lucide-react'
import { FileDetails } from './types'

interface FileUploadStepProps {
  formData: FileDetails
  onNext: (data: FileDetails) => void
  onBack: () => void
  bookTitle: string
}

export function FileUploadStep({ formData, onNext, onBack, bookTitle }: FileUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [localForm, setLocalForm] = useState<FileDetails>(formData)

  useEffect(() => {
    setLocalForm(prev => ({ ...prev, ...formData }))
  }, [formData])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!localForm.soft_copy) {
      newErrors.soft_copy = 'Please upload your book file'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext(localForm)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['.epub']
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      
      if (!validTypes.includes(ext)) {
        setErrors({ soft_copy: 'Invalid file type. Only EPUB files are allowed for book sales.' })
        return
      }
      
      if (file.size > 100 * 1024 * 1024) {
        setErrors({ soft_copy: 'File too large. Maximum size is 100MB' })
        return
      }

      setLocalForm(prev => ({
        ...prev,
        soft_copy: file,
        soft_copy_name: file.name
      }))
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-xl mb-2">
            Step 2: Upload Your Book File
          </h2>
          <p className="text-sm opacity-70 mb-4">
            Upload the final version of your book in EPUB format.
          </p>

          {/* Book Title Display */}
          <div className="bg-base-200 rounded-lg p-3 mb-4">
            <span className="text-sm opacity-70">Uploading for:</span>
            <p className="font-medium">{bookTitle}</p>
          </div>

          {/* File Upload */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Book File *</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".epub"
              onChange={handleFileChange}
            />
            <div
              className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
                errors.soft_copy ? 'border-error bg-error/5' : 'border-base-300 hover:border-primary'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {localForm.soft_copy ? (
                <div className="flex items-center justify-center gap-4">
                  <FileText className="w-12 h-12 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{localForm.soft_copy.name}</p>
                    <p className="text-sm opacity-60">
                      {formatFileSize(localForm.soft_copy.size)}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 mx-auto mb-2 text-base-content/50" />
                  <p className="text-sm text-base-content/70 text-center">
                    Click to upload book file
                  </p>
                  <p className="text-xs text-base-content/50 text-center mt-1">
                    EPUB format only (Max 100MB)
                  </p>
                </div>
              )}
            </div>
            {errors.soft_copy && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.soft_copy}</span>
              </label>
            )}
          </div>

          {/* File Requirements */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">File Requirements:</h4>
            <ul className="text-sm space-y-1 opacity-70">
              <li>- EPUB format only</li>
              <li>- Ensure all images are embedded</li>
              <li>- Book should be properly formatted</li>
              <li>- No password protection</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-6">
            <button 
              type="button" 
              className="btn btn-ghost"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <button type="submit" className="btn btn-primary">
              Next Step
              <Check className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}