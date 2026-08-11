import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Download, Search, Trash2, HardDriveDownload, WifiOff, Loader2 } from 'lucide-react'
import { getAllOfflineBookIds, getOfflineBook, deleteOfflineBook, getBookKey, deleteBookKey } from '@/lib/offlineBooks'
import { setImgUrl } from '@/lib/utils'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { usePermissions } from '@/hooks/usePermissions'

interface OfflineBookData {
  bookId: number
  title: string
  author: string
  coverImage: string
  downloadedAt: string
}

export function OfflineLibraryPage() {
  const navigate = useNavigate()
  const { canView } = usePermissions()
  const [search, setSearch] = useState('')
  const [books, setBooks] = useState<OfflineBookData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  if (!canView('library')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center max-w-md p-8">
          <HardDriveDownload className="w-24 h-24 mx-auto mb-4 text-primary opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6">You don't have permission to access the offline library.</p>
          <Button onClick={() => navigate('/books/shop')}>Browse Shop</Button>
        </div>
      </div>
    )
  }

  const loadBooks = async () => {
    setLoading(true)
    try {
      const bookIds = await getAllOfflineBookIds()
      const bookData: OfflineBookData[] = []
      
      for (const id of bookIds) {
        const book = await getOfflineBook(id)
        if (book) {
          bookData.push({
            bookId: book.bookId,
            title: book.title,
            author: book.author,
            coverImage: book.coverImage,
            downloadedAt: book.downloadedAt,
          })
        }
      }
      
      setBooks(bookData)
    } catch (err) {
      console.error('Failed to load offline books:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  const handleDelete = async (bookId: number) => {
    setDeleting(bookId)
    try {
      await deleteOfflineBook(bookId)
      await deleteBookKey(bookId)
      setBooks(prev => prev.filter(b => b.bookId !== bookId))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeleting(null)
    }
  }

  const filteredBooks = books.filter(b => 
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase())
  )

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return mb.toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HardDriveDownload className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">My Offline Library</h1>
          </div>
          <p className="opacity-70 max-w-2xl mx-auto">
            Your downloaded books are stored securely on this device. 
            Read them anytime, even without internet connection.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-green-600">
            <WifiOff className="w-4 h-4" />
            <span>Works completely offline</span>
          </div>
        </div>

        {/* Search */}
        {books.length > 0 && (
          <div className="flex justify-center mb-8">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
              <input
                type="text"
                placeholder="Search your downloaded books..."
                className="input input-bordered w-full pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="opacity-60">Loading your offline books...</p>
          </div>
        )}

        {/* Books Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map(book => (
              <Card key={book.bookId} className="overflow-hidden">
                <div className="flex">
                  {/* Cover */}
                  <div className="w-24 h-36 flex-shrink-0">
                    <img 
                      src={setImgUrl(book.coverImage, 'medium')} 
                      alt={book.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/no-image.png'
                      }}
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold line-clamp-2">{book.title}</h3>
                      <p className="text-sm opacity-70 mt-1">{book.author}</p>
                      <p className="text-xs opacity-50 mt-2">
                        Downloaded {new Date(book.downloadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/library/read/${book.bookId}`)}
                      >
                        <BookOpen className="w-4 h-4 mr-1" />
                        Read
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(book.bookId)}
                        disabled={deleting === book.bookId}
                      >
                        {deleting === book.bookId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && books.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-base-100 mb-6">
              <Download className="w-10 h-10 opacity-30" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Downloaded Books</h2>
            <p className="opacity-60 max-w-md mx-auto mb-6">
              You haven't downloaded any books for offline reading yet. 
              Purchase digital books and download them to read offline.
            </p>
            <Button onClick={() => navigate('/books/shop')}>
              Browse Shop
            </Button>
          </div>
        )}

        {/* No Search Results */}
        {!loading && books.length > 0 && filteredBooks.length === 0 && (
          <div className="text-center py-12 opacity-60">
            <Search className="w-12 h-12 mx-auto mb-4" />
            <p>No books match "{search}"</p>
          </div>
        )}
      </div>
    </div>
  )
}