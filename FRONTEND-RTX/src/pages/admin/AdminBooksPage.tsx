import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Eye, ShoppingCart, BookOpen, Store, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'

interface Book {
  book_id: number
  title: string
  author: string
  price: number
  price_digital?: number
  price_physical?: number
  image_url: string
  genre_id: number
  genre?: { genre_name: string }
  stock: number
  stock_digital?: number
  stock_physical?: number
  available: number
  is_available: boolean
  in_shop: boolean
  in_library: boolean
}

interface BooksResponse {
  records: Book[]
  page: number
  limit: number
  total: number
  totalPages: number
}

function useBooks(search = '', genreId?: number, page = 1) {
  return useQuery({
    queryKey: ['admin-books', search, genreId, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (genreId) params.append('genre_id', genreId.toString())
      params.append('limit', '20')
      params.append('page', page.toString())
      const res = await api.get(`books?${params.toString()}`)
      return res.data as BooksResponse
    },
    staleTime: 60 * 1000,
  })
}

function useToggleAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, inShop, inLibrary }: { bookId: number; inShop?: boolean; inLibrary?: boolean }) => {
      const res = await api.patch(`books/toggle-availability/${bookId}`, {
        in_shop: inShop,
        in_library: inLibrary,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
    },
  })
}

function useDeleteBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookId: number) => {
      await api.delete(`books/delete/${bookId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
    },
  })
}

function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('genres')
      return res.data.records as { genre_id: number; genre_name: string }[]
    },
    staleTime: 60 * 60 * 1000,
  })
}

export function AdminBooksPage() {
  const { canView, canAdd, canEdit, canDelete } = usePermissions()
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  
  const { data: booksResponse, isLoading } = useBooks(search, selectedGenre, page)
  const { data: genres } = useGenres()
  const toggleMutation = useToggleAvailability()
  const deleteMutation = useDeleteBook()
  
  const books = booksResponse?.records || []
  const totalPages = booksResponse?.totalPages || 0

  const handleToggle = (book: Book, field: 'in_shop' | 'in_library') => {
    toggleMutation.mutate({
      bookId: book.book_id,
      inShop: field === 'in_shop' ? !book.in_shop : undefined,
      inLibrary: field === 'in_library' ? !book.in_library : undefined,
    })
  }

  const handleDelete = (book: Book) => {
    if (confirm(`Delete "${book.title}"? This cannot be undone.`)) {
      deleteMutation.mutate(book.book_id)
    }
  }

  if (!canView('books')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to manage books.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Books Management</h1>
        {canAdd('books') && (
          <Link to="/books/add" className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Book
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search books..."
            className="input input-bordered w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="select select-bordered"
          value={selectedGenre || ''}
          onChange={(e) => setSelectedGenre(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All Genres</option>
          {genres?.map(g => (
            <option key={g.genre_id} value={g.genre_id}>{g.genre_name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Author</th>
                <th>Genre</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Shop</th>
                <th>Library</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books?.map(book => (
                <tr key={book.book_id}>
                  <td>
                    <div className="avatar">
                      <div className="w-12 h-12 rounded">
                        <img src={book.image_url ? setImgUrl(book.image_url, 'small') : '/no-image.png'} alt={book.title} />
                      </div>
                    </div>
                  </td>
                  <td className="font-medium">{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.genre?.genre_name || '-'}</td>
                  <td className="whitespace-nowrap">
                    <div>Digital: Ksh {book.price_digital || 'N/A'}</div>
                    <div className="text-xs text-gray-500">Physical: Ksh {book.price_physical || 'N/A'}</div>
                  </td>
                  <td>
                    <div className="text-xs">Digital: {book.stock_digital ?? 999}</div>
                    <div className="text-xs">Physical: {book.stock_physical ?? 0}</div>
                  </td>
                  <td>
                    <label className="cursor-pointer flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="toggle toggle-success toggle-sm"
                        checked={book.in_shop}
                        disabled={toggleMutation.isPending}
                        onChange={() => handleToggle(book, 'in_shop')}
                      />
                      <Store className="w-4 h-4 text-gray-500" />
                    </label>
                  </td>
                  <td>
                    <label className="cursor-pointer flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="toggle toggle-success toggle-sm"
                        checked={book.in_library}
                        disabled={toggleMutation.isPending}
                        onChange={() => handleToggle(book, 'in_library')}
                      />
                      <BookOpen className="w-4 h-4 text-gray-500" />
                    </label>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link to={`/books/view/${book.book_id}`} className="btn btn-ghost btn-sm">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {canEdit('books') && (
                        <Link to={`/books/edit/${book.book_id}`} className="btn btn-ghost btn-sm">
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                      {canDelete('books') && (
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => handleDelete(book)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
</table>
        </div>
      )}

      {/* Pagination */}
      {totalPages >= 1 && !isLoading && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {(!books || books.length === 0) && !isLoading && (
        <div className="text-center py-12 opacity-60">
          No books found
        </div>
      )}
    </div>
  )
}