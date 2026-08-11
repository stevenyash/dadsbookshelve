import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, ArrowRight, Search, ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'

interface Story {
  id: number
  title: string
  topic: string
  content: string
  image_url: string
  date_to_show: string
  date_created: string
  status: string
}

function useStories(search = '') {
  return useQuery({
    queryKey: ['stories', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await api.get(`stories${params}`)
      return res.data.records as Story[]
    },
    staleTime: 60 * 1000,
  })
}

function StoryCard({ story, index }: { story: Story; index: number }) {
  const imageUrl = story.image_url ? setImgUrl(story.image_url, 'medium') : null
  const date = new Date(story.date_to_show || story.date_created)
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="timeline-item">
      {/* Timeline dot */}
      {index > 0 && <div className="timeline-line"></div>}
      <div className="relative pl-8 pb-8">
        {/* Date label */}
        <div className="absolute left-0 top-0 flex items-center gap-1 text-sm text-base-content/60">
          <Calendar className="w-4 h-4" />
          {formattedDate}
        </div>
        
        {/* Content */}
        <div className="mt-6 card bg-base-100 shadow-md hover:shadow-lg transition-all">
          {imageUrl && (
            <figure className="h-48 overflow-hidden">
              <img src={imageUrl} alt={story.title} className="w-full h-full object-cover" />
            </figure>
          )}
          <div className="card-body">
            {story.topic && (
              <span className="badge badge-secondary mb-2">{story.topic}</span>
            )}
            <h3 className="card-title text-lg">{story.title}</h3>
            <p className="text-sm opacity-70 line-clamp-3">
              {story.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
            </p>
            <div className="card-actions justify-end mt-2">
              <Link to={`/stories/view/${story.id}`} className="btn btn-primary btn-sm">
                Read More
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StoriesPage() {
  const [searchParams] = useSearchParams()
  const topic = searchParams.get('topic')
  const [search, setSearch] = useState('')
  
  const { data: stories, isLoading } = useStories(search)

  const filteredStories = topic 
    ? stories?.filter(s => s.topic === topic)
    : stories

  const topics = [...new Set(stories?.map(s => s.topic).filter(Boolean) || [])]

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-primary text-primary-content py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/" className="btn btn-ghost btn-sm text-primary-content mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>
          <h1 className="text-3xl font-bold mb-2">DBS Timeless Stories</h1>
          <p className="opacity-80">Explore inspiring stories from our community</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
              <input
                type="text"
                placeholder="Search stories..."
                className="input input-bordered w-full pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Link to="/dbspricelist" className="btn btn-outline">
            See Our Products
          </Link>
        </div>

        {/* Topic Tags */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link to="/stories" className="btn btn-sm btn-ghost">All</Link>
            {topics.map(t => (
              <Link 
                key={t} 
                to={`/stories?topic=${encodeURIComponent(t)}`}
                className={`btn btn-sm ${topic === t ? 'btn-primary' : 'btn-ghost'}`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        {/* Stories Timeline */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : filteredStories?.length ? (
          <div className="space-y-0">
            {filteredStories.map((story, index) => (
              <StoryCard key={story.id} story={story} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 opacity-60">
            <p className="text-lg">No stories found</p>
          </div>
        )}
      </div>
    </div>
  )
}