import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import type { ThemeMode, ReadingMode, AutoScrollSpeed } from '../../config/readerConfig'

interface ReaderBottomBarProps {
  theme: ThemeMode
  readingMode: ReadingMode
  currentPage: number
  totalPages: number
  progress: number
  autoScrollSpeed: AutoScrollSpeed
  showControls: boolean
  currentChapter: string
  onPrevPage: () => void
  onNextPage: () => void
  onGoToPage: (page: number) => void
  onToggleAutoScroll: () => void
}

export function ReaderBottomBar({
  theme,
  readingMode,
  currentPage,
  totalPages,
  progress,
  autoScrollSpeed,
  showControls,
  currentChapter,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onToggleAutoScroll,
}: ReaderBottomBarProps) {
  return (
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
          onClick={onPrevPage} 
          className={`btn btn-ghost btn-sm ${currentPage <= 1 ? 'btn-disabled' : ''}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center flex-1 max-w-[200px]">
          {readingMode === 'scrolled' && (
            <button 
              onClick={onToggleAutoScroll}
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
            onChange={(e) => onGoToPage(parseInt(e.target.value))}
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
          onClick={onNextPage} 
          className={`btn btn-ghost btn-sm ${currentPage >= totalPages ? 'btn-disabled' : ''}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </footer>
  )
}