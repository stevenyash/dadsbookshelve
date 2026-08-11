import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, X, Calendar } from 'lucide-react'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'

interface Story {
  id: number
  topic: string
  title: string
  content: string
  image_url: string
  date_to_show: string | null
  status: string
  date_created: string
}

function useStories() {
  return useQuery({
    queryKey: ['admin-stories'],
    queryFn: async () => {
      const res = await api.get('stories/index')
      return res.data.records as Story[]
    },
  })
}

function useAddStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Story>) => {
      const res = await api.post('stories/add', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
    },
  })
}

function useUpdateStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Story> & { id: number }) => {
      const res = await api.put(`stories/edit/${data.id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
    },
  })
}

function useDeleteStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`stories/delete/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
    },
  })
}

export function StoriesPage() {
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    topic: '',
    title: '',
    content: '',
    image_url: '',
    date_to_show: '',
    status: '1',
  })

  const { data: stories, isLoading } = useStories()
  const addMutation = useAddStory()
  const updateMutation = useUpdateStory()
  const deleteMutation = useDeleteStory()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      date_to_show: formData.date_to_show || null,
      status: Number(formData.status),
    }
    if (editId) {
      await updateMutation.mutateAsync({ id: editId, ...payload })
    } else {
      await addMutation.mutateAsync(payload)
    }
    setShowModal(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      topic: '',
      title: '',
      content: '',
      image_url: '',
      date_to_show: '',
      status: '1',
    })
    setEditId(null)
  }

  const handleEdit = (story: Story) => {
    setFormData({
      topic: story.topic,
      title: story.title,
      content: story.content,
      image_url: story.image_url || '',
      date_to_show: story.date_to_show || '',
      status: String(story.status),
    })
    setEditId(story.id)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Delete this story?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stories</h1>
          <p className="text-gray-500">Manage stories and Story of the Day</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 flex items-center gap-2"
        >
          <Plus size={18} /> New Story
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : stories?.length === 0 ? (
        <div className="text-gray-500">No stories. Create one above.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories?.map((story) => (
            <div key={story.id} className="border rounded-lg overflow-hidden">
              {story.image_url && (
                <div className="h-32 bg-gray-100">
                  <img
                    src={setImgUrl(story.image_url, 'medium')}
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-gray-500">{story.topic}</p>
                <h3 className="font-medium truncate">{story.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">{story.content?.substring(0, 100)}...</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  {story.date_to_show && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {story.date_to_show}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded ${story.status === '1' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                    {story.status === '1' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(story)}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editId ? 'Edit Story' : 'New Story'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Topic</label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="News, Event, Feature..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={5}
                  required
                />
              </div>
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
                <label className="block text-sm font-medium mb-1">Date to Show (Story of the Day)</label>
                <input
                  type="date"
                  value={formData.date_to_show}
                  onChange={(e) => setFormData({ ...formData, date_to_show: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to not show as Story of the Day</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="1">Published</option>
                  <option value="0">Draft</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
                className="w-full py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {addMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Story'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}