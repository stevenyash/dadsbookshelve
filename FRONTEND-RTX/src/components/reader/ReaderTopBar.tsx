import { ArrowLeft, List, Settings, Bookmark, Volume2, Columns, X } from 'lucide-react'
import type { Book } from '../../types/bookReader'
import type { ThemeMode } from '../../config/readerConfig'

interface ReaderTopBarProps {
  book: Book
  theme: ThemeMode
  showControls: boolean
  showSettings: boolean
  showToc: boolean
  isSpeaking: boolean
  progress: number
  currentPage: number
  bookmarks: number[]
  onBack: () => void
  onToggleToc: () => void
  onToggleSettings: () => void
  onToggleBookmark: () => void
  onToggleSpeaking: () => void
  onToggleFullscreen: () => void
}

export function ReaderTopBar({
  book,
  theme,
  showControls,
  showSettings,
  showToc,
  isSpeaking,
  progress,
  currentPage,
  bookmarks,
  onBack,
  onToggleToc,
  onToggleSettings,
  onToggleBookmark,
  onToggleSpeaking,
  onToggleFullscreen,
}: ReaderTopBarProps) {
  return (
    <header className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ${
      showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
    }`}>
      <div className={`flex items-center justify-between px-4 py-3 ${
        theme === 'dark' ? 'bg-neutral-800/95' : 'bg-white/95'
      } backdrop-blur-sm border-b ${theme === 'dark' ? 'border-neutral-700' : 'border-neutral-200'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
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
            onClick={onToggleToc} 
            className={`btn btn-ghost btn-sm btn-circle ${showToc ? 'text-primary' : ''}`}
            title="Table of Contents"
          >
            <List className="w-5 h-5" />
          </button>
          <button 
            onClick={onToggleSettings} 
            className={`btn btn-ghost btn-sm btn-circle ${showSettings ? 'text-primary' : ''}`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={onToggleBookmark} className="btn btn-ghost btn-sm btn-circle" title="Bookmark">
            <Bookmark className={`w-5 h-5 ${bookmarks.includes(currentPage) ? 'fill-current text-primary' : ''}`} />
          </button>
          <button onClick={onToggleSpeaking} className={`btn btn-ghost btn-sm btn-circle ${isSpeaking ? 'text-primary' : ''}`} title="Text to Speech">
            <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
          </button>
          <button onClick={onToggleFullscreen} className="btn btn-ghost btn-sm btn-circle" title="Fullscreen">
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
  )
}