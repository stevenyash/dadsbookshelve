import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
import { Search, ShoppingCart, BookOpen, Loader2, Plus, Check, Eye, Download, Info, X, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'
import { useCart } from '@/store/cartStore'
import { useAuthStore } from '@/store/store'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { hasOfflineBook, saveOfflineBook, saveBookKey } from '@/lib/offlineBooks'
import { usePermissions } from '@/hooks/usePermissions'

interface Book {
  book_id: number
  title: string
  author: string
  price_digital?: number
  price_physical?: number
  stock_digital: number
  stock_physical: number
  image_url: string
  genre_id: number
  genre?: { genre_id: number; genre_name: string }
  overview?: string
}

interface Genre {
  genre_id: number
  genre_name: string
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
    queryKey: ['books', search, genreId, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (genreId) params.append('genre_id', genreId.toString())
      params.append('limit', '12')
      params.append('page', page.toString())
      const res = await api.get(`books/shop?${params.toString()}`)
      return res.data as BooksResponse
    },
    staleTime: 60 * 1000,
  })
}

function usePurchasedBooks() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  return useQuery({
    queryKey: ['purchased-books'],
    queryFn: async () => {
      if (!isAuthenticated) return new Set<number>()
      const res = await api.get('orders/index?limit=100')
      const orders = res.data.records || []
      const purchasedIds = new Set<number>()
      orders.forEach((order: any) => {
        if (order.order_status === 'completed' || order.status === 'completed') {
          order.order_items?.forEach((item: any) => {
            purchasedIds.add(item.book_id)
          })
        }
      })
      return purchasedIds
    },
    staleTime: 60 * 1000,
    enabled: isAuthenticated,
  })
}

function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('genres')
      return res.data.records as Genre[]
    },
    staleTime: 60 * 60 * 1000,
  })
}

