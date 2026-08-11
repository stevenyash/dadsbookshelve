import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Loader2, RotateCcw } from 'lucide-react'
import * as epubjs from 'epubjs'
import api from '@/lib/api'
import { API_BASE_URL } from '@/lib/api'
import { decryptEpub } from '@/lib/epubCrypto'
import { loadSettings, saveSettings, loadBookmarks, saveBookmarks, loadProgress, saveProgress } from '@/lib/readerStorage'
import { getOfflineBook, getBookKey } from '@/lib/offlineBooks'
import { themes, fontFamilies, type ThemeMode, type FontFamily, type ReadingMode, type AutoScrollSpeed } from '@/config/readerConfig'
import type { Book, TocItem } from '@/types/bookReader'
import { ReaderTopBar } from '@/components/reader/ReaderTopBar'
import { ReaderBottomBar } from '@/components/reader/ReaderBottomBar'
import { ReaderSettingsPanel } from '@/components/reader/ReaderSettingsPanel'
import { PageFlipViewer } from '@/components/reader/PageFlipViewer'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/store'

const ePub = epubjs.default || epubjs

const flipAnimationStyles = `
  .book-viewer {
    perspective: 2000px;
    transform-style: preserve-3d;
  }
  .page-flip-animating {
    transition: transform 0.5s cubic-bezier(0.645, 0.045, 0.355, 1) !important;
    transform-style: preserve-3d;
  }
  .page-flip-left {
    animation: flipLeft 0.6s cubic-bezier(0.645, 0.045, 0.355, 1);
    transform-origin: right center !important;
  }
  .page-flip-right {
    animation: flipRight 0.6s cubic-bezier(0.645, 0.045, 0.355, 1);
    transform-origin: left center !important;
  }
  @keyframes flipLeft {
    0% { transform: rotateY(0deg); }
    50% { transform: rotateY(-170deg); }
    100% { transform: rotateY(-180deg); }
  }
  @keyframes flipRight {
    0% { transform: rotateY(0deg); }
    50% { transform: rotateY(170deg); }
    100% { transform: rotateY(180deg); }
  }
  .page-shadow-left {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 40px;
    background: linear-gradient(to right, rgba(0,0,0,0.2), transparent);
    pointer-events: none;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .page-shadow-left.active {
    opacity: 1;
  }
  .page-shadow-right {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 40px;
    background: linear-gradient(to left, rgba(0,0,0,0.2), transparent);
    pointer-events: none;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .page-shadow-right.active {
    opacity: 1;
  }
`

