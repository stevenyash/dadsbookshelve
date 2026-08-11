import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, BookOpen, X } from 'lucide-react'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'

interface Book {
  book_id: number
  title: string
  author: string
  image_url: string
  price: number
}

interface FeaturedBook {
  id: number
  book_id: number
  position: number
  status: string
  book?: Book
  book_title?: string
  book_image?: string
  book_author?: string
}

function useFeaturedBooks() {
  return useQuery({
    queryKey: ['featured-books'],
    queryFn: async () => {
      const res = await api.get('admin/featured-books')
      return res.data.records as FeaturedBook[]
    },
  })
}

function useBooks() {
  return useQuery({
    queryKey: ['books-select'],
    queryFn: async () => {
      const res = await api.get('books?limit=100')
      return res.data.records as Book[]
    },
  })
}

function useAddFeaturedBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { book_id: number; status?: string; position?: number }) => {
      const res = await api.post('featuredbooks/add', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-books'] })
    },
  })
}

function useDeleteFeaturedBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`featuredbooks/delete/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-books'] })
    },
  })
}

function useUpdateFeaturedBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { id: number; status?: string; position?: number }) => {
      const res = await api.put(`featuredbooks/edit/${data.id}`, {
        status: data.status,
        position: data.position,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-books'] })
    },
  })
}

export function FeaturedBooksPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedBookId, setSelectedBookId] = useState<number | ''>('')
  const [status, setStatus] = useState('active')
  const [position, setPosition] = useState(1)

  const { data: featuredBooks, isLoading } = useFeaturedBooks()
  const { data: books } = useBooks()
  
  const addMutation = useAddFeaturedBook()
  const deleteMutation = useDeleteFeaturedBook()
  const updateMutation = useUpdateFeaturedBook()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBookId) return
    await addMutation.mutateAsync({
      book_id: Number(selectedBookId),
      status,
      position,
    })
    setShowAddModal(false)
    setSelectedBookId('')
    setStatus('active')
    setPosition(1)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Remove this book from featured?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await updateMutation.mutateAsync({ id, status: newStatus })
  }

  const handleUpdatePosition = async (id: number, newPos: number) => {
    await updateMutation.mutateAsync({ id, position: newPos })
  }

  // Get featured book IDs to exclude from selection
  const featuredBookIds = featuredBooks?.map((fb) => fb.book_id) || []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Book of the Day</h1>
          <p className="text-gray-500">Manage featured books on homepage</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 flex items-center gap-2"
        >
          <Plus size={18} /> Add Featured Book
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : featuredBooks?.length === 0 ? (
        <div className="text-gray-500">No featured books. Add one above.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredBooks?.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg overflow-hidden flex"
            >
              <div className="w-24 h-36 bg-gray-100 flex-shrink-0">
                <img
                  src={setImgUrl(item.book_image || item.book?.image_url, 'medium')}
                  alt={item.book_title || item.book?.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex-1 min-w-0">
                <h3 className="font-medium truncate">
                  {item.book_title || item.book?.title}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {item.book_author || item.book?.author}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(item.id, item.status)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {item.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Featured Book</h2>
              <button onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Book</label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value as any)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select a book</option>
                  {books
                    ?.filter((b) => !featuredBookIds.includes(b.book_id))
                    .map((book) => (
                      <option key={book.book_id} value={book.book_id}>
                        {book.title} - {book.author}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                disabled={addMutation.isPending || !selectedBookId}
                className="w-full py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {addMutation.isPending ? 'Saving...' : 'Add Featured Book'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}