function BookCard({ book, onAddToCart, isInCartDigital, isInCartPhysical, isPurchased }: { 
  book: Book, 
  onAddToCart: (book: Book, format: 'digital' | 'physical') => void,
  isInCartDigital: boolean,
  isInCartPhysical: boolean,
  isPurchased: boolean
}) {
  const navigate = useNavigate()
  const [showAbout, setShowAbout] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const imageUrl = book.image_url ? setImgUrl(book.image_url, 'medium') : '/no-image.png'
  const user = useAuthStore(state => state.user)

  useQuery({
    queryKey: ['offline-status', book.book_id],
    queryFn: async () => {
      const hasIt = await hasOfflineBook(book.book_id)
      setIsDownloaded(hasIt)
      return hasIt
    },
    enabled: isPurchased,
  })

  const handleRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/library/read/${book.book_id}`)
  }
  
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (isDownloaded) {
      navigate(`/library/offline`)
      return
    }

    if (!user?.user_id) {
      navigate('/login')
      return
    }

    setDownloading(true)

    try {
      const bookRes = await api.get(`books/view/${book.book_id}`)
      const fullBook = bookres.data

      if (!fullBook.librarybooks?.soft_copy || !fullBook.librarybooks?.book_key || !fullBook.librarybooks?.book_keysignature) {
        alert('This book does not support offline download')
        setDownloading(false)
        return
      }

      const response = await api.get(`books/download/${book.book_id}`, {
        params: { userId: user.user_id },
        responseType: 'arraybuffer',
      })

      await saveOfflineBook({
        bookId: book.book_id,
        title: book.title,
        author: book.author,
        coverImage: book.image_url,
        encryptedData: response.data,
        downloadedAt: new Date().toISOString(),
      })

      await saveBookKey({
        bookId: book.book_id,
        key: fullBook.librarybooks.book_key,
        iv: fullBook.librarybooks.book_keysignature,
      })

      setIsDownloaded(true)
      alert('Book downloaded for offline reading!')
    } catch (err: any) {
      console.error('Download failed:', err)
      alert(err.response?.data?.message || 'Failed to download book')
    } finally {
      setDownloading(false)
    }
  }
  
  const handleAboutClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowAbout(true)
  }
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group">
      <figure className="h-72 p-2 bg-base-100 cursor-pointer" onClick={() => navigate(`/books/view/${book.book_id}`)}>
        <img 
          src={imageUrl} 
          alt={book.title} 
          className="w-full h-full object-contain" 
        />
      </figure>
      <div className="card-body p-4">
        <h3 
          className="card-title text-sm line-clamp-2 cursor-pointer hover:text-primary" 
          onClick={() => navigate(`/books/view/${book.book_id}`)}
        >
          {book.title}
        </h3>
        <p className="text-xs opacity-70">{book.author}</p>
        {book.genre && (
          <p className="text-xs opacity-50">{book.genre.genre_name}</p>
        )}
        <div className="flex flex-col gap-1 mt-2">
        </div>
        <div className="mt-1">
          {Number(book.price_digital || 0) > 0 && Number(book.stock_digital || 0) > 0 && (
            <div className="flex items-center justify-between bg-purple-50 p-1 rounded">
              <span className="text-xs text-purple-600 font-medium">Digital:</span>
              <span className="text-lg font-bold text-purple-600">KES {Number(book.price_digital || 0).toLocaleString()}</span>
            </div>
          )}
          {Number(book.price_physical || 0) > 0 && Number(book.stock_physical || 0) > 0 && (
            <div className="flex items-center justify-between bg-blue-50 p-1 rounded mt-1">
              <span className="text-xs text-blue-600 font-medium">Physical:</span>
              <span className="text-lg font-bold text-blue-600">KES {Number(book.price_physical || 0).toLocaleString()}</span>
            </div>
          )}
        </div>
        {!isPurchased && (
          <Button className="btn-sm btn-outline w-full mb-2" onClick={handleAboutClick}>
            <Info className="w-4 h-4 mr-1" />
            About this book
          </Button>
        )}
        <div className="mt-2">
          {isPurchased ? (
            <div className="flex gap-2">
              <Button className="btn-sm flex-1 bg-primary" onClick={handleRead}>
                <Eye className="w-4 h-4 mr-1" />
                Read
              </Button>
              <Button 
                className={`btn-sm flex-1 ${isDownloaded ? 'bg-green-500' : 'bg-secondary'}`} 
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isDownloaded ? (
                  <span className="flex items-center">
                    <Check className="w-4 h-4 mr-1" />
                    Downloaded
                  </span>
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                {isDownloaded ? 'Offline' : 'Download'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Number(book.price_digital || 0) > 0 && Number(book.stock_digital || 0) > 0 && (
                isInCartDigital ? (
                  <Button className="btn-sm w-full bg-green-500 hover:bg-green-600" disabled>
                    <Check className="w-4 h-4 mr-1" />
                    Digital in Cart
                  </Button>
                ) : (
                  <Button 
                    className="btn-sm w-full bg-purple-500 hover:bg-purple-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToCart(book, 'digital')
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Digital
                  </Button>
                )
              )}
              {Number(book.price_physical || 0) > 0 && Number(book.stock_physical || 0) > 0 && (
                isInCartPhysical ? (
                  <Button className="btn-sm w-full bg-green-500 hover:bg-green-600" disabled>
                    <Check className="w-4 h-4 mr-1" />
                    Physical in Cart
                  </Button>
                ) : (
                  <Button 
                    className="btn-sm w-full bg-blue-500 hover:bg-blue-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToCart(book, 'physical')
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Physical
                  </Button>
                )
              )}
              {Number(book.stock_digital || 0) === 0 && Number(book.stock_physical || 0) === 0 && (
                <Button className="btn-sm w-full" disabled>
                  Out of Stock
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* About Book Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAbout(false)}>
          <div className="bg-base-100 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">About this book</h3>
              <button onClick={() => setShowAbout(false)} className="btn btn-sm btn-circle btn-ghost">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex gap-4 mb-4">
                <img src={imageUrl} alt={book.title} className="w-24 h-36 object-contain rounded shadow" />
                <div>
                  <h4 className="font-bold text-lg">{book.title}</h4>
                  <p className="text-sm opacity-70">{book.author}</p>
                  {book.genre && <p className="text-xs opacity-50">{book.genre.genre_name}</p>}
                </div>
              </div>
              {book.overview ? (
                <div className="mt-4">
                  <h5 className="font-semibold mb-2">Overview</h5>
                  <p className="text-sm opacity-80 whitespace-pre-line">{book.overview}</p>
                </div>
              ) : (
                <p className="text-sm opacity-60 italic">No description available.</p>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button onClick={() => setShowAbout(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export function BookShopPage() {
  const { canView } = usePermissions()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const authLoading = useAuthStore(state => state.isLoading)
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 500)
  const debouncedGenre = useDebounce(selectedGenre, 500)
  const { data: booksResponse, isFetching: booksIsFetching } = useBooks(debouncedSearch, debouncedGenre, page)
  const { data: genres } = useGenres()
  const { addBookToCart, cartItems } = useCart()
  const { data: purchasedBooks } = usePurchasedBooks()
  const navigate = useNavigate()
  
  const books = booksResponse?.records || []
  const totalPages = booksResponse?.totalPages || 0
  const total = booksResponse?.total || 0
  const cartFormats = new Set(cartItems.map(item => `${item.book_id}-${item.format}`))

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login?redirect=/books/shop" replace />
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!canView('shop')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to access the shop.</p>
      </div>
    )
  }

  const handleAddToCart = (book: Book, format: 'digital' | 'physical') => {
    const price = format === 'digital' ? book.price_digital : book.price_physical
    
    if (!price) return
    
    addBookToCart({
      book_id: book.book_id,
      title: book.title,
      author: book.author,
      price: price,
      cover_image: book.image_url,
      format: format,
    })
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-primary text-primary-content py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">DBS Book Store</h1>
          <p className="opacity-80">Browse and purchase books from our collection</p>
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
                placeholder="Search books by title or author..."
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
            <option value="">All Categories</option>
            {genres?.map(g => (
              <option key={g.genre_id} value={g.genre_id}>{g.genre_name}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        {books?.length === 0 && booksIsFetching ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : books?.length ? (
          <div className="relative">
            {booksIsFetching && (
              <div className="absolute inset-0 bg-base-100/50 flex items-center justify-center z-10">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {books.map(book => (
                <BookCard 
                  key={book.book_id} 
                  book={book} 
                  onAddToCart={handleAddToCart}
                  isInCartDigital={cartFormats.has(`${book.book_id}-digital`)}
                  isInCartPhysical={cartFormats.has(`${book.book_id}-physical`)}
                  isPurchased={purchasedBooks?.has(book.book_id) || false}
                />
              ))}
            </div>
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

      {/* Floating Cart Button */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button 
            className="btn-primary btn-lg shadow-lg"
            onClick={() => navigate('/cart')}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Cart ({cartItems.length})
          </Button>
        </div>
      )}
    </div>
  )
}