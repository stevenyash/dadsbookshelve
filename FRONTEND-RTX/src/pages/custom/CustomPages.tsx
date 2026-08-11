import { Link } from 'react-router-dom'
import { Archive, BookOpen, DollarSign, CircleHelp, LifeBuoy, BookText } from 'lucide-react'

export function ArchivePage() {
  return (
    <div className="min-h-screen bg-base-200 py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">DBS Archive</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/stories" className="card bg-base-100 hover:shadow-xl transition-shadow">
            <div className="card-body text-center">
              <Archive className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold">Stories Archive</h3>
              <p className="text-sm opacity-70">Browse all past stories</p>
            </div>
          </Link>
          
          <Link to="/books/shop" className="card bg-base-100 hover:shadow-xl transition-shadow">
            <div className="card-body text-center">
              <BookOpen className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold">Book Collection</h3>
              <p className="text-sm opacity-70">Browse all available books</p>
            </div>
          </Link>
          
          <Link to="/dbspricelist" className="card bg-base-100 hover:shadow-xl transition-shadow">
            <div className="card-body text-center">
              <DollarSign className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold">Pricing List</h3>
              <p className="text-sm opacity-70">View our service prices</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function PricingPage() {
  return (
    <div className="min-h-screen bg-base-200 py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">DBS Price List</h1>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-4">Our Services</h2>
            
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Description</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Library Membership</td>
                    <td>Monthly access to digital library</td>
                    <td>From Ksh 500</td>
                  </tr>
                  <tr>
                    <td>eBook Conversion</td>
                    <td>Convert your book to digital format</td>
                    <td>From Ksh 2,000</td>
                  </tr>
                  <tr>
                    <td>Book Publishing</td>
                    <td>Publish and sell your book</td>
                    <td>Contact us</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 text-center">
              <Link to="/help" className="btn btn-primary">Get Help</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HelpPage() {
  return (
    <div className="min-h-screen bg-base-200 py-16">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Help Center</h1>
          <p className="mt-2 opacity-70">Get support for account access, books, payments, and library usage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/books/shop" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body">
              <BookText className="w-10 h-10 text-primary" />
              <h2 className="card-title">Books & Orders</h2>
              <p className="text-sm opacity-70">Browse books, add to cart, and check order history.</p>
            </div>
          </Link>

          <Link to="/dbslibrary" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body">
              <LifeBuoy className="w-10 h-10 text-primary" />
              <h2 className="card-title">Library Access</h2>
              <p className="text-sm opacity-70">Learn how subscriptions and reading access work.</p>
            </div>
          </Link>

          <Link to="/login" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body">
              <CircleHelp className="w-10 h-10 text-primary" />
              <h2 className="card-title">Account Help</h2>
              <p className="text-sm opacity-70">Sign in, reset access, and manage your account details.</p>
            </div>
          </Link>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl">Frequently Asked Questions</h2>

            <div className="divider my-2"></div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">How do I buy a book?</h3>
                <p className="text-sm opacity-70">Go to the shop, select digital or physical format, add to cart, then complete payment.</p>
              </div>
              <div>
                <h3 className="font-semibold">How do I access purchased digital books?</h3>
                <p className="text-sm opacity-70">Open the shop or library and use the Read button on books linked to completed orders.</p>
              </div>
              <div>
                <h3 className="font-semibold">What payment methods are supported?</h3>
                <p className="text-sm opacity-70">The platform supports M-Pesa and PayPal where enabled.</p>
              </div>
              <div>
                <h3 className="font-semibold">Why am I redirected to login?</h3>
                <p className="text-sm opacity-70">Protected actions require authentication. After login, you are returned to your previous page.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-xl font-bold">Need direct support?</h2>
            <p className="opacity-70">Use the latest channels for payment, subscription, or account issues.</p>
          </div>
        </div>
      </div>
    </div>
  )
}