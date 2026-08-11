import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import api from '@/lib/api'
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Settings, Menu, BookOpen, 
  Sun, Moon, Minus, Plus, Eye, Bookmark, List, X, Check,
  Type, AlignLeft, Columns, Search, Loader2, RotateCcw, Volume2, Play, Pause
} from 'lucide-react'
import * as epubjs from 'epubjs'
const ePub = epubjs.default || epubjs

interface LibraryBooks {
  soft_copy?: string
  book_key?: string
  book_keysignature?: string
  readium_manifest?: string
}

interface Book {
  book_id: number
  title: string
  author: string
  image_url: string
  final_copy?: string
  librarybooks?: LibraryBooks | null
}

interface TocItem {
  label: string
  href: string
  subitems?: TocItem[]
}

type ThemeMode = 'light' | 'dark' | 'sepia'
type FontFamily = 'Georgia' | 'Merriweather' | 'OpenDyslexic' | 'System'
type ReadingMode = 'paginated' | 'scrolled'
type AutoScrollSpeed = 0 | 1 | 2 | 3 | 4

interface ReaderSettings {
  fontSize: number
  fontFamily: FontFamily
  theme: ThemeMode
  lineHeight: number
  margin: number
  readingMode: ReadingMode
}

interface ReadingProgress {
  currentPage: number
  totalPages: number
  progress: number
  lastRead: string
}

// Settings storage keys
const SETTINGS_KEY = 'dbs_reader_settings'
const BOOKMARKS_KEY = 'dbs_bookmarks'
const PROGRESS_KEY = 'dbs_reading_progress'

function loadSettings(): ReaderSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    fontSize: 18,
    fontFamily: 'Georgia',
    theme: 'light',
    lineHeight: 1.6,
    margin: 20,
    readingMode: 'paginated'
  }
}

function saveSettings(settings: ReaderSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function loadBookmarks(bookId: number): number[] {
  try {
    const saved = localStorage.getItem(`${BOOKMARKS_KEY}_${bookId}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

function saveBookmarks(bookId: number, bookmarks: number[]) {
  localStorage.setItem(`${BOOKMARKS_KEY}_${bookId}`, JSON.stringify(bookmarks))
}

function loadProgress(bookId: number): ReadingProgress | null {
  try {
    const saved = localStorage.getItem(`${PROGRESS_KEY}_${bookId}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveProgress(bookId: number, progress: ReadingProgress) {
  localStorage.setItem(`${PROGRESS_KEY}_${bookId}`, JSON.stringify(progress))
}

async function decryptEpub(encryptedBuffer: ArrayBuffer, keyBase64: string, ivBase64: string): Promise<ArrayBuffer> {
  try {
    const keyBuffer = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0))
    const ivBuffer = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
    
    const key = await crypto.subtle.importKey(
      'raw', keyBuffer, { name: 'AES-CBC' }, false, ['decrypt']
    )
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivBuffer }, key, encryptedBuffer
    )
    
    return decrypted
  } catch (err) {
    console.error('Decryption failed:', err)
    throw new Error('Failed to decrypt book')
  }
}

const themes: Record<ThemeMode, { bg: string; text: string; name: string }> = {
  light: { bg: '#ffffff', text: '#333333', name: 'Light' },
  dark: { bg: '#1a1a1a', text: '#e0e0e0', name: 'Dark' },
  sepia: { bg: '#f4ecd8', text: '#5b4636', name: 'Sepia' },
}

