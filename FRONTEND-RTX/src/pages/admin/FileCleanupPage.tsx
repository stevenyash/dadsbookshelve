import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { usePermissions } from '@/hooks/usePermissions'
import { AlertCircle, Trash2, FileWarning, CheckCircle, Loader2 } from 'lucide-react'

interface OrphanFile {
  path: string
  size?: number
}

interface CleanupResult {
  message: string
  scanned: number
  deleted: number
  errors: number
  deletedFiles: string[]
  errorFiles: string[]
}

async function fetchOrphanCount() {
  const res = await api.get('/file_cleanup/orphans/count')
  return res.data
}

async function fetchOrphanFiles(limit: number = 100) {
  const res = await api.get(`/file_cleanup/orphans?limit=${limit}`)
  return res.data
}

async function cleanupOrphans(dryRun: boolean = false) {
  const query = dryRun ? '?dryrun=true' : ''
  const res = await api.delete(`/file_cleanup/orphans${query}`)
  return res.data
}

export function FileCleanupPage() {
  const { canDelete } = usePermissions()
  const queryClient = useQueryClient()
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: countData, isLoading: countLoading } = useQuery({
    queryKey: ['orphan-count'],
    queryFn: fetchOrphanCount,
  })

  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['orphan-files'],
    queryFn: () => fetchOrphanFiles(200),
  })

  const cleanupMutation = useMutation({
    mutationFn: cleanupOrphans,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orphan-count'] })
      queryClient.invalidateQueries({ queryKey: ['orphan-files'] })
      setSelectedFiles([])
      setIsDeleting(false)
    },
    onError: () => {
      setIsDeleting(false)
    }
  })

  const orphanCount = countData?.data?.count || 0
  const orphanFiles: OrphanFile[] = filesData?.data?.files || []

  const toggleFile = (path: string) => {
    setSelectedFiles(prev => 
      prev.includes(path) 
        ? prev.filter(f => f !== path)
        : [...prev, path]
    )
  }

  const toggleAll = () => {
    if (selectedFiles.length === orphanFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(orphanFiles.map(f => f.path))
    }
  }

  const handleDryRun = () => {
    setIsDeleting(true)
    cleanupMutation.mutate(true)
  }

  const handleCleanup = () => {
    if (!confirm(`Are you sure you want to delete ${selectedFiles.length || orphanCount} file(s)?`)) {
      return
    }
    setIsDeleting(true)
    cleanupMutation.mutate(false)
  }

  const cleanupResult: CleanupResult | null = cleanupMutation.data?.data

  if (!canDelete('file_cleanup')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to access file cleanup.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">File Cleanup</h1>
          <p className="text-gray-500">Remove orphaned files not linked to database records</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetchFiles()
            queryClient.invalidateQueries({ queryKey: ['orphan-count'] })
          }}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${orphanCount > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
              <FileWarning className={`w-6 h-6 ${orphanCount > 0 ? 'text-orange-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Orphaned Files</p>
              <p className="text-3xl font-bold">{countLoading ? '...' : orphanCount}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDryRun}
              disabled={orphanCount === 0 || isDeleting}
            >
              Preview (Dry Run)
            </Button>
            <Button
              variant="danger"
              onClick={handleCleanup}
              disabled={orphanCount === 0 || isDeleting || selectedFiles.length === 0}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedFiles.length > 0 ? `(${selectedFiles.length})` : 'All'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Cleanup Result */}
      {cleanupResult && (
        <Card className={`p-6 ${cleanupResult.errors > 0 ? 'border-orange-500' : 'border-green-500'}`}>
          <div className="flex items-start gap-4">
            {cleanupResult.errors > 0 ? (
              <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{cleanupResult.message}</h3>
              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Scanned:</span>
                  <span className="ml-2 font-medium">{cleanupResult.scanned}</span>
                </div>
                <div>
                  <span className="text-gray-500">Deleted:</span>
                  <span className="ml-2 font-medium text-green-600">{cleanupResult.deleted}</span>
                </div>
                <div>
                  <span className="text-gray-500">Errors:</span>
                  <span className="ml-2 font-medium text-orange-600">{cleanupResult.errors}</span>
                </div>
              </div>
              {cleanupResult.deletedFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Deleted files:</p>
                  <div className="max-h-32 overflow-y-auto text-xs text-gray-600 space-y-1">
                    {cleanupResult.deletedFiles.slice(0, 20).map((f: string, i: number) => (
                      <p key={i} className="truncate">{f}</p>
                    ))}
                    {cleanupResult.deletedFiles.length > 20 && (
                      <p className="text-gray-400">...and {cleanupResult.deletedFiles.length - 20} more</p>
                    )}
                  </div>
                </div>
              )}
              {cleanupResult.errorFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-orange-600 mb-2">Failed to delete:</p>
                  <div className="max-h-32 overflow-y-auto text-xs text-gray-600 space-y-1">
                    {cleanupResult.errorFiles.map((f: string, i: number) => (
                      <p key={i} className="truncate">{f}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* File List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Orphaned Files List</h2>
          {orphanFiles.length > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFiles.length === orphanFiles.length}
                onChange={toggleAll}
                className="rounded"
              />
              Select All ({orphanFiles.length})
            </label>
          )}
        </div>
        
        {filesLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
            Scanning files...
          </div>
        ) : orphanFiles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
            <p>No orphaned files found. Your file system is clean!</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orphanFiles.map((file, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.path)}
                        onChange={() => toggleFile(file.path)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-600 truncate max-w-md">
                      {file.path}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}