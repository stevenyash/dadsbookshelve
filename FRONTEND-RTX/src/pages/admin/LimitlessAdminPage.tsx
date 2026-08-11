import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Loader2, Save, X, Eye, Edit, Trash2, Plus } from 'lucide-react'

interface LimitlessContent {
  id: number
  content: string
  current: boolean
  created_at: string
}

function useLimitlessList() {
  return useQuery({
    queryKey: ['limitless', 'list'],
    queryFn: async () => {
      const res = await api.get('limitless/index')
      return res.data.records as LimitlessContent[]
    },
  })
}

function useLimitlessCurrent() {
  return useQuery({
    queryKey: ['limitless', 'current'],
    queryFn: async () => {
      const res = await api.get('limitless/current')
      return res.data as LimitlessContent | null
    },
  })
}

export default function LimitlessAdminPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({ content: '', current: false })

  const { data: limitlessList, isLoading: listLoading } = useLimitlessList()
  const { data: currentContent, isLoading: currentLoading } = useLimitlessCurrent()

  const createMutation = useMutation({
    mutationFn: (data: { content: string; current: boolean }) =>
      api.post('limitless/add', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limitless'] })
      setIsAdding(false)
      setFormData({ content: '', current: false })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { content: string; current: boolean } }) =>
      api.post(`limitless/edit/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limitless'] })
      setEditingId(null)
      setFormData({ content: '', current: false })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.get(`limitless/delete/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limitless'] })
    },
  })

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const startEdit = (item: LimitlessContent) => {
    setEditingId(item.id)
    setFormData({ content: item.content, current: item.current })
    setIsAdding(false)
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setFormData({ content: '', current: false })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ content: '', current: false })
  }

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this content?')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading = listLoading || currentLoading
  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Limitless Initiative Content</h1>
          <button onClick={startAdd} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Content
          </button>
        </div>

        {/* Current Content Preview */}
        {currentContent && (
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Current Active Content
              </h2>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: currentContent.content }}
              />
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="font-bold text-lg mb-4">
                {editingId ? 'Edit Content' : 'Add New Content'}
              </h2>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Content (HTML)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered font-mono text-sm"
                  rows={10}
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="<p>Your HTML content here...</p>"
                />
              </div>
              <div className="form-control mb-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Set as Current</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.current}
                    onChange={(e) =>
                      setFormData({ ...formData, current: e.target.checked })
                    }
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.content}
                  className="btn btn-primary"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editingId ? 'Update' : 'Save'}
                </button>
                <button onClick={cancelEdit} className="btn btn-ghost">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="font-bold text-lg mb-4">All Content</h2>
            {limitlessList?.length === 0 ? (
              <p className="text-base-content/70">No content found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Preview</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {limitlessList?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>
                          {item.current ? (
                            <span className="badge badge-primary">Current</span>
                          ) : (
                            <span className="badge badge-ghost">Inactive</span>
                          )}
                        </td>
                        <td className="max-w-xs">
                          <div
                            className="truncate text-sm"
                            dangerouslySetInnerHTML={{
                              __html: item.content.substring(0, 100) + '...',
                            }}
                          />
                        </td>
                        <td>
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="btn btn-ghost btn-sm"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="btn btn-ghost btn-sm text-error"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}