const fontFamilies: Record<FontFamily, string> = {
  Georgia: 'Georgia, serif',
  Merriweather: '"Merriweather", serif',
  OpenDyslexic: '"OpenDyslexic", sans-serif',
  System: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

export function BookReaderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const bookId = id ? parseInt(id) : 0

  // Load saved settings
  const savedSettings = loadSettings()
  
  // Reading settings
  const [fontSize, setFontSize] = useState(savedSettings.fontSize)
  const [fontFamily, setFontFamily] = useState<FontFamily>(savedSettings.fontFamily)
  const [theme, setTheme] = useState<ThemeMode>(savedSettings.theme)
  const [lineHeight, setLineHeight] = useState(savedSettings.lineHeight)
  const [margin, setMargin] = useState(savedSettings.margin)
  const [readingMode, setReadingMode] = useState<ReadingMode>(savedSettings.readingMode)

  // UI state
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<AutoScrollSpeed>(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Book state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [toc, setToc] = useState<TocItem[]>([])
  const [currentChapter, setCurrentChapter] = useState('')
  const [bookmarks, setBookmarks] = useState<number[]>([])

  const controlsTimeoutRef = useRef<number>(0)

  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      const res = await api.get(`books/view/${id}`)
      return res.data as Book
    },
    enabled: !!id,
  })

  // Auto-hide controls
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

  // Load bookmarks and progress when bookId changes
  useEffect(() => {
    if (bookId > 0) {
      setBookmarks(loadBookmarks(bookId))
      const savedProgress = loadProgress(bookId)
      if (savedProgress) {
        setCurrentPage(savedProgress.currentPage || 1)
        setTotalPages(savedProgress.totalPages > 0 ? savedProgress.totalPages : 0)
        setProgress(savedProgress.progress || 0)
      }
    }
  }, [bookId])

  // Save progress periodically (only when currentPage changes)
  useEffect(() => {
    if (bookId > 0 && totalPages > 0 && currentPage > 0) {
      saveProgress(bookId, {
        currentPage,
        totalPages,
        progress: totalPages > 0 ? (currentPage / totalPages) * 100 : 0,
        lastRead: new Date().toISOString()
      })
    }
  }, [bookId, currentPage]) // Only save when page changes

  useEffect(() => {
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

        const filePath = encryptedFile.startsWith('uploads/') 
          ? encryptedFile.slice('uploads/'.length)
          : encryptedFile
        
        const response = await axios.get(`${API_BASE}/uploads/${filePath}`, { responseType: 'arraybuffer' })
        const decryptedData = await decryptEpub(response.data, encryptionKey, ivSignature)
        
        // Convert to ArrayBuffer for epubjs
        const arrayBuffer = decryptedData.slice(0)
        
        if (bookRef.current) bookRef.current.destroy()
        bookRef.current = ePub(arrayBuffer)
        
        const readyPromise = bookRef.current.ready
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        await Promise.race([readyPromise, timeoutPromise])

        // Get TOC
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
          
          await renditionRef.current.display(undefined)
          applyTheme()

          // Generate locations
          const locationsGeneratePromise = bookRef.current.locations.generate(1000)
          const locationsTimeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
          try {
            const locations = await Promise.race([locationsGeneratePromise, locationsTimeoutPromise])
            const newTotalPages = locations.length
            if (newTotalPages > 0) {
              setTotalPages(newTotalPages)
            }
            
            // Restore saved progress
            const savedProgress = loadProgress(bookId)
            if (savedProgress && savedProgress.currentPage > 1 && savedProgress.currentPage <= newTotalPages) {
              if (typeof bookRef.current.locations.goToPage === 'function') {
                await bookRef.current.locations.goToPage(savedProgress.currentPage)
              }
            }
          } catch { 
            // Keep existing totalPages if available
          }

          renditionRef.current.on('relocated', (location: any) => {
            if (location.start.location !== undefined) {
              const page = location.start.location + 1
              setCurrentPage(page)
              setProgress(totalPages > 0 ? (page / totalPages) * 100 : 0)
              
              // Update current chapter
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

  // Save settings whenever they change
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

  // Re-render when reading mode changes
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
      
      // Only display if book is ready (locations generated)
      if (bookRef.current?.loaded?.navigation) {
        await renditionRef.current!.display(undefined)
      }
      applyTheme()
    }
    
    switchMode()
  }, [readingMode])

  // Inject flip animation styles - always runs, before any conditional returns
const prevPage = () => { if (renditionRef.current) renditionRef.current.prev() }
  const nextPage = () => { if (renditionRef.current) renditionRef.current.next() }
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

  // Auto-scroll effect
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

  // Text-to-speech effect
  useEffect(() => {
    if (!isSpeaking || !renditionRef.current) {
      window.speechSynthesis?.cancel()
      return
    }

    const speakContent = async () => {
      // Get current rendition content
      const contents = renditionRef.current.getContents()
      if (!contents || contents.length === 0) return

      const text = contents.map((c: any) => c.document.body?.textContent || '').join(' ')
      
      if (!text.trim()) return

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1
      utterance.pitch = 1
      
      // Get available voices
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Prevent default for arrow keys in scroll mode to avoid browser scrolling
      if (readingMode === 'scrolled' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }

      const getScrollableElement = () => {
        // Use the viewer container directly
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

  // Mouse wheel scroll for scrolled mode
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

  // Click zones for flip mode navigation on desktop
  const handleViewerClick = (e: React.MouseEvent) => {
    if (readingMode === 'paginated' && !showControls) {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const width = rect.width
      
      // Left 25% = previous, Right 25% = next
      if (x < width * 0.25) {
        prevPage()
      } else if (x > width * 0.75) {
        nextPage()
      }
    }
  }

  // Touch gestures for mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touchEnd = e.changedTouches[0]
    const diffX = touchEnd.clientX - touchStartRef.current.x
    const diffY = touchEnd.clientY - touchStartRef.current.y
    
    // Horizontal swipe - navigate pages
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

  if (bookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-neutral-content">Loading book...</p>
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
      {/* Top Bar */}
      <header className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}>
        <div className={`flex items-center justify-between px-4 py-3 ${
          theme === 'dark' ? 'bg-neutral-800/95' : 'bg-white/95'
        } backdrop-blur-sm border-b ${theme === 'dark' ? 'border-neutral-700' : 'border-neutral-200'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm btn-circle">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h3 className={`font-semibold text-sm truncate max-w-[200px] ${theme === 'dark' ? 'text-neutral-100' : 'text-neutral-900'}`}>
                {book.title}
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {book.author}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowToc(!showToc)} 
              className={`btn btn-ghost btn-sm btn-circle ${showToc ? 'text-primary' : ''}`}
              title="Table of Contents"
            >
              <List className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`btn btn-ghost btn-sm btn-circle ${showSettings ? 'text-primary' : ''}`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={toggleBookmark} className="btn btn-ghost btn-sm btn-circle" title="Bookmark">
              <Bookmark className={`w-5 h-5 ${bookmarks.includes(currentPage) ? 'fill-current text-primary' : ''}`} />
            </button>
            <button onClick={() => setIsSpeaking(!isSpeaking)} className={`btn btn-ghost btn-sm btn-circle ${isSpeaking ? 'text-primary' : ''}`} title="Text to Speech">
              <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
            </button>
            <button onClick={toggleFullscreen} className="btn btn-ghost btn-sm btn-circle" title="Fullscreen">
              <Columns className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`h-1 ${theme === 'dark' ? 'bg-neutral-700' : 'bg-neutral-200'}`}>
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Settings Panel */}
      <div className={`absolute top-16 right-4 z-30 transition-all duration-300 ${
        showSettings ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
      }`}>
        <div className={`w-72 p-4 rounded-2xl shadow-xl ${
          theme === 'dark' ? 'bg-neutral-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`font-semibold ${theme === 'dark' ? 'text-neutral-100' : 'text-neutral-900'}`}>Reading Settings</h4>
            <button onClick={() => setShowSettings(false)} className="btn btn-ghost btn-xs btn-circle">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme */}
          <div className="mb-4">
            <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Theme</label>
            <div className="flex gap-2">
              {(['light', 'dark', 'sepia'] as ThemeMode[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    theme === t 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : ''
                  } ${t === 'light' ? 'bg-white text-neutral-900 border' : t === 'dark' ? 'bg-neutral-900 text-neutral-100' : 'bg-[#f4ecd8] text-[#5b4636]'}`}
                >
                  {themes[t].name}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Font Size: {fontSize}px</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setFontSize(prev => Math.max(12, prev - 2))} className={`btn btn-sm btn-circle ${theme === 'dark' ? 'btn-neutral' : 'btn-ghost'}`}>
                <Minus className="w-4 h-4" />
              </button>
              <input 
                type="range" min="12" max="32" value={fontSize} 
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="flex-1 range range-primary range-sm"
              />
              <button onClick={() => setFontSize(prev => Math.min(32, prev + 2))} className={`btn btn-sm btn-circle ${theme === 'dark' ? 'btn-neutral' : 'btn-ghost'}`}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div className="mb-4">
            <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Font</label>
            <select 
              value={fontFamily} 
              onChange={(e) => setFontFamily(e.target.value as FontFamily)}
              className={`select select-sm w-full ${theme === 'dark' ? 'select-bordered' : ''}`}
            >
              <option value="Georgia">Georgia</option>
              <option value="Merriweather">Merriweather</option>
              <option value="OpenDyslexic">OpenDyslexic</option>
              <option value="System">System</option>
            </select>
          </div>

          {/* Line Height */}
          <div className="mb-4">
            <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Line Spacing: {lineHeight}</label>
            <input 
              type="range" min="1" max="2.5" step="0.1" value={lineHeight}
              onChange={(e) => setLineHeight(parseFloat(e.target.value))}
              className="range range-primary range-sm"
            />
          </div>

          {/* Margins */}
          <div className="mb-4">
            <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Margins: {margin}px</label>
            <input 
              type="range" min="10" max="50" value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value))}
              className="range range-primary range-sm"
            />
          </div>

          {/* Reading Mode */}
          <div>
            <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Reading Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setReadingMode('paginated')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  readingMode === 'paginated' 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : ''
                } ${theme === 'dark' ? 'bg-neutral-700 text-neutral-200' : 'bg-neutral-100 text-neutral-700'}`}
              >
                <BookOpen className="w-4 h-4 inline mr-1" /> Flip
              </button>
              <button
                onClick={() => setReadingMode('scrolled')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  readingMode === 'scrolled' 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : ''
                } ${theme === 'dark' ? 'bg-neutral-700 text-neutral-200' : 'bg-neutral-100 text-neutral-700'}`}
              >
                <AlignLeft className="w-4 h-4 inline mr-1" /> Scroll
              </button>
            </div>

            {/* Auto-scroll speed control */}
            {readingMode === 'scrolled' && (
              <div className="mt-4">
                <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Auto-scroll: {autoScrollSpeed === 0 ? 'Off' : `${autoScrollSpeed}x`}
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setAutoScrollSpeed(speed as AutoScrollSpeed)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium ${
                        autoScrollSpeed === speed 
                          ? 'bg-primary text-white' 
                          : theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {speed === 0 ? 'Off' : speed}
                    </button>
                  ))}
                </div>
              </div>
)}
      </div>

      {/* Viewer Container */}
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
        
        <div 
          ref={viewerRef}
          tabIndex={0}
          className={`absolute inset-0 overflow-y-auto pt-16 pb-[60px] book-viewer ${viewerClass}`}
        />
      </div>

      {/* Bottom Bar */}
      <footer className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
      }`}>
        <div className={`h-1 ${theme === 'dark' ? 'bg-neutral-700' : 'bg-neutral-200'}`}>
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        
        <div className={`flex items-center justify-between px-4 py-3 ${
          theme === 'dark' ? 'bg-neutral-800/95' : 'bg-white/95'
        } backdrop-blur-sm border-t ${theme === 'dark' ? 'border-neutral-700' : 'border-neutral-200'}`}>
          <button 
            onClick={prevPage} 
            className={`btn btn-ghost btn-sm ${currentPage <= 1 ? 'btn-disabled' : ''}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center flex-1 max-w-[200px]">
            {/* Auto-scroll play/pause for scrolled mode */}
            {readingMode === 'scrolled' && (
              <button 
                onClick={() => setAutoScrollSpeed(autoScrollSpeed > 0 ? 0 : 2)}
                className={`btn btn-circle btn-sm mb-1 ${autoScrollSpeed > 0 ? 'btn-primary' : 'btn-ghost'}`}
                title={autoScrollSpeed > 0 ? 'Pause' : 'Play'}
              >
                {autoScrollSpeed > 0 ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
            
            <input
              type="range"
              min="1"
              max={totalPages || 100}
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value))}
              className={`w-full range range-xs ${readingMode === 'scrolled' ? 'hidden' : ''}`}
              disabled={!totalPages}
            />
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-neutral-100' : 'text-neutral-900'}`}>
                {readingMode === 'scrolled' 
                  ? `${Math.round(progress)}%` 
                  : `${currentPage}/${totalPages || '...'}`}
              </span>
            </div>
            {currentChapter && (
              <span className={`text-xs truncate max-w-[200px] ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {currentChapter}
              </span>
            )}
          </div>
          
          <button 
            onClick={nextPage} 
            className={`btn btn-ghost btn-sm ${currentPage >= totalPages ? 'btn-disabled' : ''}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  )
}