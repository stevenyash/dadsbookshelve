import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/store'
import { ebookUploadApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { FileText, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface EbookConversion {
  id: number
  book_title: string
  author: string
  isbn: string
  book: string
  cover_image: string
  user_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  payment_status: string
  payment_id: string
  final_copy: string
  date_uploaded: string
}

export function EbookConversionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  const [conversion, setConversion] = useState<EbookConversion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [finalCopy, setFinalCopy] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConversion()
  }, [id])

  const loadConversion = async () => {
    if (!id) return

    try {
      const response = await ebookUploadApi.view(parseInt(id))
      setConversion(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load conversion')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!conversion || !finalCopy) return

    setSaving(true)
    try {
      // Upload the final converted file
      const uploadResponse = await ebookUploadApi.uploadFile('final_copy', finalCopy)
      const finalCopyPath = uploadResponse.data?.data

      // Update the conversion record
      await ebookUploadApi.update(conversion.id, {
        status: 'completed',
        final_copy: finalCopyPath,
      })

// Reload the conversion
      await loadConversion()

      // Invalidate dashboard queries
      queryClient.invalidateQueries({ queryKey: ['my-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })

      // Show success message
      alert('Conversion completed successfully!')
    } catch (err: any) {
      alert('Failed to complete conversion: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!conversion) return

    if (!confirm('Are you sure you want to reject this conversion?')) return

    setSaving(true)
    try {
      await ebookUploadApi.update(conversion.id, {
        status: 'failed',
      })

      await loadConversion()

      // Invalidate dashboard queries
      queryClient.invalidateQueries({ queryKey: ['my-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })

    } catch (err: any) {
      alert('Failed to reject conversion: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !conversion) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center">
            <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
            <h2 className="text-xl font-bold">Error</h2>
            <p className="text-base-content/70 mb-4">{error || 'Conversion not found'}</p>
            <Button onClick={() => navigate('/dashboard')} className="btn btn-primary">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost btn-sm"
          >
            ← Back to Dashboard
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              eBook Conversion - {conversion.book_title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Book Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <p className="text-base-content/80">{conversion.book_title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Author</label>
                    <p className="text-base-content/80">{conversion.author}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">ISBN</label>
                    <p className="text-base-content/80">{conversion.isbn || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <span className={`badge ${
                      conversion.status === 'completed' ? 'badge-success' :
                      conversion.status === 'failed' ? 'badge-error' :
                      'badge-warning'
                    }`}>
                      {conversion.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Payment</label>
                    <span className={`badge ${
                      conversion.payment_status === 'paid' ? 'badge-success' : 'badge-error'
                    }`}>
                      {conversion.payment_status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Submitted</label>
                    <p className="text-base-content/80">
                      {new Date(conversion.date_uploaded).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Files</h3>
                <div className="space-y-3">
                  {conversion.book && (
                    <div className="p-3 bg-base-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">Original Book</span>
                      </div>
                      <a
                        href={`${import.meta.env.VITE_API_URL || ''}/uploads/${conversion.book}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        Download
                      </a>
                    </div>
                  )}

                  {conversion.cover_image && (
                    <div className="p-3 bg-base-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">Cover Image</span>
                      </div>
                      <a
                        href={`${import.meta.env.VITE_API_URL || ''}/uploads/${conversion.cover_image}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        View
                      </a>
                    </div>
                  )}

                  {conversion.final_copy && (
                    <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium">Converted eBook</span>
                      </div>
                      <a
                        href={`${import.meta.env.VITE_API_URL || ''}/uploads/${conversion.final_copy}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {conversion.status === 'pending' && (
              <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <h4 className="font-medium mb-3">Process Conversion</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Upload Converted eBook File
                    </label>
                    <Input
                      type="file"
                      accept=".epub,.pdf"
                      onChange={(e) => setFinalCopy(e.target.files?.[0] || null)}
                      className="file-input"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleComplete}
                      disabled={!finalCopy || saving}
                      className="btn btn-success"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Complete Conversion
                    </Button>

                    <Button
                      onClick={handleReject}
                      disabled={saving}
                      className="btn btn-error"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {conversion.status === 'completed' && (
              <div className="mt-6 p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="font-medium">Conversion completed</span>
                </div>
                <p className="text-sm text-base-content/70 mt-1">
                  The converted eBook has been sent to the user.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}