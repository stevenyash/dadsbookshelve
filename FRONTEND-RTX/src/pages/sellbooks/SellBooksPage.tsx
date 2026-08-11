import { useNavigate } from 'react-router-dom'
import { FileText, Book, ArrowRight, Check, DollarSign, Users, Globe, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/store'

interface FormatOption {
  id: 'softcopy' | 'hardcopy'
  title: string
  description: string
  icon: React.ReactNode
  features: string[]
  path: string
}

export function SellBooksPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const handleSelectFormat = (format: FormatOption) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${format.path}`)
      return
    }
    navigate(format.path)
  }

  const formatOptions: FormatOption[] = [
    {
      id: 'softcopy',
      title: 'Sell eBook (Digital)',
      description: 'Sell your book as a digital download. Readers can instantly download after purchase.',
      icon: <FileText className="w-12 h-12" />,
      features: [
        'Instant delivery to customers',
        'Higher profit margins',
        'No inventory or shipping',
        'Reach global audience',
      ],
      path: '/sellbooks/softcopy',
    },
    {
      id: 'hardcopy',
      title: 'Sell Physical Book',
      description: 'Sell printed paperback/hardcover copies. We handle printing and shipping.',
      icon: <Book className="w-12 h-12" />,
      features: [
        'Professional printing',
        'We handle shipping',
        'Quality book binding',
        'Physical product value',
      ],
      path: '/sellbooks/hardcopy',
    },
  ]

  return (
    <div className="min-h-screen bg-base-200">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-content py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Sell Your Books on DADS Bookshelves
          </h1>
          <p className="text-lg opacity-90 mb-8">
            Reach thousands of readers. Keep more royalties. We handle the details.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">1. Submit Your Book</h3>
              <p className="text-sm opacity-70">
                Upload your manuscript, set your price, and agree to revenue sharing.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">2. List for Sale</h3>
              <p className="text-sm opacity-70">
                Your book appears in our shop. Customers browse and purchase.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">3. Earn Royalties</h3>
              <p className="text-sm opacity-70">
                Receive your share of sales directly to your mobile or account.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Format Selection */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">
          Choose How You Want to Sell
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formatOptions.map((option) => (
            <div 
              key={option.id}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-primary"
              onClick={() => handleSelectFormat(option)}
            >
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{option.title}</h3>
                    <p className="text-sm opacity-70">{option.description}</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className="btn btn-primary btn-block">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-base-100 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">
            Why Publish With Us?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-bold">70% Royalties</h3>
              <p className="text-sm opacity-70">Keep most of your earnings</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <Globe className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-bold">Global Reach</h3>
              <p className="text-sm opacity-70">Sell to readers worldwide</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-bold">Large Audience</h3>
              <p className="text-sm opacity-70">Access our reader base</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-bold">Secure Payments</h3>
              <p className="text-sm opacity-70">M-Pesa & PayPal supported</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="card bg-primary text-primary-content shadow-2xl">
          <div className="card-body text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to Sell Your Book?</h2>
            <p className="opacity-90 mb-6">
              Join hundreds of authors earning from their books on DADS Bookshelves.
            </p>
            <button 
              onClick={() => handleSelectFormat(formatOptions[0])}
              className="btn btn-secondary btn-lg"
            >
              Start Selling Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}