export function BookReaderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const bookId = id ? parseInt(id) : 0
  const isRestoringRef = useRef(false)

  const savedSettings = loadSettings()
  
  const [fontSize, setFontSize] = useState(savedSettings.fontSize)
  const [fontFamily, setFontFamily] = useState<FontFamily>(savedSettings.fontFamily)
  const [theme, setTheme] = useState<ThemeMode>(savedSettings.theme)
  const [lineHeight, setLineHeight] = useState(savedSettings.lineHeight)
  const [margin, setMargin] = useState(savedSettings.margin)
  const [readingMode, setReadingMode] = useState<ReadingMode>(savedSettings.readingMode)

  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<AutoScrollSpeed>(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [toc, setToc] = useState<TocItem[]>([])
  const [currentChapter, setCurrentChapter] = useState('')
  const [bookmarks, setBookmarks] = useState<number[]>([])

  const controlsTimeoutRef = useRef<number>(0)
  const { isAuthenticated } = useAuthStore()
  const user = useAuthStore((state) => state.user)
  const [accessDenied, setAccessDenied] = useState(false)
  const [accessReason, setAccessReason] = useState('')

  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      const res = await api.get(`books/view/${id}`)
      console.log('books/view response:', res.data)
      // Backend returns { success, record }, interceptor should flatten but record stays nested
      return res.data.record as Book
    },
    enabled: !!id,
  })

  const { data: accessCheck, isLoading: accessLoading } = useQuery({
    queryKey: ['book-access', id],
    queryFn: async () => {
      if (!user?.user_id) {
        return { canAccess: false, reason: 'not_authenticated', message: 'Please log in to access this book' }
      }
      const res = await api.get(`books/verify-access/${id}`, {
        params: { userId: user.user_id }
      })
      console.log('verify-access response:', res.data)
      return res.data as { canAccess: boolean; accessType?: string; reason?: string; message?: string; expiresAt?: string }
    },
    enabled: !!id && !!user?.user_id,
  })

  useEffect(() => {
    if (!accessLoading && accessCheck && !accessCheck.canAccess) {
      setAccessDenied(true)
      setAccessReason(accessCheck.message || 'Access denied')
    }
  }, [accessCheck, accessLoading])

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings && !showToc) setShowControls(false)
    }, 3000)
  }, [showSettings, showToc])

  useEffect(() => {
    const handleActivity = () => resetControlsTimeout()
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('click', handleActivity)
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('click', handleActivity)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [resetControlsTimeout])

  useEffect(() => {
    if (bookId > 0) {
      setBookmarks(loadBookmarks(bookId))
      const savedProgress = loadProgress(bookId)
      if (savedProgress && savedProgress.currentPage > 1) {
        isRestoringRef.current = true
        setCurrentPage(savedProgress.currentPage || 1)
        setTotalPages(savedProgress.totalPages > 0 ? savedProgress.totalPages : 0)
        setProgress(savedProgress.progress || 0)
      }
    }
  }, [bookId])

  useEffect(() => {
    if (bookId > 0 && totalPages > 0 && currentPage > 0) {
      saveProgress(bookId, {
        currentPage,
        totalPages,
        progress: totalPages > 0 ? (currentPage / totalPages) * 100 : 0,
        lastRead: new Date().toISOString()
      })
    }
  }, [bookId, currentPage])

  useEffect(() => {
    console.log('useEffect book:', book, 'bookLoading:', bookLoading, 'librarybooks:', book?.librarybooks)
    if (!book?.librarybooks?.soft_copy) {
      if (!bookLoading) {
        setError('This book is not available for reading')
        setIsLoading(false)
      }
      return
    }

    const loadBook = async () => {
      setIsLoading(true)
      setError('')

      try {
        const { soft_copy: encryptedFile, book_key: encryptionKey, book_keysignature: ivSignature } = book.librarybooks!
        
        if (!encryptedFile || !encryptionKey || !ivSignature) {
          setError('Encryption keys not found for this book')
          setIsLoading(false)
          return
        }

        let encryptedData: ArrayBuffer | null = null
        let decryptKey = encryptionKey
        let decryptIv = ivSignature

        const offlineBook = await getOfflineBook(bookId)
        
        if (offlineBook) {
          const bookKey = await getBookKey(bookId)
          if (bookKey) {
            decryptKey = bookKey.key
            decryptIv = bookKey.iv
            encryptedData = offlineBook.encryptedData
          }
        }

        if (!encryptedData) {
          const filePath = encryptedFile.startsWith('uploads/') 
            ? encryptedFile.slice('uploads/'.length)
            : encryptedFile
          
          const response = await axios.get(`${API_BASE_URL}/uploads/${filePath}`, { responseType: 'arraybuffer' })
          encryptedData = response.data
        }
        
        const decryptedData = await decryptEpub(encryptedData, decryptKey, decryptIv)
        
        const arrayBuffer = decryptedData.slice(0)
        
        if (bookRef.current) bookRef.current.destroy()
        bookRef.current = ePub(arrayBuffer)
        
        const readyPromise = bookRef.current.ready
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        await Promise.race([readyPromise, timeoutPromise])

        const navigation = await bookRef.current.loaded.navigation
        if (navigation.toc) {
          const buildToc = (items: any[]): TocItem[] => items.map(item => ({
            label: item.label,
            href: item.href,
            subitems: item.subitems ? buildToc(item.subitems) : undefined
          }))
          setToc(buildToc(navigation.toc))
        }

        if (viewerRef.current) {
          while (viewerRef.current.firstChild) {
            viewerRef.current.removeChild(viewerRef.current.firstChild)
          }
          
          renditionRef.current = bookRef.current.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            spread: readingMode === 'paginated' ? 'auto' : 'none',
            manager: readingMode === 'scrolled' ? 'continuous' : 'default',
          })
          
          const locationsGeneratePromise = bookRef.current.locations.generate(1000)
          const locationsTimeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
          try {
            const locations = await Promise.race([locationsGeneratePromise, locationsTimeoutPromise])
            const newTotalPages = locations.length
            if (newTotalPages > 0) {
              setTotalPages(newTotalPages)
            }
            
            await renditionRef.current.display(undefined)
            
            const savedProgress = loadProgress(bookId)
            if (savedProgress && savedProgress.currentPage > 1 && savedProgress.currentPage <= newTotalPages) {
              isRestoringRef.current = true
              const section = bookRef.current.spine.get(savedProgress.currentPage - 1)
              if (section) {
                await renditionRef.current.display(section.href)
              }
            }
          } catch { 
          }

          renditionRef.current.on('relocated', (location: any) => {
            if (location.start.location !== undefined) {
              const page = location.start.location + 1
              
              if (isRestoringRef.current && page > 1) {
                isRestoringRef.current = false
                return
              }
              
              setCurrentPage(page)
              setProgress(totalPages > 0 ? (page / totalPages) * 100 : 0)
              
              if (location.start.href) {
                const chapter = toc.find(c => location.start.href.includes(c.href))
                if (chapter) setCurrentChapter(chapter.label)
              }
            }
          })
        }

        setIsLoading(false)
        resetControlsTimeout()
      } catch (err: any) {
        console.error('Failed to load book:', err)
        setError('Failed to load book: ' + (err.message || 'Unknown error'))
        setIsLoading(false)
      }
    }

    loadBook()

    return () => {
      if (bookRef.current) {
        bookRef.current.destroy()
        bookRef.current = null
      }
    }
  }, [book, bookLoading])

  const applyTheme = useCallback(() => {
    if (!renditionRef.current) return
    
    const themeConfig = themes[theme]
    const font = fontFamilies[fontFamily]
    
    renditionRef.current.themes.default({
      'body': {
        'background-color': themeConfig.bg,
        'color': themeConfig.text,
        'font-family': font,
        'line-height': lineHeight,
        'padding': `${margin}px`,
      },
      'a': { 'color': theme === 'dark' ? '#64b5f6' : '#1976d2' },
    })
  }, [theme, fontFamily, lineHeight, margin])

  useEffect(() => { applyTheme() }, [applyTheme])

  useEffect(() => {
    saveSettings({
      fontSize,
      fontFamily,
      theme,
      lineHeight,
      margin,
      readingMode
    })
  }, [fontSize, fontFamily, theme, lineHeight, margin, readingMode])

  useEffect(() => {
    if (renditionRef.current) renditionRef.current.themes.fontSize(`${fontSize}px`)
  }, [fontSize])

  useEffect(() => {
    if (!bookRef.current || !viewerRef.current) return
    
    const switchMode = async () => {
      while (viewerRef.current!.firstChild) {
        viewerRef.current!.removeChild(viewerRef.current!.firstChild)
      }
      renditionRef.current = bookRef.current!.renderTo(viewerRef.current!, {
        width: '100%',
        height: '100%',
        spread: readingMode === 'paginated' ? 'auto' : 'none',
        manager: readingMode === 'scrolled' ? 'continuous' : 'default',
      })
      
      if (bookRef.current?.loaded?.navigation) {
        await renditionRef.current!.display(undefined)
      }
      applyTheme()
    }
    
    switchMode()
  }, [readingMode])

  const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  
  useEffect(() => {
    if (!document.getElementById('flip-animations')) {
      const style = document.createElement('style')
      style.id = 'flip-animations'
      style.textContent = flipAnimationStyles
      document.head.appendChild(style)
    }
  }, [])
  
  const triggerFlipAnimation = (direction: 'left' | 'right', callback: () => void) => {
    if (readingMode !== 'paginated') {
      callback()
      return
    }
    if (isFlipping) return
    
    setIsFlipping(true)
    setFlipDirection(direction)
    
    setTimeout(() => {
      callback()
      setTimeout(() => {
        setFlipDirection(null)
        setIsFlipping(false)
      }, 300)
    }, 300)
  }
  
  const [flipTrigger, setFlipTrigger] = useState<{ direction: 'left' | 'right' } | null>(null)
  
  const doPrevPage = () => {
    if (renditionRef.current) renditionRef.current.prev()
  }
  const doNextPage = () => {
    if (renditionRef.current) renditionRef.current.next()
  }
  
  const prevPage = () => {
    doPrevPage()
    setFlipTrigger({ direction: 'left' })
    setTimeout(() => setFlipTrigger(null), 2500)
  }
  const nextPage = () => {
    doNextPage()
    setFlipTrigger({ direction: 'right' })
    setTimeout(() => setFlipTrigger(null), 2500)
  }
  
  const toggleBookmark = () => {
    if (currentPage > 0 && bookId > 0) {
      const newBookmarks = bookmarks.includes(currentPage) 
        ? bookmarks.filter(p => p !== currentPage)
        : [...bookmarks, currentPage]
      setBookmarks(newBookmarks)
      saveBookmarks(bookId, newBookmarks)
    }
  }
  
  const goToPage = (page: number) => {
    if (bookRef.current?.locations && typeof bookRef.current.locations.goToPage === 'function') {
      bookRef.current.locations.goToPage(page)
    }
  }
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    let scrollInterval: number
    if (readingMode === 'scrolled' && autoScrollSpeed > 0) {
      const speeds = [0, 20, 40, 60, 100]
      scrollInterval = window.setInterval(() => {
        const scrollable = viewerRef.current
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
          scrollable.scrollTop += speeds[autoScrollSpeed]
        }
      }, 100)
    }
    return () => { if (scrollInterval) window.clearInterval(scrollInterval) }
  }, [autoScrollSpeed, readingMode])

  useEffect(() => {
    if (!isSpeaking || !renditionRef.current) {
      window.speechSynthesis?.cancel()
      return
    }

    const speakContent = async () => {
      const contents = renditionRef.current.getContents()
      if (!contents || contents.length === 0) return

      const text = contents.map((c: any) => c.document.body?.textContent || '').join(' ')
      
      if (!text.trim()) return

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1
      utterance.pitch = 1
      
      const voices = window.speechSynthesis?.getVoices() || []
      const englishVoice = voices.find((v: any) => v.lang.startsWith('en'))
      if (englishVoice) utterance.voice = englishVoice

      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis?.speak(utterance)
    }

    speakContent()

    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [isSpeaking])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (readingMode === 'scrolled' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }

      const getScrollableElement = () => {
        return viewerRef.current
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          if (readingMode === 'scrolled') {
            const scrollable = getScrollableElement()
            if (scrollable) {
              scrollable.scrollTop = Math.max(0, scrollable.scrollTop - 150)
            }
          } else {
            prevPage()
          }
          break
        case 'ArrowRight':
        case 'ArrowDown':
          if (readingMode === 'scrolled') {
            const scrollable = getScrollableElement()
            if (scrollable) {
              scrollable.scrollTop = Math.min(scrollable.scrollHeight - scrollable.clientHeight, scrollable.scrollTop + 150)
            }
          } else {
            nextPage()
          }
          break
        case ' ':
          e.preventDefault()
          if (readingMode === 'scrolled') {
            if (autoScrollSpeed > 0) {
              setAutoScrollSpeed(0)
            } else {
              setAutoScrollSpeed(2)
            }
          } else {
            nextPage()
          }
          break
        case 'Home':
          if (readingMode === 'scrolled') {
            viewerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          } else if (bookRef.current) {
            bookRef.current.locations.goToPage(1)
          }
          break
        case 'End':
          if (readingMode === 'scrolled') {
            viewerRef.current?.scrollTo({ top: viewerRef.current.scrollHeight, behavior: 'smooth' })
          } else if (bookRef.current && totalPages > 0) {
            bookRef.current.locations.goToPage(totalPages)
          }
          break
        case 'Escape':
          setShowSettings(false)
          setShowToc(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readingMode, autoScrollSpeed])

  useEffect(() => {
    if (readingMode !== 'scrolled') return
    
    const viewer = viewerRef.current
    if (!viewer) return
    
    let ticking = false
    const handleWheel = (e: WheelEvent) => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(() => {
          if (renditionRef.current) {
            renditionRef.current.resize()
          }
          ticking = false
        })
      }
    }
    
    viewer.addEventListener('wheel', handleWheel, { passive: true })
    return () => viewer.removeEventListener('wheel', handleWheel)
  }, [readingMode])

  const handleViewerClick = (e: React.MouseEvent) => {
    if (readingMode === 'paginated' && !showControls) {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const width = rect.width
      
      if (x < width * 0.25) {
        prevPage()
      } else if (x > width * 0.75) {
        nextPage()
      }
    }
  }

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touchEnd = e.changedTouches[0]
    const diffX = touchEnd.clientX - touchStartRef.current.x
    const diffY = touchEnd.clientY - touchStartRef.current.y
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (readingMode === 'paginated') {
        if (diffX > 0) { prevPage() } 
        else { nextPage() }
      } else {
        if (diffX > 0) { viewerRef.current?.scrollBy({ top: -300, behavior: 'smooth' }) }
        else { viewerRef.current?.scrollBy({ top: 300, behavior: 'smooth' }) }
      }
    }
    touchStartRef.current = null
  }

  if (bookLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-neutral-content">Loading book...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-content mb-2">Login Required</h2>
          <p className="text-neutral-content/70 mb-4">Please log in to access the library.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">Login</button>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold text-neutral-content mb-2">Access Denied</h2>
          <p className="text-neutral-content/70 mb-4">{accessReason}</p>
          <button onClick={() => navigate('/library/subscribe')} className="btn btn-primary mb-2">
            Subscribe to Access
          </button>
          <button onClick={() => navigate(-1)} className="btn btn-ghost block w-full">Go Back</button>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral">
        <div className="text-center">
          <p className="text-neutral-content mb-4">Book not found</p>
          <button onClick={() => navigate(-1)} className="btn btn-primary">Go Back</button>
        </div>
      </div>
    )
  }

  const viewerClass = ''

  return (
    <div className={`fixed inset-0 flex flex-col ${theme === 'dark' ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
      <ReaderTopBar
        book={book}
        theme={theme}
        showControls={showControls}
        showSettings={showSettings}
        showToc={showToc}
        isSpeaking={isSpeaking}
        progress={progress}
        currentPage={currentPage}
        bookmarks={bookmarks}
        onBack={() => navigate(-1)}
        onToggleToc={() => setShowToc(!showToc)}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onToggleBookmark={toggleBookmark}
        onToggleSpeaking={() => setIsSpeaking(!isSpeaking)}
        onToggleFullscreen={toggleFullscreen}
      />

      <ReaderSettingsPanel
        theme={theme}
        fontSize={fontSize}
        fontFamily={fontFamily}
        lineHeight={lineHeight}
        margin={margin}
        readingMode={readingMode}
        autoScrollSpeed={autoScrollSpeed}
        showSettings={showSettings}
        onClose={() => setShowSettings(false)}
        onThemeChange={setTheme}
        onFontSizeChange={setFontSize}
        onFontFamilyChange={setFontFamily}
        onLineHeightChange={setLineHeight}
        onMarginChange={setMargin}
        onReadingModeChange={setReadingMode}
        onAutoScrollSpeedChange={setAutoScrollSpeed}
      />

      <div className="flex-1 min-h-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-neutral pt-16 pb-[60px]">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-neutral-content">Loading book...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-neutral pt-16 pb-[60px]">
            <div className="text-center p-6 max-w-md">
              <p className="text-error mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => window.location.reload()} className="btn btn-primary">
                  <RotateCcw className="w-4 h-4 mr-2" />Retry
                </button>
                <button onClick={() => navigate(-1)} className="btn btn-ghost">Go Back</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Page flip viewer with realistic page turn effect */}
        <PageFlipViewer
          onPrevPage={prevPage}
          onNextPage={nextPage}
          onFlipComplete={() => {}}
          canGoPrev={currentPage > 1}
          canGoNext={currentPage < totalPages}
          flipTrigger={flipTrigger}
        >
          <div 
            ref={viewerRef}
            tabIndex={0}
            className="absolute inset-0 overflow-y-auto pt-16 pb-[60px] book-viewer"
          />
        </PageFlipViewer>
      </div>

      <ReaderBottomBar
        theme={theme}
        readingMode={readingMode}
        currentPage={currentPage}
        totalPages={totalPages}
        progress={progress}
        autoScrollSpeed={autoScrollSpeed}
        showControls={showControls}
        currentChapter={currentChapter}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onGoToPage={goToPage}
        onToggleAutoScroll={() => setAutoScrollSpeed(autoScrollSpeed > 0 ? 0 : 2)}
      />
    </div>
  )
}