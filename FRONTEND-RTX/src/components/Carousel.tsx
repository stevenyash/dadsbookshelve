import { useState, useEffect, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { setImgUrl } from '@/lib/utils'

interface CarouselProps {
  items: ReactNode[]
  autoPlay?: boolean
  interval?: number
  className?: string
}

export function Carousel({ items, autoPlay = true, interval = 5000, className = '' }: CarouselProps) {
  const [current, setCurrent] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')

  useEffect(() => {
    if (!autoPlay || isHovered || items.length <= 1) return
    
    const timer = setInterval(() => {
      setDirection('right')
      setCurrent((prev) => (prev + 1) % items.length)
    }, interval)
    
    return () => clearInterval(timer)
  }, [autoPlay, interval, isHovered, items.length])

  const next = () => {
    setDirection('right')
    setCurrent((prev) => (prev + 1) % items.length)
  }
  const prev = () => {
    setDirection('left')
    setCurrent((prev) => (prev - 1 + items.length) % items.length)
  }
  const goTo = (index: number) => {
    setDirection(index > current ? 'right' : 'left')
    setCurrent(index)
  }

  if (!items.length) return null

  const getSlideClass = (index: number) => {
    if (index === current) {
      return 'opacity-100 z-10 translate-x-0'
    }
    if (index === (current - 1 + items.length) % items.length) {
      return 'opacity-0 z-0 -translate-x-full'
    }
    if (index === (current + 1) % items.length) {
      return 'opacity-0 z-0 translate-x-full'
    }
    return 'opacity-0 z-0'
  }

  return (
    <div 
      className={`relative w-full h-full overflow-hidden rounded-lg shadow-md ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      <div className="relative w-full h-full">
        {items.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${getSlideClass(index)}`}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 btn btn-circle btn-ghost bg-white/20 hover:bg-white/40 z-20 backdrop-blur-sm transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-ghost bg-white/20 hover:bg-white/40 z-20 backdrop-blur-sm transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        </>
      )}

      {/* Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80 w-2'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface SliderItem {
  id: number
  slider_id: number
  sliders_id: number
  sliders_image_url: string
  sliders_title: string
  sliders_description: string
  sliders_button_label: string
  sliders_button_action: string
}

interface HeroSliderProps {
  sliders: SliderItem[]
}

export function HeroSlider({ sliders }: HeroSliderProps) {
  if (!sliders.length) {
    return (
      <div className="w-full h-full bg-base-200 rounded-lg overflow-hidden shadow-md flex items-center justify-center">
        <img src="/shelf.png" alt="DBS" className="w-full h-full object-cover opacity-50 absolute inset-0" />
        <div className="relative z-10 text-center max-w-xl px-4">
          <h1 className="text-2xl md:text-4xl font-bold text-primary mb-2">DBS</h1>
          <p className="text-sm md:text-lg opacity-80">Your Gateway to Literary Treasures</p>
        </div>
      </div>
    )
  }

  const items = sliders.map((slide) => {
    const imageUrl = slide.sliders_image_url 
      ? setImgUrl(slide.sliders_image_url, 'large')
      : '/shelf.png'
    const title = slide.sliders_title || 'DADS Bookshelves'
    const description = slide.sliders_description || ''
    const buttonLabel = slide.sliders_button_label || 'Explore'
    const buttonAction = slide.sliders_button_action || '/dbslibrary'
    
    return (
      <div key={slide.id} className="relative w-full h-full">
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex items-end justify-center pb-8 md:pb-12 px-4">
          <div className="text-white text-center max-w-2xl">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg line-clamp-1">{title}</h2>
            <p className="text-sm md:text-lg mb-4 drop-shadow-md line-clamp-2 hidden sm:block">{description}</p>
            <a href={buttonAction} className="btn btn-primary btn-md md:btn-lg">
              {buttonLabel}
            </a>
          </div>
        </div>
      </div>
    )
  })

  return <Carousel items={items} autoPlay interval={6000} className="w-full h-full shadow-md" />
}