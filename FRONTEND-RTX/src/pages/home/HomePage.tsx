import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/store/store'
import { usePermissions } from '@/hooks/usePermissions'
import { BookOpen, Library, Users, TrendingUp, ArrowRight, BookMarked, BookText, ScrollText } from 'lucide-react'
import { HeroSlider } from '@/components/Carousel'
import { BookShelfCanvas } from '@/components/three/BookShelfCanvas'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'

interface Book {
  book_id: number
  books_title: string
  books_image_url: string
  books_price: number
  author?: string
}

interface Slider {
  id: number
  slider_id: number
  sliders_id: number
  sliders_image_url: string
  sliders_title: string
  sliders_description: string
  sliders_button_label: string
  sliders_button_action: string
}

interface Story {
  title: string
  topic: string
  content: string
  image_url?: string
}

// Fetch hooks
function useFeaturedBooks() {
  return useQuery({
    queryKey: ['featured-books'],
    queryFn: async () => {
      const res = await api.get('components_data/featuredbooks')
      return res.data.records as Book[]
    },
    staleTime: 60 * 60 * 1000,
  })
}

function useSliders() {
  return useQuery({
    queryKey: ['sliders'],
    queryFn: async () => {
      const res = await api.get('sliders?limit=10')
      return res.data.records as Slider[]
    },
    staleTime: 60 * 60 * 1000,
  })
}

function useDayStory() {
  return useQuery({
    queryKey: ['day-story'],
    queryFn: async () => {
      const res = await api.get('components_data/daystory')
      return res.data as Story
    },
    staleTime: 60 * 60 * 1000,
  })
}


const services = [
  { icon: Library, title: 'Digital Library', description: 'Access thousands of books anytime, anywhere', link: '/dbslibrary', color: 'bg-primary' },
  { icon: BookOpen, title: 'eBook Conversion', description: 'Convert your documents to secure eBooks', link: '/ebook', color: 'bg-secondary' },
  { icon: Users, title: 'Limitless Initiative', description: 'Support education access for all', link: '/limitlessintiative', color: 'bg-warning' },
  { icon: Users, title: 'Marketer Program', description: 'Earn commissions by referring readers', link: '/marketers', color: 'bg-accent' },
  { icon: TrendingUp, title: 'Reports', description: 'Track sales and income in real-time', link: '/salesreports', color: 'bg-info' },
]

