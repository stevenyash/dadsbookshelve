import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Calendar, ArrowLeft } from 'lucide-react'
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

export function StoryViewPage() {
  const { id } = useParams()
  
  const { data: story, isLoading, error } = useQuery({
    queryKey: ['story', id],
    queryFn: async () => {
      const res = await api.get(`stories/${id}`)
      return res.data as Story
    },
    enabled: !!id,
  })
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }
  
  if (error || !story) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Story Not Found</h2>
          <Link to="/stories" className="btn btn-primary mt-4">
            Back to Stories
          </Link>
        </div>
      </div>
    )
  }
  
  const imageUrl = story.image_url ? setImgUrl(story.image_url, 'large') : null
  const date = new Date(story.date_to_show || story.date_created)
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-primary text-primary-content py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/stories" className="inline-flex items-center gap-2 text-primary-content/80 hover:text-primary-content mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Stories
          </Link>
          {story.topic && (
            <span className="badge badge-secondary ml-2">{story.topic}</span>
          )}
          <h1 className="text-3xl font-bold mt-2">{story.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-primary-content/70">
            <Calendar className="w-4 h-4" />
            {formattedDate}
          </div>
        </div>
      </div>
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        {imageUrl && (
          <figure className="mb-8">
            <img src={imageUrl} alt={story.title} className="w-full rounded-lg shadow-lg" />
          </figure>
        )}
        
        <article 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: story.content }}
        />
        
        <div className="mt-8 pt-8 border-t">
          <Link to="/stories" className="btn btn-outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            More Stories
          </Link>
        </div>
      </div>
    </div>
  )
}