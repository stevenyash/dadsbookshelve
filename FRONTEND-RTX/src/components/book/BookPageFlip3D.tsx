import { useRef, useState, useEffect, useCallback } from 'react'

interface BookPageFlip3DProps {
  children: React.ReactNode
  onPrevPage: () => void
  onNextPage: () => void
  canGoPrev: boolean
  canGoNext: boolean
  isFlipping: boolean
  flipDirection: 'left' | 'right' | null
}

export function BookPageFlip3D({
  children,
  onPrevPage,
  onNextPage,
  canGoPrev,
  canGoNext,
  isFlipping,
  flipDirection
}: BookPageFlip3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [showSecondPage, setShowSecondPage] = useState(false)
  
  const triggerFlip = useCallback((dir: 'left' | 'right') => {
    if (animating) return
    
    setDirection(dir)
    setAnimating(true)
    
    // Animate the page flip
    const pageEl = containerRef.current
    if (!pageEl) return
    
    // Calculate the fold position (spine of the book)
    const spineX = pageEl.clientWidth / 2
    
    // Create fold effect using CSS 3D transforms
    pageEl.style.transformOrigin = dir === 'right' ? 'left center' : 'right center'
    pageEl.style.transition = 'transform 0.5s cubic-bezier(0.645, 0.045, 0.355, 1)'
    
    // Phase 1: Fold the page
    requestAnimationFrame(() => {
      const foldAngle = dir === 'right' ? -170 : 170
      pageEl.style.transform = `rotateY(${foldAngle}deg)`
    })
    
    // Phase 2: Switch pages and unfold
    setTimeout(() => {
      // Call the actual page change
      if (dir === 'right') {
        onNextPage()
      } else {
        onPrevPage()
      }
      
      // Reset and unfold
      pageEl.style.transform = 'rotateY(0deg)'
      
      setTimeout(() => {
        setDirection(null)
        setAnimating(false)
        pageEl.style.transition = ''
        pageEl.style.transformOrigin = ''
      }, 100)
    }, 300)
  }, [animating, onPrevPage, onNextPage])
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && canGoNext && !animating) {
        triggerFlip('right')
      } else if (e.key === 'ArrowLeft' && canGoPrev && !animating) {
        triggerFlip('left')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canGoPrev, canGoNext, animating, triggerFlip])
  
  // Inject styles
  useEffect(() => {
    const styleId = 'book-flip-3d-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .book-page-container {
          perspective: 2000px;
          transform-style: preserve-3d;
        }
        .book-page {
          backface-visibility: hidden;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.25, 0.5, 0.5, 1);
          transform-origin: center left;
        }
        .book-page.flipping-right {
          transform-origin: left center;
        }
        .book-page.flipping-left {
          transform-origin: right center;
        }
        .page-shadow {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          background: linear-gradient(to right, rgba(0,0,0,0.15), rgba(0,0,0,0));
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .page-shadow.active {
          opacity: 1;
        }
        .spine-shadow {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 20px;
          background: linear-gradient(to right, rgba(0,0,0,0.3), rgba(0,0,0,0));
          transform: translateX(-50%);
          pointer-events: none;
        }
      `
      document.head.appendChild(style)
    }
  }, [])
  
  const flipClass = direction === 'right' ? 'flipping-right' : direction === 'left' ? 'flipping-left' : ''
  
  return (
    <div ref={containerRef} className="book-page-container w-full h-full relative">
      {/* Page content */}
      <div className={`book-page w-full h-full ${flipClass}`}>
        {children}
      </div>
      
      {/* Spine shadow */}
      <div className="spine-shadow" />
      
      {/* Page fold shadow */}
      <div className={`page-shadow ${animating ? 'active' : ''} ${direction === 'right' ? 'left-0' : 'right-0'}`} 
        style={direction === 'right' ? { left: 0 } : { right: 0 }}
      />
    </div>
  )
}

// Simple click-based navigation with animation
export function usePageFlip3D() {
  const [flipState, setFlipState] = useState<{
    isFlipping: boolean
    direction: 'left' | 'right' | null
  }>({
    isFlipping: false,
    direction: null
  })
  
  const triggerFlip = useCallback((direction: 'left' | 'right', callback: () => void) => {
    if (flipState.isFlipping) return
    
    setFlipState({ isFlipping: true, direction })
    
    // Wait for animation to complete
    setTimeout(() => {
      callback()
      setTimeout(() => {
        setFlipState({ isFlipping: false, direction: null })
      }, 100)
    }, 300)
  }, [flipState.isFlipping])
  
  return { flipState, triggerFlip }
}

export default BookPageFlip3D