function ServicesSection({ services }: { services: typeof services }) {
  return (
    <section className="py-16 px-4 bg-base-200">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-primary">DBS Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <Link key={index} to={service.link} className="card bg-base-100 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="card-body items-center text-center">
                <service.icon className={`w-12 h-12 ${service.color} text-white p-2 rounded-lg`} />
                <h3 className="card-title mt-2">{service.title}</h3>
                <p className="text-sm">{service.description}</p>
                <ArrowRight className="w-5 h-5 mt-2 opacity-50" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// Book of the Day for Home Page (compact sidebar version with 3D)
function HomePageBookOfTheDay() {
  const { data: books, isLoading } = useFeaturedBooks()
  const featuredBook = books?.[0]
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <div className="loading loading-spinner loading-lg text-amber-600"></div>
        <p className="mt-2 text-sm opacity-60">Loading...</p>
      </div>
    )
  }
  
  if (!featuredBook) {
    return (
      <div className="text-center py-8">
        <BookText className="w-12 h-12 text-amber-400 mx-auto mb-2" />
        <p className="text-sm opacity-60">No featured book today</p>
      </div>
    )
  }
  
  const imageUrl = featuredBook.books_image_url ? setImgUrl(featuredBook.books_image_url, 'medium') : null
  
  return (
    <div className="h-full flex flex-col">
      {/* Section Label */}
      <div className="flex items-center gap-2 text-amber-700 mb-3">
        <BookText className="w-5 h-5" />
        <span className="font-bold text-sm">Book of the Day</span>
      </div>
      
      {/* 3D Bookshelf Canvas */}
      <div className="relative h-32 bg-gradient-to-b from-amber-200/40 to-amber-300/30 rounded-md shadow-inner overflow-hidden mb-3">
        <BookShelfCanvas
          books={books || []}
          featuredBook={featuredBook}
        />
      </div>
      
      {/* Book Info */}
      <div className="flex gap-3 flex-1">
        {/* Book Cover */}
        <div className="w-16 h-24 flex-shrink-0 bg-base-100 rounded-md shadow-md overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={featuredBook.books_title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-amber-200">
              <BookText className="w-6 h-6 text-amber-600" />
            </div>
          )}
        </div>
        
        {/* Book Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm line-clamp-2 text-amber-900">{featuredBook.books_title}</h3>
          {featuredBook.author && (
            <p className="text-xs text-amber-700 mt-1 line-clamp-1">{featuredBook.author}</p>
          )}
          <p className="text-primary font-bold mt-1">Ksh {featuredBook.books_price}</p>
          <Link 
            to={`/books/view/${featuredBook.book_id}`} 
            className="btn btn-primary btn-xs mt-1"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}

// Book of the Day Section - Three.js 3D Bookshelf (for dashboard/referrals)
function BookOfTheDaySection() {
  const { data: books, isLoading } = useFeaturedBooks()
  const featuredBook = books?.[0]

  return (
    <section className="py-8 px-4 bg-gradient-to-b from-amber-50 via-amber-100/50 to-amber-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center items-start">
          {/* Book of the Day - Three.js 3D Bookshelf */}
          <div className="relative group">
            {/* Glow effect behind */}
            <div className="absolute inset-0 bg-amber-400/30 rounded-xl blur-2xl group-hover:bg-amber-400/40 transition-all duration-500"></div>
            
            {/* Three.js Bookshelf Canvas */}
            <div className="relative h-[280px] bg-gradient-to-b from-amber-200/40 to-amber-300/30 rounded-xl shadow-2xl border border-amber-300/50 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="loading loading-spinner loading-lg text-amber-600"></div>
                </div>
              ) : (
                <BookShelfCanvas
                  books={books || []}
                  featuredBook={featuredBook}
                />
              )}
            </div>
            
            {/* Floating Title Card */}
            {featuredBook && (
              <div className="bg-white rounded-xl shadow-xl px-4 py-3 text-center border-2 border-amber-200 mt-4">
                <h3 className="text-lg font-bold text-amber-900 line-clamp-1">{featuredBook.books_title}</h3>
                <p className="text-primary font-bold text-lg mt-1">Ksh {featuredBook.books_price}</p>
                <Link 
                  to={`/books/view/${featuredBook.book_id}`} 
                  className="btn btn-primary btn-sm mt-2"
                >
                  View Details
                </Link>
              </div>
            )}
            
            {/* Section Label */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
              <div className="flex items-center gap-2">
                <BookText className="w-4 h-4" />
                 Book of the Day
              </div>
            </div>
          </div>

          {/* Story of the Day */}
          <div className="mt-12">
            <StoryOfTheDayCard />
          </div>
        </div>
      </div>
    </section>
  )
}

// Story of the Day Card
function StoryOfTheDayCard() {

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200 rounded-xl overflow-hidden h-full">
      <div className="card-body text-center pb-4">
        <div className="flex items-center justify-center gap-2 text-secondary">
          <ScrollText className="w-5 h-5" />
          <span className="text-sm font-bold">DBS Story of the Day</span>
        </div>
      </div>
      <div className="px-6 pb-6">
        <StoryContent />
      </div>
    </div>
  )
}

