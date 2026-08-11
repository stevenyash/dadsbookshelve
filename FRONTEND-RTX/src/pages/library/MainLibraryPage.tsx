import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, BookOpen, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
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
  overview: string
  genre?: { genre_name: string }
}

interface BooksResponse {
  records: Book[]
  page: number
  limit: number
  total: number
  totalPages: number
}

function useLibraryBooks(search = '', genreId?: number, page = 1) {
  return useQuery({
    queryKey: ['library-books', search, genreId, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (genreId) params.append('genre_id', genreId.toString())
      params.append('limit', '12')
      params.append('page', page.toString())
      const res = await api.get(`books/library?${params.toString()}`)
      return res.data as BooksResponse
    },
    staleTime: 60 * 1000,
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

function BookCard({ book }: { book: Book }) {
  const imageUrl = book.image_url ? setImgUrl(book.image_url, 'medium') : '/no-image.png'
  
  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-all">
      <figure className="h-48 overflow-hidden bg-base-200">
        <img src={imageUrl} alt={book.title} className="w-full h-full object-contain hover:scale-105 transition-transform" />
      </figure>
      <div className="card-body p-4">
        <h3 className="card-title text-sm line-clamp-2">{book.title}</h3>
        <p className="text-xs opacity-70">{book.author}</p>
        {book.genre?.genre_name && (
          <span className="badge badge-ghost text-xs">{book.genre.genre_name}</span>
        )}
        <div className="flex justify-between items-center mt-2">
          <span className="text-lg font-bold text-primary">Ksh {book.price_digital || 'N/A'}</span>
          <Link to={`/library/read/${book.book_id}`} className="btn btn-primary btn-sm">
            Read
          </Link>
        </div>
      </div>
    </div>
  )
}

export function MainLibraryPage() {
  const { canView } = usePermissions()
  const [searchParams] = useSearchParams()
  const library = searchParams.get('library') === 'true'
  
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  
  const { data: booksResponse, isLoading } = useLibraryBooks(search, selectedGenre, page)
  const { data: genres } = useGenres()
  
  const books = booksResponse?.records || []
  const totalPages = booksResponse?.totalPages || 0
  const total = booksResponse?.total || 0

  if (!canView('library')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center max-w-md p-8">
          <BookOpen className="w-24 h-24 mx-auto mb-4 text-primary opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6">You don't have permission to access the library.</p>
          <Link to="/dbslibrary" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-primary text-primary-content py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="btn btn-ghost btn-circle">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">DBS Library</h1>
              <p className="opacity-80">Find your next great read</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
              <input
                type="text"
                placeholder="Search books..."
                className="input input-bordered w-full pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>
          <select 
            className="select select-bordered"
            value={selectedGenre || ''}
            onChange={(e) => { setSelectedGenre(e.target.value ? Number(e.target.value) : undefined); setPage(1) }}
          >
            <option value="">All Genres</option>
            {genres?.map(g => (
              <option key={g.genre_id} value={g.genre_id}>{g.genre_name}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : books?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {books.map(book => (
              <BookCard key={book.book_id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 opacity-60">
            <BookOpen className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg">No books found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
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
            <span className="text-xs opacity-60 ml-2">
              ({total} books)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}