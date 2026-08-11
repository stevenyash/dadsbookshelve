import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Loader2, Heart, Users, BookOpen, ChevronRight, HandHeart, Mail, ArrowRight } from 'lucide-react'

interface LimitlessContent {
  id: number
  content: string
  current: boolean
  created_at: string
}

function useLimitlessContent() {
  return useQuery({
    queryKey: ['limitless', 'current'],
    queryFn: async () => {
      const res = await api.get('limitless/current')
      return res.data as LimitlessContent | null
    },
    retry: false,
    throwOnError: false,
  })
}

export default function LimitlessInitiativePage() {
  const navigate = useNavigate()
  const { data: limitless, isLoading } = useLimitlessContent()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Hero Section */}
      <section className="bg-primary text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">The Limitless Initiative</h1>
          <p className="text-xl md:text-2xl opacity-90 mb-8">
            Empowering education through your generous support
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/donations/add')}
              className="btn bg-white text-primary hover:bg-base-100 hover:text-primary font-bold px-8 py-3"
            >
              <Heart className="w-5 h-5 mr-2" />
              Make a Donation
            </button>
            <button
              onClick={() => navigate('/about_limitless')}
              className="btn btn-outline border-white text-white hover:bg-white hover:text-primary font-bold px-8 py-3"
            >
              Learn More
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {limitless?.content ? (
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: limitless.content }}
                />
              ) : (
                <div className="space-y-8">
                  <div className="text-center">
                    <BookOpen className="w-16 h-16 mx-auto text-primary mb-4" />
                    <h2 className="text-2xl font-bold mb-2">The Limitless Initiative</h2>
                    <p className="text-lg text-base-content/70">
                      Empowering education through your generous support
                    </p>
                  </div>
                  
                  <div className="divider" />
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-primary/5 p-6 rounded-lg">
                      <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-primary" />
                        Our Mission
                      </h3>
                      <p className="text-base-content/80">
                        To empower children and young adults by providing them with the resources 
                        and support they need to live fulfilling, limitless lives through education.
                      </p>
                    </div>
                    
                    <div className="bg-secondary/5 p-6 rounded-lg">
                      <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-secondary" />
                        Our Vision
                      </h3>
                      <p className="text-base-content/80">
                        A world where every young person can access quality education, 
                        resources, and opportunities to achieve their full potential.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-base-200 p-6 rounded-lg">
                    <h3 className="font-bold text-xl mb-4">What We Do</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <span>Provide access to educational materials and digital books</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <span>Support schools and community learning centers</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Heart className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <span>Offer scholarships and educational grants</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <span>Create digital libraries for underserved communities</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-base-content/70 mb-4">
                      Your support makes all of this possible. Join us in breaking barriers to education.
                    </p>
                    <button
                      onClick={() => navigate('/donations/add')}
                      className="btn btn-primary"
                    >
                      <Heart className="w-5 h-5 mr-2" />
                      Make a Donation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-12 bg-base-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-base-content/70 flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                Students Supported
              </div>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl font-bold text-primary mb-2">1000+</div>
              <div className="text-base-content/70 flex items-center justify-center gap-2">
                <BookOpen className="w-5 h-5" />
                Books Shared
              </div>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-base-content/70 flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" />
                Community Partners
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to make a difference?</h2>
          <p className="text-xl opacity-90 mb-8">
            Your contribution helps us break barriers in education
          </p>
          <button
            onClick={() => navigate('/donations/add')}
            className="btn bg-white text-primary hover:bg-base-100 font-bold px-8 py-3"
          >
            <Heart className="w-5 h-5 mr-2" />
            Donate Now
          </button>
        </div>
      </section>

      {/* Join Our Mission Section */}
      <section className="py-16 bg-base-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-xl border border-primary/20">
            <div className="card-body text-center">
              <HandHeart className="w-16 h-16 mx-auto text-primary mb-4" />
              <h2 className="text-3xl font-bold mb-4">Join Our Mission</h2>
              <p className="text-lg text-base-content/80 mb-8 max-w-2xl mx-auto">
                Beyond donations, you can partner with us to expand access to education. 
                Whether you're an organization, educator, or volunteer, there are many ways 
                to make a lasting impact.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => navigate('/donations/add')}
                  className="btn btn-primary btn-lg"
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Become a Donor
                </button>
                <button
                  onClick={() => navigate('/about_limitless')}
                  className="btn btn-outline btn-lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Partner With Us
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-base-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Want to get involved?</h3>
            <p className="text-base-content/70 mb-6">
              Reach out to learn more about partnership opportunities
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="mailto:info@dadsbookshelves.co.ke"
                className="btn btn-outline gap-2"
              >
                <Mail className="w-5 h-5" />
                info@dadsbookshelves.co.ke
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}