// Story Content Component (reused in StorySection)
function StoryContent() {
  const { data: story, isLoading } = useDayStory()
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="loading loading-spinner loading-lg text-secondary"></div>
        <p className="mt-4 text-sm opacity-60">Loading story...</p>
      </div>
    )
  }

  if (!story?.content) {
    return <div className="text-center py-8 opacity-60">No story available today. Check back later!</div>
  }

  const excerpt = story.content.length > 150 ? story.content.substring(0, 150) + '...' : story.content
  const imageUrl = story.image_url ? setImgUrl(story.image_url, 'medium') : null

  return (
    <div>
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={story.title || 'Story'}
          className="w-full h-32 object-cover rounded-lg mb-4"
        />
      )}
      <h3 className="text-xl font-semibold mb-2">{story.title || 'The Limitless Story'}</h3>
      {story.topic && (
        <div className="badge badge-secondary mb-4">{story.topic}</div>
      )}
      <p className="text-sm line-clamp-3 mb-4" dangerouslySetInnerHTML={{ __html: excerpt }}></p>
      <div className="flex justify-between">
        <button className="btn btn-secondary btn-sm">Read Full Story</button>
        <Link to="/archive" className="btn btn-ghost btn-sm">Visit Archive</Link>
      </div>
    </div>
  )
}

// Quick Links Section
function QuickLinks({ links }: { links: { label: string; link: string; color: string }[] }) {
  return (
    <section className="py-4 bg-base-100 border-b">
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-2 px-4">
        {links.map((link) => (
          <Link key={link.label} to={link.link} className={`btn ${link.color} btn-sm`}>
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

// Main HomePage
export function HomePage() {
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref')
  const { isAuthenticated } = useAuth()
  const { canView } = usePermissions()
  const { data: sliders } = useSliders()
  
  // Store referral code in localStorage for tracking
  if (referralCode) {
    localStorage.setItem('referralCode', referralCode)
  }
  
  const visibleServices = services.filter(service => {
    const path = service.link
    if (path === '/dbslibrary') return canView('library') || true
    if (path === '/ebook') return canView('library') || isAuthenticated
    if (path === '/marketers') return canView('marketers') || isAuthenticated
    if (path === '/salesreports') return canView('dashboard')
    return true
  })

  const visibleLinks = [
    { label: 'Library', link: '/dbslibrary', color: 'btn-primary', show: canView('library') || true },
    { label: 'Shop', link: '/books/shop', color: 'btn-secondary', show: canView('shop') },
    { label: 'Conversion', link: '/ebook', color: 'btn-accent', show: canView('library') },
    { label: 'Limitless', link: '/limitlessintiative', color: 'btn-warning', show: true },
    { label: 'Marketers', link: '/marketers', color: 'btn-info', show: canView('marketers') },
    { label: 'Pricing', link: '/dbspricelist', color: 'btn-warning', show: true },
  ].filter(l => l.show).map(l => ({ label: l.label, link: l.link, color: l.color }))
  
  return (
    <div className="min-h-screen">
      {/* Hero Section with Carousel + Book of the Day */}
      <section className="px-4 py-6 bg-gradient-to-b from-base-200 to-base-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Book of the Day - takes 1/3 width on large screens */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-amber-50 via-amber-100/50 to-amber-100 rounded-lg p-4 h-full shadow-md border border-amber-200/50">
                <HomePageBookOfTheDay />
              </div>
            </div>
            
            {/* Carousel - takes 2/3 width on large screens */}
            <div className="lg:col-span-2">
              <div className="h-full">
                <HeroSlider sliders={sliders || []} />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Quick Links */}
      <QuickLinks links={visibleLinks} />
      
      {/* Services */}
      <ServicesSection services={visibleServices} />
      
      {/* Story of the Day */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <StoryOfTheDayCard />
            <div className="card bg-base-100 shadow-xl border border-base-200 rounded-xl overflow-hidden">
              <div className="card-body">
                <h3 className="card-title text-lg">Latest Additions</h3>
                <p className="text-sm opacity-70">Check out our newest arrivals in the library</p>
                <div className="card-actions justify-end mt-4">
                  <Link to="/dbslibrary" className="btn btn-primary btn-sm">Browse Library</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-16 text-center bg-primary text-white">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Reading Journey?</h2>
          <p className="mb-8">Discover thousands of books, stories, and resources at DBS Library</p>
          <Link to="/dbslibrary" className="btn btn-white text-primary btn-lg">
            Browse DBS Library
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  )
}