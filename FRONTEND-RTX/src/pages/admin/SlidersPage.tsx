import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, GripVertical, Image, X } from 'lucide-react'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'

interface Slider {
  id: number
  image_url: string
  title: string
  description: string
  button_label: string
  button_action: string
}

interface CurrentSlider {
  id: number
  slider_id: number
  position: number
  slider?: Slider
}

function useSliders() {
  return useQuery({
    queryKey: ['sliders'],
    queryFn: async () => {
      const res = await api.get('sliders/index?limit=50')
      return res.data.records as Slider[]
    },
  })
}

function useCurrentSliders() {
  return useQuery({
    queryKey: ['current-sliders'],
    queryFn: async () => {
      const res = await api.get('currentsliders/index')
      return res.data.records as CurrentSlider[]
    },
  })
}

function useDeleteSlider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`sliders/delete/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] })
    },
  })
}

function useDeleteCurrentSlider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`currentsliders/delete/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-sliders'] })
    },
  })
}

function useAddSlider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Slider>) => {
      const res = await api.post('sliders', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] })
    },
  })
}

function useAddToCurrent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { slider_id: number; position: number }) => {
      const res = await api.post('currentsliders/add', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-sliders'] })
    },
  })
}

function useUpdateCurrentPosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, position }: { id: number; position: number }) => {
      const res = await api.put(`currentsliders/edit/${id}`, { position })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-sliders'] })
    },
  })
}

export function SlidersPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddCurrentModal, setShowAddCurrentModal] = useState(false)
  const [formData, setFormData] = useState({
    image_url: '',
    title: '',
    description: '',
    button_label: '',
    button_action: '',
  })
  const [selectedSliderId, setSelectedSliderId] = useState<number | ''>('')
  const [position, setPosition] = useState(1)

  const { data: sliders, isLoading: loadingSliders } = useSliders()
  const { data: currentSliders, isLoading: loadingCurrent } = useCurrentSliders()
  
  const deleteMutation = useDeleteSlider()
  const deleteCurrentMutation = useDeleteCurrentSlider()
  const addMutation = useAddSlider()
  const addCurrentMutation = useAddToCurrent()
  const updatePositionMutation = useUpdateCurrentPosition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addMutation.mutateAsync(formData)
    setShowAddModal(false)
    setFormData({ image_url: '', title: '', description: '', button_label: '', button_action: '' })
  }

  const handleAddCurrent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSliderId) return
    await addCurrentMutation.mutateAsync({ slider_id: Number(selectedSliderId), position })
    setShowAddCurrentModal(false)
    setSelectedSliderId('')
    setPosition(1)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Delete this slider?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleRemoveFromHomepage = async (id: number) => {
    if (confirm('Remove from homepage?')) {
      await deleteCurrentMutation.mutateAsync(id)
    }
  }

  const handleUpdatePosition = async (id: number, newPos: number) => {
    await updatePositionMutation.mutateAsync({ id, position: newPos })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Homepage Sliders</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCurrentModal(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
          >
            <Plus size={18} /> Add to Homepage
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <Plus size={18} /> New Slider
          </button>
        </div>
      </div>

      {/* Current Homepage Sliders */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Homepage Rotation</h2>
        {loadingCurrent ? (
          <div className="text-gray-500">Loading...</div>
        ) : currentSliders?.length === 0 ? (
          <div className="text-gray-500">No sliders on homepage. Add some above.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentSliders?.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 flex gap-4">
                <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={setImgUrl(item.slider?.image_url, 'small')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.slider?.title}</p>
                  <p className="text-sm text-gray-500">Position: {item.position}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleRemoveFromHomepage(item.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Sliders */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Sliders</h2>
        {loadingSliders ? (
          <div className="text-gray-500">Loading...</div>
        ) : sliders?.length === 0 ? (
          <div className="text-gray-500">No sliders. Create one above.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sliders?.map((slider) => (
              <div key={slider.id} className="border rounded-lg overflow-hidden">
                <div className="h-32 bg-gray-100">
                  <img
                    src={setImgUrl(slider.image_url, 'medium')}
                    alt={slider.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium truncate">{slider.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{slider.description}</p>
                  <button
                    onClick={() => handleDelete(slider.id)}
                    className="mt-2 text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Slider Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">New Slider</h2>
              <button onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="uploads/files/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Button Label</label>
                <input
                  type="text"
                  value={formData.button_label}
                  onChange={(e) => setFormData({ ...formData, button_label: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Explore"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Button Action</label>
                <input
                  type="text"
                  value={formData.button_action}
                  onChange={(e) => setFormData({ ...formData, button_action: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="/dbslibrary"
                />
              </div>
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="w-full py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {addMutation.isPending ? 'Saving...' : 'Save Slider'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add to Homepage Modal */}
      {showAddCurrentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add to Homepage</h2>
              <button onClick={() => setShowAddCurrentModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddCurrent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Slider</label>
                <select
                  value={selectedSliderId}
                  onChange={(e) => setSelectedSliderId(e.target.value as any)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select a slider</option>
                  {sliders?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Position</label>
                <input
                  type="number"
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                  min={1}
                />
              </div>
              <button
                type="submit"
                disabled={addCurrentMutation.isPending || !selectedSliderId}
                className="w-full py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {addCurrentMutation.isPending ? 'Saving...' : 'Add to Homepage'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}