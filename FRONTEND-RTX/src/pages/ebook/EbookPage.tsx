import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/store'
import { FileText, Upload, DollarSign, Check, ArrowRight, BookOpen, Zap, Wallet } from 'lucide-react'

export function EbookPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleStartConversion = () => {
    if (isAuthenticated) {
      navigate('/ebook/upload')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="hero bg-base-200 py-16">
        <div className="hero-content text-center max-w-4xl">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4">
              Convert Your Book to eBook
            </h1>
            <p className="text-lg text-base-content/80 mb-8">
              Professional eBook conversion services for authors. 
              Transform your manuscript into a polished digital format.
            </p>
            <button onClick={handleStartConversion} className="btn btn-primary btn-lg">
              Start Conversion
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Process Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-2">1. Submit Your Manuscript</h3>
              <p className="text-base-content/70">
                Upload your print-ready manuscript or document. 
                We accept PDF, Word, and other formats.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-2">2. We Convert It</h3>
              <p className="text-base-content/70">
                Our team professionally formats your content 
                into EPUB, MOBI, and other formats.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-2">3. Preview & Publish</h3>
              <p className="text-base-content/70">
                Review your converted eBook and publish 
                to reach readers worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-base-200 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Convert With Us?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-base-100">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <Check className="w-5 h-5 text-success" />
                  <span className="font-semibold">Quality Assurance</span>
                </div>
                <p className="text-sm opacity-70">Preview before publishing</p>
              </div>
            </div>

            <div className="card bg-base-100">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <Check className="w-5 h-5 text-success" />
                  <span className="font-semibold">Multiple Formats</span>
                </div>
                <p className="text-sm opacity-70">EPUB, MOBI, PDF & more</p>
              </div>
            </div>

            <div className="card bg-base-100">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <Check className="w-5 h-5 text-success" />
                  <span className="font-semibold">70% Royalty</span>
                </div>
                <p className="text-sm opacity-70">Keep most of your earnings</p>
              </div>
            </div>

            <div className="card bg-base-100">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <Check className="w-5 h-5 text-success" />
                  <span className="font-semibold">Global Reach</span>
                </div>
                <p className="text-sm opacity-70">Sell to readers worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sell Books CTA */}
      <div className="bg-base-100 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="card bg-gradient-to-r from-secondary to-secondary/80 text-secondary-content shadow-2xl">
            <div className="card-body text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Wallet className="w-10 h-10" />
                <h2 className="text-2xl font-bold">Want to Sell Your Books?</h2>
              </div>
              <p className="mb-6">
                Earn royalties by selling your books on DADS Bookshelves. 
                Keep up to 70% of the sale price. We handle the rest.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/sellbooks" className="btn btn-primary btn-lg">
                  Start Selling
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Info */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="card bg-primary text-primary-content shadow-2xl">
          <div className="card-body text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Convert Your Book?</h2>
            <p className="mb-6">
              Get a quote for your conversion project. Pricing varies based on 
              page count, complexity, and turnaround time.
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={handleStartConversion} className="btn btn-secondary btn-lg">
                Get Started
              </button>
              <Link to="/help" className="btn btn-outline btn-lg">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}