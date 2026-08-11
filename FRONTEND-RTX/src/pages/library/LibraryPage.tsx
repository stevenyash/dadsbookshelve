import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/store/store'
import { BookOpen, Users, Building2, ArrowRight, Check } from 'lucide-react'
import api from '@/lib/api'
import { setImgUrl } from '@/lib/utils'

interface LibraryPackage {
  access_id: number
  access_type: string
  is_member: boolean
  amount_kenya_shillings: number
  amount_usd: number
  amount_eur: number
  duration: string
  allowed_devices: number
}

function useLibraryPackages() {
  return useQuery({
    queryKey: ['library-packages'],
    queryFn: async () => {
      const res = await api.get('components_data/libraryaccess')
      return res.data.records as LibraryPackage[]
    },
    staleTime: 60 * 60 * 1000,
  })
}

function PackageCard({ pkg, type }: { pkg: LibraryPackage; type: 'individual' | 'institutional' }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  
  const handleSubscribe = () => {
    if (isAuthenticated) {
      navigate(`/library/subscribe/${pkg.access_id}`)
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-base-200 hover:border-primary">
      <div className="card-body">
        <div className="flex justify-between items-start mb-2">
          <h3 className="card-title text-lg">{pkg.access_type}</h3>
          <span className="badge badge-primary">{pkg.duration}</span>
        </div>
        
        <div className="text-3xl font-bold text-primary mb-2">
          Ksh {Number(pkg.amount_kenya_shillings).toLocaleString()}
          <span className="text-sm font-normal text-base-content/60">/{pkg.duration}</span>
        </div>
        
        <ul className="space-y-2 my-4">
          <li className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-success" />
            {pkg.allowed_devices} device{pkg.allowed_devices > 1 ? 's' : ''} allowed
          </li>
          <li className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-success" />
            Full DBS Library access
          </li>
          <li className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-success" />
            {type === 'individual' ? 'Personal membership' : 'Organization access'}
          </li>
        </ul>
        
        <button 
          onClick={handleSubscribe}
          className="btn btn-primary w-full mt-2"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  )
}

function LibraryHero() {
  return (
    <div className="hero bg-base-200 py-16">
      <div className="hero-content text-center max-w-4xl">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Access Our DBS Library
          </h1>
          <p className="text-lg text-base-content/80 mb-8">
            Welcome to DAD'S Bookshelves library! Explore unique genres and materials 
            rarely found elsewhere. Enjoy a vast repository for your reading pleasure.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LibraryPage() {
  const { isAuthenticated } = useAuth()
  const { data: packages, isLoading } = useLibraryPackages()
  const [activeTab, setActiveTab] = useState<'individual' | 'institutional'>('individual')
  
  const individualPackages = packages?.filter(p => p.is_member) || []
  const institutionalPackages = packages?.filter(p => !p.is_member) || []

  return (
    <div className="min-h-screen">
      <LibraryHero />
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Choose Your Plan</h2>
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="tabs tabs-boxed bg-base-200 p-1">
            <button 
              className={`tab ${activeTab === 'individual' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('individual')}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Individual Membership
            </button>
            <button 
              className={`tab ${activeTab === 'institutional' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('institutional')}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Institutional Membership
            </button>
          </div>
        </div>
        
        {/* Packages Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === 'individual' ? individualPackages : institutionalPackages).map(pkg => (
              <PackageCard key={pkg.access_id} pkg={pkg} type={activeTab} />
            ))}
          </div>
        )}
        
        {((activeTab === 'individual' && !individualPackages.length) || 
          (activeTab === 'institutional' && !institutionalPackages.length)) && (
          <div className="text-center py-12 opacity-60">
            <p>No packages available in this category.</p>
          </div>
        )}
        
        {/* Info Section */}
        <div className="mt-16 bg-base-200 rounded-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Wide Collection</h3>
              <p className="text-sm opacity-80">Access thousands of books across various genres</p>
            </div>
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Community</h3>
              <p className="text-sm opacity-80">Join a community of readers and book enthusiasts</p>
            </div>
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Flexible Plans</h3>
              <p className="text-sm opacity-80">Choose a plan that fits your reading needs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}