import { useRef, useState, useEffect, useCallback } from 'react'

export interface PageFlipViewerProps {
  children: React.ReactNode
  onPrevPage: () => void
  onNextPage: () => void
  onFlipComplete?: () => void
  canGoPrev: boolean
  canGoNext: boolean
  flipTrigger?: { direction: 'left' | 'right' } | null
}

export function PageFlipViewer({ children, onPrevPage, onNextPage, onFlipComplete, canGoPrev, canGoNext, flipTrigger }: PageFlipViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null)
  const [flipProgress, setFlipProgress] = useState(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canGoPrev) {
        startFlip('left')
      } else if (e.key === 'ArrowRight' && canGoNext) {
        startFlip('right')
      } else if (e.key === ' ' && canGoNext) {
        e.preventDefault()
        startFlip('right')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canGoPrev, canGoNext])

  useEffect(() => {
    if (!document.getElementById('page-flip-styles')) {
      const style = document.createElement('style')
      style.id = 'page-flip-styles'
      style.textContent = `
        .flip-viewer-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .flip-page-current {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .flip-page-turning {
          position: absolute;
          inset: 0;
          z-index: 10;
          background: linear-gradient(135deg, #f5f5f0 0%, #e8e8e0 100%);
          transform-origin: left center;
          backface-visibility: hidden;
        }
        .flip-page-turning.right {
          transform-origin: right center;
        }
        .flip-page-back {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .flip-click-zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 25%;
          z-index: 20;
          cursor: pointer;
        }
        .flip-click-zone:hover {
          background: rgba(0,0,0,0.02);
        }
        .flip-click-zone.left {
          left: 0;
        }
        .flip-click-zone.right {
          right: 0;
        }
        .flip-click-zone.disabled {
          cursor: default;
          pointer-events: none;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  const startFlip = useCallback((direction: 'left' | 'right') => {
    if (isFlipping) return
    if (direction === 'left' && !canGoPrev) return
    if (direction === 'right' && !canGoNext) return
    
    setIsFlipping(true)
    setFlipDirection(direction)
    setFlipProgress(0)
    
    const duration = 2500
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setFlipProgress(eased)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Animation complete - navigation already done via flipTrigger
        if (onFlipComplete) onFlipComplete()
        
        setTimeout(() => {
          setIsFlipping(false)
          setFlipDirection(null)
          setFlipProgress(0)
        }, 50)
      }
    }
    
    requestAnimationFrame(animate)
  }, [isFlipping, canGoPrev, canGoNext, onPrevPage, onNextPage])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    
    const touchEnd = e.changedTouches[0]
    const diffX = touchEnd.clientX - touchStartRef.current.x
    const diffY = touchEnd.clientY - touchStartRef.current.y
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0 && canGoPrev) {
        startFlip('left')
      } else if (diffX < 0 && canGoNext) {
        startFlip('right')
      }
    }
    
    touchStartRef.current = null
  }

  // React to external flip trigger from footer buttons
  useEffect(() => {
    if (flipTrigger && flipTrigger.direction && !isFlipping) {
      startFlip(flipTrigger.direction)
    }
  }, [flipTrigger])

  // Calculate transform style for the turning page
  const getTurnStyle = (): React.CSSProperties => {
    if (!isFlipping || !flipDirection) return { opacity: 0 }
    
    const rotation = flipProgress * 180
    
    if (flipDirection === 'right') {
      return {
        transform: `rotateY(${rotation}deg)`,
        transformOrigin: 'right center',
        opacity: 1 - flipProgress * 0.5,
      }
    } else {
      return {
        transform: `rotateY(${-rotation}deg)`,
        transformOrigin: 'left center',
        opacity: 1 - flipProgress * 0.5,
      }
    }
  }

  // Calculate opacity for current page (fades as turning progresses)
  const getCurrentOpacity = (): number => {
    if (!isFlipping) return 1
    return 1 - flipProgress * 0.3
  }

  return (
    <div
      ref={containerRef}
      className="flip-viewer-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      {/* Hidden back page (next content) */}
      <div className="flip-page-back" style={{ opacity: 0 }}>
        {children}
      </div>
      
      {/* Current page with fading */}
      <div 
        className="flip-page-current"
        style={{ opacity: getCurrentOpacity() }}
      >
        {children}
      </div>
      
      {/* Turning page overlay */}
      {isFlipping && (
        <div 
          className={`flip-page-turning ${flipDirection === 'right' ? 'right' : ''}`}
          style={getTurnStyle()}
        >
          <div style={{ 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(135deg, #faf8f5 0%, #f0ede5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '2px',
              height: '60%',
              background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.1), transparent)'
            }} />
          </div>
        </div>
      )}
      
      {/* Click zones for navigation */}
      <div 
        className={`flip-click-zone left ${!canGoPrev || isFlipping ? 'disabled' : ''}`}
        onClick={() => !isFlipping && canGoPrev && startFlip('left')}
        title="Previous page"
      />
      <div 
        className={`flip-click-zone right ${!canGoNext || isFlipping ? 'disabled' : ''}`}
        onClick={() => !isFlipping && canGoNext && startFlip('right')}
        title="Next page"
      />
    </div>
  )
}